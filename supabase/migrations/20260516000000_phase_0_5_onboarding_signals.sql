-- Phase 0.5: Social onboarding signals + match score schema
--
-- New profile fields surface richer matching context so compute_match_score
-- has more to work with. open_to_dating is Gathr+-gated and goes through
-- the toggle-dating-intent edge function; all other new fields are
-- user-editable via the normal profile UPDATE RLS policy.
--
-- Also: founding_member was accidentally left out of the protected-columns
-- trigger in Phase 1. This migration adds it alongside open_to_dating.
--
-- Safe to re-run: ALTER TABLE … ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.

-- ─── 1. New columns ──────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS looking_for  text[]  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vibe         text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS offering     text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS open_to_dating boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS life_stage   text[]  DEFAULT NULL;

-- ─── 2. Check constraints ────────────────────────────────────────────────────
-- ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL, so we guard with DO blocks.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_looking_for_max3'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_looking_for_max3
      CHECK (looking_for IS NULL OR cardinality(looking_for) <= 3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_looking_for_valid_values'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_looking_for_valid_values
      CHECK (
        looking_for IS NULL OR
        looking_for <@ ARRAY[
          'new_to_city', 'activity_partners', 'deepen_friendships',
          'life_change_community', 'do_more_stuff', 'curious'
        ]::text[]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_vibe_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_vibe_check
      CHECK (vibe IS NULL OR vibe IN ('low_key', 'active', 'high_energy', 'mix'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_offering_length'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_offering_length
      CHECK (offering IS NULL OR (length(trim(offering)) <= 150 AND length(offering) <= 155));
  END IF;
END $$;

-- ─── 3. Column comments ──────────────────────────────────────────────────────

COMMENT ON COLUMN public.profiles.looking_for IS
  'Multi-select "what brings you here". Max 3 values. Valid values: new_to_city, activity_partners, deepen_friendships, life_change_community, do_more_stuff, curious.';

COMMENT ON COLUMN public.profiles.vibe IS
  'Single-select event vibe. Matching signal only — never shown on public profiles.';

COMMENT ON COLUMN public.profiles.offering IS
  '"What''s your thing" — free text, 150 char limit. Shown on public profile in a quote-style card.';

COMMENT ON COLUMN public.profiles.open_to_dating IS
  'Opt-in dating intent. Gathr+-gated. Updated only via toggle-dating-intent edge function. Never auto-revoked on downgrade.';

COMMENT ON COLUMN public.profiles.life_stage IS
  'Reserved for a later phase. Column exists so future builds avoid migrations. Not surfaced in UI yet.';

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────

-- GIN for array-containment queries on looking_for (compute_match_score overlap)
CREATE INDEX IF NOT EXISTS idx_profiles_looking_for
  ON public.profiles USING GIN (looking_for);

-- btree on vibe for equality filter in compute_match_score
CREATE INDEX IF NOT EXISTS idx_profiles_vibe
  ON public.profiles (vibe);

-- Partial index: nearly all rows are false, so this covers the rare true rows cheaply
CREATE INDEX IF NOT EXISTS idx_profiles_open_to_dating
  ON public.profiles (id)
  WHERE open_to_dating = true;

-- ─── 5. Protected-columns trigger ────────────────────────────────────────────
-- We replace (not just alter) the function so the full body is in source control.
--
-- open_to_dating must go through toggle-dating-intent (enforces Gathr+ gate +
-- rate limiting). founding_member goes through grant_founding_member()
-- (enforces the 1,000-cap). Both were missing from the original trigger.

CREATE OR REPLACE FUNCTION public.guard_profile_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  is_service boolean := (auth.role() = 'service_role');
BEGIN
  IF is_service THEN RETURN NEW; END IF;

  -- System-maintained counts (triggers signal via app.internal_update)
  IF NEW.hosted_count     IS DISTINCT FROM OLD.hosted_count
  OR NEW.attended_count   IS DISTINCT FROM OLD.attended_count
  OR NEW.connection_count IS DISTINCT FROM OLD.connection_count THEN
    IF current_setting('app.internal_update', true) <> 'true' THEN
      RAISE EXCEPTION 'hosted_count / attended_count / connection_count are maintained by the system';
    END IF;
  END IF;

  -- Safety fields derived from reviews
  IF NEW.safety_score IS DISTINCT FROM OLD.safety_score
  OR NEW.safety_tier  IS DISTINCT FROM OLD.safety_tier
  OR NEW.review_count IS DISTINCT FROM OLD.review_count THEN
    RAISE EXCEPTION 'safety fields are maintained by the system';
  END IF;

  -- Gathr+ billing / trial flags
  IF NEW.gathr_plus              IS DISTINCT FROM OLD.gathr_plus
  OR NEW.gathr_plus_expires_at   IS DISTINCT FROM OLD.gathr_plus_expires_at
  OR NEW.gathr_plus_trial_used   IS DISTINCT FROM OLD.gathr_plus_trial_used
  OR NEW.gathr_plus_trial_levels IS DISTINCT FROM OLD.gathr_plus_trial_levels THEN
    RAISE EXCEPTION 'Gathr+ status is managed server-side — call the trial edge function';
  END IF;

  -- Founding Member badge — granted by grant_founding_member() (service-role only)
  IF NEW.founding_member IS DISTINCT FROM OLD.founding_member THEN
    RAISE EXCEPTION 'founding_member is set by the billing system — cannot be changed by users';
  END IF;

  -- Dating intent — toggled by toggle-dating-intent edge function (Gathr+ gate + rate limit)
  IF NEW.open_to_dating IS DISTINCT FROM OLD.open_to_dating THEN
    RAISE EXCEPTION 'open_to_dating must be changed via the toggle-dating-intent edge function';
  END IF;

  RETURN NEW;
END;
$$;

-- user_rate_limits: generic action log for server-side rate limiting.
--
-- Edge functions insert a row on each rate-limited action; they query the
-- row count in the last N hours to decide whether to allow the next call.
-- Rows are safe to purge periodically (> 30 days old) without affecting
-- correctness — all windows are < 24 hours.
--
-- First consumer: toggle-dating-intent (max 5 per 24 hours).

CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Covering index for the count query: WHERE user_id = ? AND action = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_lookup
  ON public.user_rate_limits (user_id, action, created_at);

-- Users must not be able to read or write rate-limit rows directly.
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = default deny for anon + authenticated.
-- Only service_role (edge functions) may read or write.

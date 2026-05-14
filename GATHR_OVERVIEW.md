# Gathr — Complete App Overview

*Everything you need to understand and confidently talk about the app, the code, and the architecture.*

---

## What Gathr Is

Gathr is a **social event discovery and hosting app** for mobile web. The core idea: people who share interests are already in the same city — they just don't know it yet. Gathr helps them find each other through real-world events, not followers or feeds.

The differentiator is the **mystery match system**: when you RSVP to an event, Gathr shows you how many attendees share your vibe, but keeps them anonymous until after you've actually shown up. This turns attendance into something worth doing, and it filters out people who sign up and bail.

The secondary differentiator is **safety infrastructure** built into the platform: anonymous post-event peer reviews, a public safety tier on every profile, and automatic account restrictions when flags accumulate.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (postgres_changes subscriptions) |
| Edge Functions | Supabase Edge Functions (Deno runtime) |
| Hosting | Vercel |
| Map | Leaflet + React-Leaflet |
| Confetti | canvas-confetti (achievement celebrations) |
| Image Crop | react-easy-crop (client-side crop/zoom before upload) |
| Image Compression | Canvas-based resize to max 800×800 px at 0.88 JPEG quality applied after crop, before Supabase Storage upload |
| Venue Geocoding | OpenStreetMap Nominatim — autocomplete during event creation (debounced, 500ms) is proxied server-side via `/api/geocode` (rate-limited, user IPs never reach Nominatim); post-publish geocoding via `geocode-event` edge function |
| Transactional Email | Resend |

**Next.js 16 App Router** means every page lives in `app/` and is a React Server Component by default. Because every Gathr page needs live user data, they all have `'use client'` at the top — they're client components that run in the browser. This is intentional: the app is essentially a mobile web app that happens to be built on Next.js.

**Tailwind v4** uses the new `@import "tailwindcss"` syntax instead of the old `@tailwind base/components/utilities` triple. The config is zero-config — no `tailwind.config.js` file.

**Supabase** handles everything backend: Postgres database, auth JWTs, file storage, realtime subscriptions, and edge functions all under one service. The client is created once in `lib/supabase.ts` using `createBrowserClient` from `@supabase/ssr` and exported as a singleton.

---

## App Structure — Every Route

```
app/
├── page.tsx              Landing / splash screen
├── onboarding/           3-slide intro carousel (before auth)
├── auth/                 Sign in / sign up (email + Google)
├── setup/                Profile setup after first sign-in (name, city, interests, photo)
├── tour/                 4-slide in-app feature tour: Mystery Match · Communities · Safety Tiers · Hosting. Reached via "Take the tour →" in the first-home-load welcome modal. Skip button always visible → /home.
├── home/                 Main feed (events + communities tabs). Header: Gathr wordmark + greeting, city pill, notifications bell. Search bar (tap-through to /search). "Happening Soon" horizontal scroll. Featured event card (gold pill category tag). Tab bar: Trending / For You / Near Me / Friends / Mine. Event cards with category gradient banners, tag pills, capacity "% full" indicator, bookmark toggle.
├── events/[id]/          Event detail — hero cover with back/share/bookmark/edit buttons, date+location card (full address gated behind RSVP), mystery match section (match count + blurred silhouettes → partial names for Gathr+ → full reveal post-event), incoming wave teasers, Gathr+ upsell for hidden matches, attendees grid, about/comments. RSVP gated: address and map button only shown to RSVPed users and host.
├── create/               Multi-step event creation form (Step 1: cover photo, title, category, description, date/time, venue autocomplete, address; Step 2: capacity, tags, visibility, ticket type). Auto-save draft — progress bar with step labels; back button returns to step 1 or router.back().
├── host/                 Host dashboard — 3 tabs (Overview / Events / Insights). Overview: 4 stat tiles (upcoming, total RSVPs, avg attendance, events hosted), next-up event previews with RSVP progress bars, Host Pro waitlist CTA. Events tab: upcoming + past lists with View/Edit/Attendees-Message action buttons. Insights tab: best event, performance summary, top categories by RSVPs.
├── communities/          Community discovery + joined communities list. Sections: Your communities (banner thumbnail rows with private lock icon + k-formatted member counts), Suggested for you (interest-matched, gold-bordered cards), Discover (all remaining). Category filter pills, search. Private communities show lock icon and "🔒 Request" button instead of "+ Join".
├── communities/[id]/     Community detail — banner (with back + share + settings buttons for owner), info card (name, private lock badge, member count), stats bar (members/posts/events), tabs: Feed (post text+photos, like, comment, load-more), Events (upcoming event list + add/create for members), Members (pending requests panel for owner/admin, member list with "you" label and role badges), Chat (real-time group chat with optimistic updates, delete own messages). CTA bar adapts per state: Join / Request to Join / Cancel Request / Leave+Create / chat input.
├── search/               Universal search — events, communities, people, #tags. Results tabs (All/Events/People/Communities/Tags). Category chip filter row. Pre-search state: recent searches, recently viewed events, "Picked for you" scored recommendations, browse-by-category grid.
│                         Vibe query parser — rules-based NLP, no LLM. Parses free text like "live music thursday night" or "#yoga this weekend" and extracts: day (today/tomorrow/named days/weekend), time-of-day (morning/afternoon/evening/night), category (55+ synonyms across all 9 categories), and remaining search terms for DB ilike. Detected filters shown as green pills in a result header card. Searches title, description, and location_name. Tag results shown in a separate section. Past events excluded from all results (gte now filter on both event and tag queries). Category synonyms cover: Music (music, dj, jazz, karaoke, hip hop…), Fitness (fitness, cycling, crossfit, climbing…), Food & Drink (restaurant, wine, pub, cooking…), Tech (gaming, crypto, web3, developer…), Outdoors (kayak, skiing, surfing…), Arts (theatre, comedy, photography…), Social (trivia, game night, pub quiz…), Wellness (meditation, pilates, sound bath…), Networking (business, conference, summit…).
├── map/                  Map view of events as Leaflet pins
├── messages/             DM inbox + pending connection requests. Connection request cards (Accept/Decline). Accepted connections quick-scroll bar. Community chats section. SwipeThread rows (swipe left to mark read/unread or delete). Compose overlay (search connections).
├── messages/[id]/        DM thread — realtime chat with typing indicators
├── notifications/        Notification centre — mark read, navigate to source
├── bookmarks/            Saved events — upcoming and past sections. Unbookmark with undo toast (optimistic remove, 4-second undo window, commits on dismiss or navigates away).
├── profile/              Own profile — bio, stats bar (Hosted/RSVPs/Connections/Achievements), XP level with animated bar, achievement grid (32 badges; locked ones show gold progress fill), pin up to 3 badges to public profile, mode toggles (Social/Professional)
├── profile/[id]/         Public profile — avatar (with lightbox on tap), name + tier badge + safety badge, bio, mode pills, pinned achievement badges (gold/silver/bronze gradient styles), stats bar (Hosted/Going/Interests/Mutual), mutual connections section with avatar row, Hosting/Going tab with event list, fixed bottom CTA (Message + Connect/Withdraw/Connected).
├── profile/edit/         Edit profile — photo upload (with crop/compress), first/last name, bio, city, profile mode (Social/Professional/Both), RSVP visibility, interests (search + tag chips, up to 10).
├── settings/             Account settings — profile edit shortcut, Gathr+ status, appearance (theme toggle), account (email, change password with strength meter), profile mode toggles, privacy toggles (discoverable, matching, push notifications, RSVP notify), feedback sheet, sign out, delete account.
├── gathr-plus/           Gathr+ upgrade page — hero icon, 5 perk cards (see who's going, anonymous waves, early reveal, badge, priority ranking), "Billing Coming Soon" card with notify-me waitlist link, trial CTA button (disabled if trial used or active). Notify-me sheet routes to /waitlist.
├── auth/reset/           Password reset — listens for PASSWORD_RECOVERY Supabase event; shows verifying state, then new+confirm password inputs with strength validation; auto-redirects /home after success.
├── privacy/              Privacy Policy
├── terms/                Terms of Service
└── waitlist/             Host Pro early access waitlist — name, email, optional event-type textarea; feature preview list (paid ticketing, analytics, promoted events, mass messaging); join button with spinner. Success screen with "Back to Home" CTA.
```

**Public routes** (no auth required): `/`, `/onboarding`, `/auth`, `/tour`, `/privacy`, `/terms`, `/waitlist`. Every other route is protected by the middleware.

---

## Authentication & Middleware

The middleware (`middleware.ts`) runs on every request via Next.js Edge Runtime. It re-exports from `proxy.ts` (which contains the full middleware logic) and injects a per-request CSP nonce. It uses `createServerClient` from `@supabase/ssr` (which reads cookies from the request) to check for a valid Supabase session. If there's no session and the route isn't public, it redirects to `/auth?redirectTo=<original-path>` — deep links survive the login flow.

**Why `@supabase/ssr` instead of `@supabase/supabase-js` directly?** The SSR package handles the cookie-based session automatically — it reads and writes the Supabase auth token from `request.cookies`, which is what Next.js middleware needs. The browser client (`lib/supabase.ts`) uses the same package's `createBrowserClient` which manages the token in browser cookies instead.

Auth flow:
1. User hits `/onboarding` → `/auth` → signs in or creates account
2. On first sign-in, a trigger on `auth.users` creates a `profiles` row automatically
3. After auth, the callback checks `profiles.interests`. If empty → `/setup`. If non-empty → `/home` (setup already complete).
4. `/setup` detects resumption on load: if `name` is already set in the DB, it prefills all 7 fields, jumps to step 2 (interests — always the missing piece), and shows a gold "Welcome back" banner with the user's avatar. Fresh users start from step 0.
5. After setup, they hit `/home` (or `/tour` if they choose the tour link on the done screen).
6. On first home load (after setup), a **welcome bottom-sheet modal** fires — keyed by `gathr_welcome_${userId}` in localStorage. It introduces the Mystery Match concept and offers "Take the tour →" (`/tour` — the 4-slide in-app feature tour) or "I'm ready" (dismiss). Never fires again for that user account, even on a new device.

---

## Database — All Tables

All tables are in the `public` schema with **Row Level Security (RLS)** enabled on every table. RLS policies ensure users can only read/write data they're authorised to access.

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Name, avatar, city, bio, interests (array), XP, level, safety score/tier, Gathr+ status, matching_enabled, discoverable, profile_mode |
| `events` | Events created by users. Title, category, description, location, datetime, capacity, spots_left, visibility (public/unlisted/private), tags, cover_url, host_id |
| `rsvps` | Which user RSVPed to which event. `status: 'joined'` |
| `event_bookmarks` | Saved events per user |
| `event_comments` | Comments on event pages. Text + user reference |
| `event_drafts` | Auto-saved create-flow draft. One per user (upserted) |
| `event_invites` | Invites sent for private events |
| `communities` | Community groups. Name, description, category, icon, banner_gradient, visibility (public/private), member_count, is_private (computed column) |
| `community_members` | Membership rows. `role`: owner / admin / member / pending |
| `community_posts` | Posts inside a community. Text (nullable — image-only posts allowed), image_url, like_count, comment_count (both counts maintained by DB triggers) |
| `community_post_likes` | Which user liked which post. Trigger updates `community_posts.like_count` |
| `community_post_comments` | Threaded replies on community posts. text, post_id, user_id |
| `community_chat_messages` | In-community chat. Text + user_id |
| `connections` | Connection requests between users. `status`: pending / accepted / declined |
| `messages` | DMs. `thread_id` = `[user1_id]_[user2_id]` (sorted UUIDs), sender_id, recipient_id, text |
| `notifications` | In-app notifications. type, title, body, link, read, actor_id |
| `user_reviews` | Post-event safety reviews. Reviewer → target user at a specific event. 3 yes/no questions + optional safety flag |
| `waves` | Anonymous "wave" signals (Gathr+ feature). sender_id, receiver_id, event_id. Unique per trio |
| `push_subscriptions` | Web push notification subscriptions (VAPID) |
| `waitlist` | Email addresses from the pre-launch waitlist |
| `rate_limit_events` | Log of user actions for rate limiting. user_id, action, created_at |
| `hidden_threads` | Tracks which DM threads a user has hidden from their inbox. `user_id` + `thread_id` composite PK. RLS ensures users only see and modify their own rows. Underlying messages are preserved for the other party. Persists across devices — no longer localStorage-based. |
| `feedback` | In-app feedback submissions. `category` (bug/idea/praise/other), `message`, `page_path`, `user_agent`, `user_id`. RLS: insert as self, select own only. `rate_limit_feedback` trigger caps submissions at 5/hour/user. Sourced from Settings → Send Feedback. |
| `event_drafts` | Auto-saved event-creation draft. One row per user, upserted on every form change. Cleared on successful publish. |
| `friendships` | Legacy/reserved table (not currently used in UI) |

### Key Column Details on `profiles`

User-writable:
- `name` — stored as a single `"First Last"` string. The setup and profile-edit UIs present two separate inputs (First name / Last name) which are concatenated on save. Parsed back into parts on load via `split(' ')`. No separate columns — all downstream personalization (e.g. welcome-back banner, done screen greeting) reads the first word of `name`.
- `avatar_url`, `bio_social`, `bio_professional`, `title_professional`, `org_professional`, `links`, `city`, `interests` (array, capped at 10), `profile_mode` ('social' / 'professional' / 'both'), `rsvp_visibility` ('public' / 'connections' / 'private'), `is_discoverable`, `matching_enabled`, `pinned_badges` (up to 3 badge titles user pins to their public profile)

**System-managed** (locked down by `guard_profile_protected_columns_trg` — user UPDATE attempts on these columns RAISE an exception; only service-role or internal maintenance triggers can write):
- `hosted_count`, `attended_count` (maintained by DB triggers on events/rsvps — triggers bypass the guard via the `app.internal_update` transaction-local config flag). **Important nuance:** `attended_count` increments on RSVP insert, not on event completion. It represents RSVPs, not verified physical attendance. Attendance-based achievements fire on RSVP accordingly. Gating on actual attendance requires a check-in system (deferred).
- `safety_score`, `safety_tier` ('new' / 'verified' / 'trusted' / 'flagged'), `review_count` (maintained by review aggregation)
- `gathr_plus`, `gathr_plus_expires_at`, `gathr_plus_trial_used`, `gathr_plus_trial_levels` (modifiable only via `claim-gathr-plus-trial` / `claim-level-trial` edge functions running with service-role)

XP and level are **not stored** in the database. The client computes them from authoritative DB counts:
`xp = profile.hosted_count×10 + profile.attended_count×5 + connections×3 + interests×2`, `level = floor(xp/50) + 1`. Earlier versions computed XP from the *fetched array length* of `hostedEvents`/`attendedEvents`, which were limited to 50/200 rows respectively — this capped a power user's XP at ~30 levels. Now corrected to use the trigger-maintained counts directly.

### Key Column Details on `events`

- `spots_left` (int) — maintained by DB trigger on `rsvps` INSERT/DELETE
- `visibility` — 'public' / 'unlisted' / 'private'
- `is_featured` (bool) — surfaced at the top of the home feed with a larger card
- `ticket_type` — 'free' / 'paid'
- `ticket_price` (float)

---

## Database Triggers (Server-Side Business Logic)

All count management and notifications are handled by Postgres triggers — not client code. This prevents race conditions (two users clicking simultaneously both reading the same count and both writing `count + 1`) and ensures data stays consistent even if the client crashes mid-request.

| Trigger | Fires On | What It Does |
|---|---|---|
| `trigger_update_event_spots` | rsvps INSERT/DELETE | Increments/decrements `events.spots_left` |
| `trigger_update_attended_count` | rsvps INSERT/DELETE | Updates `profiles.attended_count`. Sets `app.internal_update = 'true'` (transaction-local) before the UPDATE so the guard trigger allows the change. On DELETE, skips the UPDATE if the profile row is already gone (prevents errors during account-deletion cascades). |
| `trigger_update_hosted_count` | events INSERT/DELETE | Updates `profiles.hosted_count`. Same `app.internal_update` signal + early-exit-on-missing-profile behaviour as above. |
| `post_like_count_trigger` | community_post_likes INSERT/DELETE | Updates `community_posts.like_count` |
| `community_member_count_trigger` | community_members INSERT/UPDATE/DELETE | Updates `communities.member_count` (INSERT→+1, DELETE→-1, UPDATE pending→member →+1). Function has `SET search_path TO 'public'` to avoid "relation communities does not exist" errors in cron/service contexts. |
| `rsvp_notification_trigger` | rsvps INSERT | Notifies event host: "X is going to your event" |
| `message_notification_trigger` | messages INSERT | Notifies recipient of new DM |
| `connection_request_notification_trigger` | connections INSERT | Notifies addressee of connection request |
| `on_connection_accepted_notify` | connections UPDATE (status→accepted) | Notifies requester that request was accepted |
| `notify_on_event_comment` | event_comments INSERT | Notifies event host of new comment |
| `rate_limit_waves` | waves BEFORE INSERT | Blocks if user sent >30 waves in last hour |
| `rate_limit_community_posts` | community_posts BEFORE INSERT | Blocks if user posted >20 posts in last hour |
| `rate_limit_community_chat` | community_chat_messages BEFORE INSERT | Blocks if user sent >100 chat messages in last hour |
| `rate_limit_messages` | messages BEFORE INSERT | Blocks if user sent >200 DMs in last hour |
| `rate_limit_feedback_trg` | feedback BEFORE INSERT | Blocks if user submitted >5 feedback messages in last hour |
| `dispatch_push_notification_trg` | notifications AFTER INSERT | Fans out to send-push edge function via `pg_net.http_post`. Per-type logic: `rsvp` honours host's `notify_on_rsvp` + 30-min per-event rate limit (stored on `events.last_rsvp_push_at`); all other types push unconditionally. Reads `internal_push_token` and `send_push_url` from Supabase Vault. Fire-and-forget — failures never block notification creation. |
| `community_post_comment_count_trigger` | community_post_comments INSERT/DELETE | Maintains `community_posts.comment_count` (replaces fetching all comments to count them on every load) |
| `guard_profile_protected_columns_trg` | profiles BEFORE UPDATE | Rejects user writes to billing (`gathr_plus_*`), safety (`safety_*`, `review_count`), and trigger-maintained counts (`hosted_count`, `attended_count`). Bypassed by: (1) service-role (`auth.role() = 'service_role'`), or (2) internal maintenance triggers that set `current_setting('app.internal_update', true) = 'true'` before their UPDATE. |
| `on_auth_user_created` | auth.users INSERT | Auto-creates a `profiles` row from `raw_user_meta_data` (name, city, avatar). Eliminates orphan-profile risk when email confirmation is pending |
| `on_profile_created_send_welcome` | profiles AFTER INSERT | Calls `dispatch_email()` → `send-email` edge function with `type: 'welcome'`. Reads email from `auth.users`. |
| `on_rsvp_send_host_email` | rsvps AFTER INSERT | Notifies event host by email when a guest RSVPs (`type: 'event_rsvp'`). Skipped if RSVP-er is the host. |
| `on_connection_request_send_email` | connections AFTER INSERT | Emails addressee about a new connection request (`type: 'connection_request'`). |
| `on_connection_accepted_send_email` | connections AFTER UPDATE (status→accepted) | Emails original requester when their connection request is accepted (`type: 'connection_accepted'`). |
| `rate_limit_reviews_trg` | user_reviews BEFORE INSERT | Blocks if reviewer has submitted ≥ 10 reviews in the past 24 hours — spam/abuse guard on the safety review system. |

Rate limiting works by writing to `rate_limit_events` and counting recent rows. If over the limit, the trigger runs `RAISE EXCEPTION 'rate_limit_exceeded'` which aborts the INSERT and surfaces as an error on the client.

All trigger functions are `SECURITY DEFINER` — they run with the permissions of the function owner (not the calling user), which lets them write to system tables like `rate_limit_events` that users can't write to directly.

---

## Database Indexes

Search and common filter paths are backed by indexes:

**Full-text-style (pg_trgm GIN indexes)** — these make `.ilike('%query%')` queries with leading wildcards fast at scale (without these, every search is a sequential scan):
- `events.title`, `events.description`, `events.location_name`
- `profiles.name`, `profiles.bio_social`, `profiles.city`
- `communities.name`, `communities.description`

**B-tree composite indexes** — these back the most common query patterns:
- `events (city, start_datetime)` — home feed by city, sorted by start time
- `events (city, start_datetime) WHERE visibility='public'` — **partial** version of the above; halves index size and speeds up the hot home-feed query (which always filters on `visibility='public'`)
- `events (start_datetime) WHERE visibility='public'` — search/recommendations sort
- `events (visibility, start_datetime)` — public-event filter + sort (still useful for admin/host queries that span visibility values)
- `events (latitude, longitude)` partial index `WHERE latitude IS NOT NULL` — map page
- `rsvps (event_id, user_id)` — attendee lookups + per-event RSVP check
- `event_bookmarks (user_id, created_at DESC)` — bookmarks page
- `connections (status, requester_id, addressee_id)` — connection-state checks
- `messages (thread_id, sent_at DESC)` — DM thread fetch
- `messages (recipient_id)` partial `WHERE read_at IS NULL` — unread badge
- `notifications (user_id, created_at DESC)` — notifications page
- `community_members (user_id, community_id)` — membership lookups
- `community_posts (community_id, created_at DESC)` — community feed
- `community_chat_messages (community_id, created_at DESC)` — community chat history

---

## Postgres RPC Functions

These are SECURITY DEFINER functions that wrap multi-step operations into atomic transactions, so failures can't leave orphan rows.

| RPC | Args | Purpose |
|---|---|---|
| `create_community(p_name, p_description, p_category, p_visibility, p_icon, p_banner_gradient)` | name (3–100 chars), description, category, visibility (public/unlisted/private), optional icon + gradient | Inserts the community row AND the owner `community_members` row in a single transaction. Returns the new community's UUID. The frontend on `/communities/create` now calls this RPC instead of two sequential inserts (which used to leave orphans on partial failure). |
| `delete_community(p_community_id)` | community UUID | Authorization check (caller must be owner) + cascading clean-up of `community_post_comments` → `community_post_likes` → `community_chat_messages` → `community_posts` → `community_members` → unlinks `events.community_id` → deletes the community. All in one transaction. |

Both RPCs return clear PostgreSQL errors (auth = 42501, validation = 22023) that the frontend can surface. Authenticated role has `EXECUTE` permission.

---

## The Mystery Match System

This is the core UX differentiator. Here's exactly how it works:

**Before the event:**
- When you RSVP, the event detail page fetches other RSVPed users who have `matching_enabled = true` and aren't already connected to you
- It counts them and shows a number ("3 people going share your vibe")
- Their identities are hidden — you see a blurred silhouette card (the `MysteryMatchCard` component)
- **Gathr+ members** see partial first names, shared interests, and can send an anonymous **wave** to signal interest

**Waves:**
- A wave is a row in `waves(sender_id, receiver_id, event_id)`
- The receiver gets a notification: "Someone at [Event Name] sent you a wave 👋" — no identity revealed
- A **mutual wave** (both users waved at each other for the same event) triggers a first-name-only reveal
- There's a unique constraint on `(sender_id, receiver_id, event_id)` to prevent duplicate waves

**After the event ends:**
- The `after-event-matches` Edge Function (invoked once per session from home page) scans for events the user attended that ended in the last 48 hours
- For each such event with unconnected matching-enabled co-attendees, it sends a notification linking to the post-event survey
- Full profiles are now visible in the attendee list on the event detail page

**Safety filtering:**
- Users with `safety_tier = 'Flagged'` are excluded from all match lists

---

## The XP & Level System

XP is earned through various actions and stored on `profiles.xp`. Level is derived from XP using thresholds. There are four achievement **tiers** (separate from safety tier):

- **Newcomer** — starting tier
- **Regular** — mid tier
- **Veteran** — upper tier
- **Legend** — top tier

**32 achievements** across bronze, silver, and gold:

| Category | Achievements |
|---|---|
| Hosting | First Event, Rising Host, Host with the Most, Community Builder |
| Attending | First Steps, Scene Regular, Event Veteran, Gathr Legend |
| Connections | First Connection, Networker, Social Butterfly, Connector |
| Interests | Explorer (5), Passionate (10) |
| Category variety | Curious (3 cats attended), Scene Explorer (5), Renaissance Person (8), Versatile Host (3 cats hosted) |
| Communities | Group Member, Community Regular, Town Square (5), Community Founder |
| Bookmarks | First Save, Curator (5 saved) |
| Profile | Avatar, Storyteller, Dual Mode |
| Level | On Fire (L5), Power User (L10) |
| Safety | Trusted Member (Verified tier), Community Pillar (Trusted tier) |
| Combo | All-Rounder (host + attend + connect ≥ 5 each) |

**Badges** are shown in the Stats tab of your profile. You can pin up to 3 badges to your public profile. An achievement celebration modal (with confetti via canvas-confetti) appears when you cross a milestone.

**Founder badge (exclusive, non-earnable):** A special `✦ Gathr Founder` badge is injected client-side for the founder's account (`FOUNDER_ID` constant in `lib/constants.ts` — hardcoded UUID, no DB migration needed). It appears: (1) first in the pinned badges row on the own profile page, (2) first in the Achievements list above all earnable badges, (3) first in the pinned row on any public profile view of that account. Visual treatment: `bg-gradient-to-r from-[#2A1E04] to-[#100C02]`, `border-[#E8B84B]/50`, `shadow-[0_0_10px_rgba(232,184,75,0.25)]` — noticeably richer than standard earned badges. Badge label "Exclusive" (not a tier name). Does not count against the 3-pin limit. Both `app/profile/page.tsx` and `app/profile/[id]/page.tsx` import `FOUNDER_ID` and check `user?.id === FOUNDER_ID` / `profile.id === FOUNDER_ID` respectively.

**Level-up rewards:**
- Level 5 → 48-hour Gathr+ preview (stored as `gathr_plus_expires_at` on the profile)
- Level 10 → 7-day Gathr+ preview

These are checked and applied when XP is updated. The client reads `gathr_plus_expires_at` and treats it as active Gathr+ if the timestamp is in the future.

---

## The Safety System

**Post-event reviews** (`user_reviews` table):
- Triggered by the `after-event-matches` edge function via a notification
- Survey: 3 yes/no questions (felt safe, comfortable, would meet again) + optional safety flag
- Only available to RSVPed users, only after the event has ended
- Reviews are anonymous — no individual review is ever shown to the subject

**Safety score** = average of (yes answers / total answers × 100) across all reviews received

**Safety tiers:**
- **New** — fewer than 3 reviews
- **Verified** — 3+ reviews averaging above 70%
- **Trusted** — 10+ reviews averaging above 85%
- **Flagged** — 2+ safety flags from separate reviewers

**Consequences of Flagged status:**
- Hidden from all pre-event match lists (`matching_enabled` check filters them out)
- Shown on public profile with a warning badge
- Team review triggered

The `SafetyBadge` component renders the correct badge UI for each tier.

---

## Communities

Communities are persistent groups. Key mechanics:

**Visibility:**
- **Public** — anyone can join instantly
- **Private** — join requests go to `community_members` with `role: 'pending'`; owner sees pending requests and can accept/decline

The `is_private` column is a **computed/generated column**: `GENERATED ALWAYS AS (visibility = 'private') STORED`. This means it's always in sync with `visibility` — no manual update needed.

**Member roles:** `owner` / `admin` / `member` / `pending`

- **owner** — full control: manage members, promote/demote admins, delete any post/chat, delete the community
- **admin** — can delete any post or chat message for moderation; cannot promote/demote others
- **member** — can post, comment, like, and chat
- **pending** — join request awaiting owner approval (private communities only)

**Community posts:** Text posts (1000 char max) with optional image attachment (JPEG/PNG/WebP, max 5 MB). The `text` column is nullable — image-only posts are valid. In public communities, posts are visible read-only to non-members (they see like/comment counts but no interaction buttons); private community posts are fully hidden behind a lock screen. Members see full interactions: liking creates a row in `community_post_likes` and a DB trigger atomically increments `like_count`. Posts support **threaded comments** (500 char max) — replies are stored in `community_post_comments` and loaded lazily on expand. Comment counts are bulk-fetched on page load. Any member can delete their own post/comment; owners and admins can delete any content for moderation. Post deletion also removes the associated image from `community-post-images` storage. If the DB insert fails after a successful image upload, the uploaded file is rolled back. **Pagination:** the feed loads 30 posts on initial load; a "Load more" button (cursor-based via `created_at`) appends subsequent batches of 30. The Feed tab label shows the total DB count (`postCount`), not just the loaded slice.

**Community chat:** Real-time group chat within each community tab. Messages are stored in `community_chat_messages` and loaded via Supabase Realtime `postgres_changes` subscriptions on both INSERT (new messages) and DELETE (moderator removals propagate in real time). Owners and admins see an ✕ button on every message; members only see it on their own.

**Community settings (owner dashboard):** Available at `/communities/[id]/settings`. Owners can: edit community details, manage join requests, **promote members to admin / demote admins to member**, **remove members**, and delete the community. Community deletion is cascading — it cleans up all post comments and chat messages first, then posts, then members, then the community record itself, so no orphan rows are left behind.

**Create event from community:** Navigating to `/create?community=[id]` (e.g. via the community Events tab's "Create Event" button) pre-wires the new event's `community_id`. After publish the user is redirected back to the community's Events tab.

**RLS on community data:**
- `community_posts` SELECT: members can read; non-members can only read posts in public communities
- `community_post_comments`: members can read/insert; own row delete + owner/admin moderation delete
- `community_chat_messages` DELETE: own message or owner/admin moderator
- `community_members` UPDATE: owner-only with `WITH CHECK (role IN ('member','admin'))` — prevents privilege escalation to owner
- `community_members` DELETE: self-leave OR owner removing others

**Member count:** Maintained exclusively by the `community_member_count_trigger` DB trigger. The client no longer writes `member_count` directly — it only updates local state optimistically.

---

## Gathr+

Gathr+ is the premium tier. Features:
- See partial names and shared interests in pre-event match lists (free = count only)
- Send anonymous waves to matches before events
- Priority matching rank (appears higher in other users' match lists)

**Access tiers:**
- `profiles.gathr_plus` (bool) — true means the user is a paid subscriber (set by the future billing webhook)
- `profiles.gathr_plus_expires_at` (timestamptz) — a time-limited grant: 7-day free trial OR a level-milestone preview (48h at level 5, 7-day at level 10)
- `profiles.gathr_plus_trial_used` (bool) — gates the one-time 7-day free trial
- `profiles.gathr_plus_trial_levels` (int[]) — which level-milestone previews have already been claimed

Client treats the user as Gathr+ if `gathr_plus === true` OR `gathr_plus_expires_at > now()`.

**The lockdown:** All four columns above are protected by `guard_profile_protected_columns_trg` — direct user UPDATEs are rejected. The only paths that can set them:
- `claim-gathr-plus-trial` edge function — the one-time 7-day free trial (`/gathr-plus` page calls this)
- `claim-level-trial` edge function — level milestone previews (auto-invoked from `/profile` on level-up)
- Service-role inside future billing webhooks (e.g. RevenueCat / Stripe webhook setting `gathr_plus = true`)

This means a sophisticated user with API access cannot grant themselves Gathr+ or reset their `trial_used` flag. Earlier versions did the trial activation client-side and were exploitable.

**Billing status:** Actual billing (RevenueCat + Apple IAP / Google Play Billing / Stripe for web) is not yet wired. The `/gathr-plus` page shows a "Billing Coming Soon" panel and a "Notify me" button that routes to `/waitlist`. Until billing launches, users only have access through the 7-day trial and level milestones.

---

## Notifications

Notifications are rows in the `notifications` table:
```
{ user_id, actor_id, type, title, body, link, read }
```

**Types:** `rsvp`, `message`, `connection_request`, `connection_accepted`, `event_comment`, `wave`, `after_event_match`, `level_up`

All notifications except `wave` and `after_event_match` are created by **Postgres triggers** server-side — the client never inserts notification rows for these. This means:
- No duplicate notifications even if the user clicks twice
- Notifications fire even if the client crashes or goes offline mid-request

**Web push** (`push_subscriptions` table, VAPID protocol) is also wired up via `ServiceWorkerRegistrar` and `usePushNotifications` hook — for native push notifications when the app is not open. A contextual opt-in prompt appears on the event detail page 1.2s after a user's first successful RSVP (status `inactive`, gated by `gathr_push_prompted` in localStorage so it fires once across all sessions).

The notifications page (`app/notifications/page.tsx`) groups notifications into Today / This week / Earlier and supports:
- **Mark all read** — header button, only shown when unread count > 0
- **Individual read/unread toggle** — the dot on the left of each row is a tap target (20×24px); gold = unread, faint white = read. Tapping flips the state via `markRead` / `markUnread` which write to `notifications.read` directly.
- **Connection request hydration on load** — after fetching, `hydrateConnectionStatuses()` batch-queries the `connections` table for all `connection_request` notifications and pre-sets `_accepted` or `_resolved` flags so the Accept/Decline buttons reflect actual DB state across page refreshes. If the query itself fails for any reason, the function falls back to showing buttons (never hides them on error). Notifications with a null `actor_id` are also passed through unchanged.
- **`_resolved` state** — if a requester withdrew their request before the addressee acted, the connection row no longer exists; these notifications render "Request no longer pending" instead of stale buttons. If the UPDATE detects 0 rows affected (request already gone), `_resolved` is set immediately in state.
- **Robust accept** — `handleAcceptConnection` uses `.select()` + `.eq('status', 'pending')` on the UPDATE so 0-row updates are detected (previously a 0-row update returned no error and silently appeared to succeed). On genuine failure an `actionError` string appears below the buttons in red. On 0-row (request gone), the notification transitions to `_resolved` automatically.
- Tapping a non-connection-request notification marks it read and navigates to `notif.link`.
- Realtime subscription on `notifications INSERT` for the current user keeps the list live without polling.
- Pagination: 30 per page, cursor-based on `created_at`.

**Icon rendering (`getTypeIconSvg`):** All 8 notification types render as inline SVG icons — gold for `connection_request`, `after_event_match`, `event_reminder`, and the default bell; mint for `connection_accepted`, `rsvp`, `event_comment`, and `message`. The helper `getTypeIconSvg(type)` returns a `React.ReactNode` (11×11 SVG) used in two places: the 20px badge overlay on the notification avatar, and the avatar fallback when the actor has no photo. The previous `getTypeIcon()` returned emoji strings — those required the emoji to render correctly on every platform and couldn't be tinted; SVGs are consistent and theme-aware.

**Bell button dynamic state (home page header):** The bell button in the home header has two visual states driven by `unreadCount`:
- **Idle (no unreads):** `bg-[#1C241C]` card background, `border-white/10`, neutral text. Standard appearance matches other header buttons.
- **Has unreads:** `bg-[#E8B84B]/10` gold tint background, `border-[#E8B84B]/30` gold border, `text-[#E8B84B]` gold icon, plus the `btn-glow-bell` CSS class that applies a gold ambient box-shadow (dark mode: `rgba(232,184,75,0.30)`; light mode: `rgba(142,110,19,0.22)`). The glow is a CSS class rather than an inline style so it adapts correctly to theme. The badge uses `soft-pulse` so it gently pulses. In light mode `text-[#E8B84B]` is remapped to `#8E6E13` (dark gold) and `border-[#E8B84B]/30` to a darker opacity via the accent swap overrides in `globals.css`.

---

## Realtime

Supabase Realtime uses `postgres_changes` subscriptions — it watches the Postgres WAL (Write-Ahead Log) and pushes change events to subscribed clients over a WebSocket.

**Used on:**
- `messages/[id]/page.tsx` — DM chat: subscribes to INSERT and DELETE on `messages` filtered by `thread_id`. New messages append in real time; unsent messages are removed in real time for both parties.
- `communities/[id]/page.tsx` — Community chat: subscribes to INSERT and DELETE on `community_chat_messages` filtered by `community_id` (DELETE fires when a moderator removes a message)
- `home/page.tsx` — three subscriptions / refresh triggers keep the feed live:
  - INSERT on `events` **filtered by `city=eq.${profile.city}`** (only new public events in the user's selected city are pushed) and UPDATE on `events` (spots_left changes propagate to feed cards instantly). The channel is set up in a dedicated `useEffect` dependent on `user.id` and `profile.city` — it automatically reconnects with the updated city filter when the user switches cities
  - UPDATE on `profiles` filtered by `id=eq.${user.id}` (the user's own row) — when interests, city, profile_mode, or anything else changes from anywhere (this tab, another tab, another device), the home page merges the new payload into local `profile` state. The "For You" filter re-evaluates against the updated interests immediately
  - `document.visibilitychange` listener — when the tab/app comes back to the foreground (mobile background return, tab refocus), `fetchAll` re-runs. Catches edge cases where the realtime channel may have missed events while the tab was inactive
  - `supabase.auth.onAuthStateChange` listener — on `SIGNED_IN` events (token refresh, cross-tab sign-in), `fetchAll` re-runs; on `SIGNED_OUT`, redirects to `/auth`
- `events/[id]/page.tsx` — subscribes to INSERT and DELETE on `rsvps` filtered by `event_id`, keeping attendee list and spots_left live
- `notifications/page.tsx` — subscribes to INSERT on `notifications` filtered by `user_id`, so new notifications appear without a refresh
- `host/page.tsx` — subscribes to INSERT and DELETE on `rsvps` so RSVP counts on the host dashboard update as people join/leave events. **The subscription has no server-side filter** (Postgres CHANGES filters don't support `event_id IN (…)`), so it filters client-side via `eventIdsRef: Set<string>` — payloads for events not owned by the current host are dropped before mutating state. Without this filter, every host got every other host's RSVPs over the WebSocket

**DM inbox (delete conversation):** The DM inbox (`messages/page.tsx`) includes a `SwipeThread` component — swipe left on a thread to reveal two action buttons: Mark Read/Unread and Delete. Deletion hides the thread from the user's list; the underlying messages are preserved for the other party. Hidden thread IDs are stored in the `hidden_threads` table (RLS-protected, `user_id` + `thread_id` primary key) and loaded on mount via `fetchData`, so threads stay hidden across devices and sessions.

**DM thread (unsend message):** Long-press (mobile) or right-click (desktop) any message you sent to reveal the Unsend sheet. Tapping Unsend deletes the message row from the database (guarded by `.eq('sender_id', user.id)` on the client in addition to RLS). If the message contained an image or file attachment, the storage object in the `chat-attachments` bucket is also deleted so the URL is fully invalidated. The realtime DELETE subscription propagates the removal to the recipient's screen immediately. If the DB delete fails, the message is restored in the local state.

**Typing indicators** in DMs use Supabase **Presence** (not postgres_changes). Presence is a ephemeral pub/sub channel — each user broadcasts a `{ typing: true/false }` state, and others see it in real time via the `sync` event. It doesn't touch the database at all.

**Incoming bubble light-mode fix:** Incoming message bubbles use `bg-[#1C241C]` (dark forest). In light mode that class maps to `#FFFFFF` (white), making the bubble invisible on the `#F4F0E8` cream page. A `border border-white/10` was added to the bubble class — in light mode `border-white/10` resolves to `rgba(0,0,0,0.09)`, giving a subtle but sufficient edge definition without any extra CSS override. Typing-indicator bubble border upgraded from `border-white/[0.07]` to `border-white/10` for parity.

---

## Edge Functions

Supabase Edge Functions run on Deno, server-side, close to the database. Seven functions are deployed. All read `APP_ORIGIN` env var for `Access-Control-Allow-Origin` (defaults to wildcard if unset — set this to your production domain when you deploy).

**`delete-account`**:
- Called from Settings → Danger Zone (Type "DELETE" confirmation required client-side)
- Verifies the caller's identity via `auth.getUser()` using the bearer token
- Uses a service-role admin client to call `auth.admin.deleteUser(userId)` — this cascades to all linked data via FK constraints (rsvps, events, community_members, connections, messages, notifications, waves, etc. — all ON DELETE CASCADE from `profiles`)
- Returns `{ success: true }` on success; the client then calls `supabase.auth.signOut()` and redirects to `/auth`
- **Cascade safety note:** the count-maintenance triggers (`trigger_update_attended_count`, `trigger_update_hosted_count`) detect when the target profile no longer exists (mid-cascade) and skip their UPDATE, preventing the guard trigger from blocking the deletion

**`claim-level-trial`** (JWT-verified):
- Called from the profile page when a level milestone (5 or 10) is detected client-side
- Computes XP and level server-side from authoritative DB counts (`hosted_count`, `attended_count`, connection count, interest count) — client cannot fake a level-up
- Grants the appropriate Gathr+ preview trial (48h at level 5, 7-day at level 10) if `gathr_plus_trial_levels` doesn't already include that level
- Writes `gathr_plus_expires_at` and `gathr_plus_trial_levels[]` via service-role (frontend can't, thanks to `guard_profile_protected_columns_trg`)

**`claim-gathr-plus-trial`** (JWT-verified, **new**):
- The only authorised path to activate the 7-day Gathr+ free trial
- Eligibility: account ≥ 1 hour old, `gathr_plus_trial_used = false`, not already a paying subscriber
- Sets `gathr_plus_expires_at = now() + 7 days` and `gathr_plus_trial_used = true` via service-role
- The frontend `/gathr-plus` page calls this; the client can no longer write `gathr_plus_*` columns directly (RLS trigger blocks it)
- Returns `{ success: true, expires_at, days: 7 }` or a structured 4xx error with a user-friendly message

**`geocode-event`** (JWT-verified):
- Handles post-publish geocoding server-side (the create form also does client-side autocomplete via Nominatim for real-time venue suggestions — see Tech Stack)
- Called fire-and-forget from `/create` and `/events/[id]/edit` after publish/save with `{ event_id }`
- Authorization check: only the event's host can request a geocode for it
- Hits Nominatim with `User-Agent: GathrApp/1.0 (gathr.app)`; falls back to `CITY_COORDS[city]` lookup (mirrors `lib/constants.ts CITIES`) if Nominatim returns no result
- Updates `events.latitude` / `events.longitude` via service-role; idempotent
- Frontend map view (`/map`) now ONLY queries events that already have coords (`not('latitude', 'is', null)`), so geocoding happens once at write time, never at read time

**`after-event-matches`** (JWT-verified):
- Called once per session from the home page: `supabase.functions.invoke('after-event-matches')`
- Reads the caller's identity from the JWT (no user ID needed in the request body — it's derived from the auth token)
- Scans for events the user attended that ended in the last 48 hours
- For each such event, finds unconnected co-attendees with `matching_enabled = true`
- Sends one notification per qualifying event (deduped against existing notifications)
- Runs server-side so it can do multi-table joins efficiently without the client making 5+ sequential queries on load
- Co-attendee lookups use a single `.in('event_id', qualifyingEventIds)` batch query — O(1) DB round-trips regardless of how many qualifying events there are; results are grouped by `event_id` client-side

**`send-push`** (`verify_jwt: false` — custom auth):
- Fans out a Web Push notification to all of a user's subscribed devices
- Authentication: requires the `X-Internal-Token` header to match `INTERNAL_PUSH_TOKEN` env var (set in Edge Function secrets). Anyone hitting the endpoint without it gets 403. `verify_jwt` is intentionally off because the standard JWT check accepts anon keys, which would let any client trigger arbitrary pushes.
- Looks up rows in `push_subscriptions` for the target `user_id`, then POSTs each endpoint with the VAPID-signed payload
- Per-type title formatting via `formatPushCopy()` — e.g. type `rsvp` becomes "New RSVP", `after_event_match` becomes "Your matches are ready", `wave` becomes "Someone waved". Falls back to the notification's `title` field if type isn't mapped
- Auto-prunes dead `push_subscriptions` rows when `webpush.sendNotification()` throws (handles endpoint expiry from browser updates / uninstalls)
- Invoked exclusively by `dispatch_push_notification_trg` on `notifications` INSERT — not called from the client

**`send-email`** (`verify_jwt: false` — custom auth):
- Sends transactional emails (welcome, event RSVP, connection request, connection accepted) via the Resend API
- Authentication: **fail-closed** — if `INTERNAL_EMAIL_TOKEN` env var is not set, returns 503; if the header is present but wrong, returns 403. Both checks run unconditionally so a missing env var never silently grants access.
- All four email templates HTML-escape user-supplied strings (name, event title) via `escapeHtml()` before inserting into the HTML body, preventing XSS if a malicious display name is stored.
- Called exclusively by four Postgres triggers (`on_profile_created_send_welcome`, `on_rsvp_send_host_email`, `on_connection_request_send_email`, `on_connection_accepted_send_email`) via `pg_net.http_post` — the `dispatch_email()` helper function builds the request. **Important:** `net.http_post` expects `body jsonb`; `dispatch_email` passes `payload` directly (no `::text` cast). An `EXCEPTION WHEN OTHERS` guard ensures email failures are logged but never abort the calling transaction.
- `FROM` address: `Gathr <onboarding@resend.dev>` (Resend shared domain — update to custom domain before real-user launch)
- `REPLY_TO`: `officialgathr@gmail.com`
- All four email types have full dark-themed HTML templates built inline — no external template engine
- **Note:** The shared Resend domain (`onboarding@resend.dev`) only delivers to the Resend account owner's email address during development. Verify a custom domain in Resend before beta launch so emails reach all users.

---

## Storage Buckets

Four public buckets in Supabase Storage, all with server-enforced MIME type restrictions:

| Bucket | Allowed MIME Types | Size Limit |
|---|---|---|
| `profile-photos` | image/jpeg, png, webp, gif, heic, heif | 2 MB |
| `event-covers` | image/jpeg, png, webp, gif, heic, heif | 5 MB |
| `community-banners` | image/jpeg, png, webp, gif, heic, heif | 2 MB |
| `community-post-images` | image/jpeg, jpg, png, webp | 5 MB |
| `chat-attachments` | image/jpeg, png, webp + pdf, txt | 10 MB |

MIME enforcement is at the **storage bucket level** — even if someone bypasses the frontend validation and hits the Supabase Storage API directly with the anon key, the server rejects non-allowed file types.

**`community-post-images` RLS:**
- Public read (anon key)
- Authenticated upload: path must be `{communityId}/{userId}/{uuid}.{ext}` — the middle path segment must match `auth.uid()`, enforced by `(string_to_array(name, '/'))[2] = auth.uid()::text`
- Delete: only the post author (matching path segment) may delete

**`profile-photos` client size guard:** `setup/page.tsx` enforces a 2 MB client-side check matching the 2 MB bucket limit (previously was a 5 MB mismatch that would confuse users with a bucket rejection after a successful client-side check).

---

## Light Mode / Dark Mode

Implemented via a CSS class on `<html>`: `data-theme="light"` or nothing (dark is default).

**How it works:**
- `useTheme` hook (in `hooks/useTheme.ts`) reads from `localStorage` and applies `document.documentElement.setAttribute('data-theme', 'light')`
- `ThemeToggle` component (in settings) toggles it
- `globals.css` has ~156+ overrides scoped to `[data-theme="light"]` that remap every Tailwind color class to a light palette
- **Inline style gradients** (which can't be overridden by Tailwind class selectors) are all extracted into CSS variables — e.g. `var(--gradient-event-hero)` — with light mode values defined in `[data-theme="light"]` in globals.css
- Category gradient cards use a `category-gradient-card` class that gets `!important` overridden in light mode

**Dark palette:** `#0D110D` (page bg), `#1C241C` (card bg), `#F0EDE6` (primary text), `#E8B84B` (gold accent), `#7EC87E` (green accent)

**Light palette:** `#F4F0E8` (warm cream page bg), `#FFFFFF` (card bg), `#18180E` (dark text), `#E8B84B` (gold — stays the same for solid fills), `#D8EDD8` / `#EDF6ED` (light greens)

**Accent text swap in light mode:** the mint-green `#7EC87E` (interest pills, "Connected", "Going", mutual-connection labels) and gold `#E8B84B` (Connect CTA, "See all", Quick-filter chips) are remapped to darker shades — `#2E6B36` and `#8E6E13` — when `data-theme="light"`, since the brand mid-tones fail WCAG AA on the cream page background. Borders using these accents at `/10`–`/40` opacity get the same swap so pill outlines stay visible. Solid `bg-[#E8B84B]` and `bg-[#7EC87E]` fills (e.g. send button, "Going ✓" badge) are unchanged — their text colour is already dark. Solid `border-[#E8B84B]` and `border-[#7EC87E]` (used as tab underlines / active pill borders throughout the app) are also remapped to the darker shades so the indicator remains visible on the cream background.

**Badge cutout pattern:** Notification dot/count badges use a `border-2 border-[#0D110D]` ring to punch an invisible "halo" that visually lifts the badge off the button background. In light mode `border-[#0D110D]` is overridden to `border-[#F4F0E8]` (cream page bg) so the cutout effect works identically on the light surface. This single override covers every badge in the app — bell badge, profile-photo unread dot, community member badge, etc.

**Achievement tier cards (light mode):** The dark gradient pairs (`from-[#2A2010] to-[#1A1408]` gold, `from-[#1A1A1A] to-[#111]` silver, `from-[#1E1408] to-[#140E04]` bronze) are remapped in light mode to light-tinted equivalents — cream-yellow for gold, pale-slate for silver, pale-amber for bronze — so tier cards remain visually distinct without a harsh dark rectangle on the cream page background.

---

## Design System — Splash D

**Splash D** is the design pass that produced the current UI. Three parts: a type system, an SVG icon system, and consistent empty-state patterns.

### Font System

Three typefaces, each with a semantic role:

| Class | Font | Role |
|---|---|---|
| `font-display` | Bricolage Grotesque | Display headings (h1, h2), stat numbers, level labels. Applied to every h1/h2 across the app. |
| `font-editorial` | Fraunces | Editorial pull quotes and italic accent text. Used sparingly. |
| `font-mono-ui` | Geist Mono | Micro-labels, timestamps, category tags, meta text — the tiny uppercase tracking labels under card images. |

All three are loaded via `next/font/google` in `app/layout.tsx` and exposed as CSS variables (`--font-display`, `--font-editorial`, `--font-mono-ui`), then applied as Tailwind utility classes via `globals.css`.

### SVG Icon System

All UI emoji replaced with inline SVG icons across every page (home, host, bookmarks, profile, events/[id], events/[id]/edit, events/[id]/attendees, create, communities/[id], communities, communities/create, search, profile/edit, messages, map).

**Two intentional exceptions — do not replace these:**
1. **Achievement badge emoji** (🎉🎙🏆 etc.) — 32 achievements each have an emoji identity that is semantic data. Changing them would change the badges users already hold.
2. **`community.icon`** — user-configured emoji that the community creator picks. Always rendered as `community.icon ? <span className="text-Xzl">{community.icon}</span> : <svg people />`. Only the `|| '👥'` fallback is replaced with SVG.

**Stroke convention for gold-tinted icons:**
```tsx
{ fill: 'none', stroke: 'rgba(232,184,75,0.7)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
```

White/neutral icons (e.g. edit pencil on event hero) use `stroke="rgba(232,184,75,0.8)"`. Dark-on-light icons (e.g. calendar in the Add to Calendar modal on a white button) use `stroke="#1a1a1a"`.

**Empty-state icon box pattern:**
```tsx
<div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(232,184,75,0.5)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
    ...
  </svg>
</div>
```

Locked/private states use `w-12 h-12 bg-[#0D110D]` with a 20px SVG.

### Event Tile Gradient Backgrounds

Image-less event tiles and category thumbnails use `CAT_GRADIENT` from `lib/constants.ts`. Two patterns depending on context:

**Full-size tiles** (home feed, bookmarks) — use the `category-gradient-card` class + `--cat-bg` CSS variable so light mode can override:
```tsx
<div
  className="category-gradient-card h-20 relative overflow-hidden"
  style={{ '--cat-bg': CAT_GRADIENT[event.category] || CAT_GRADIENT['Social'] } as React.CSSProperties}
/>
```

**Small thumbnails** (host, profile, search, map selected card) — same pattern at smaller sizes (`w-10 h-10`, `w-9 h-9`, etc.).

`[data-theme="light"] .category-gradient-card` in `globals.css` overrides the background to `var(--gradient-category-card)` (a soft green gradient) regardless of the `--cat-bg` value — this is why the CSS variable pattern is required instead of a direct inline `background:` style.

Community event tiles (inside community detail) use `var(--gradient-event-hero)` (the CSS variable that adapts to light/dark mode).

**Emoji overlays on tiles with no cover image:** When an event has no `cover_url`, the gradient tile shows only the dark forest background — visually empty. `CAT_EMOJI` (exported from `lib/constants.ts`, same file as `CAT_GRADIENT`) maps all 42 event categories to an emoji. When `cover_url` is absent, a centered emoji from `CAT_EMOJI` renders at 25–30% opacity inside the tile (`pointer-events-none select-none`) as a watermark. Three sizes used on the home feed:

| Tile | Emoji size | Opacity |
|---|---|---|
| `h-20` "soon" rail cards | `text-2xl` | 30% |
| `h-28` main grid cards | `text-4xl` | 25% |
| `h-36` featured event | `text-5xl` | 25% |

The low opacity keeps the gradient visible while giving the tile a category identity without a photo. The emoji is never shown when a cover image exists.

### TierIcon Helper

Defined as a local helper above the profile page export in `app/profile/page.tsx`. Renders a level-appropriate filled SVG icon with a `filter: drop-shadow()` glow — gold ambient glow for levels 3+ and a mint glow for level 1–2. Gold variants also carry an inner highlight polygon layer for visible depth (not flat fills).

| Level | Icon | Color | Glow |
|---|---|---|---|
| 1–2 | Sprout / leaf | `#7EC87E` (green — growing) | `drop-shadow(0 0 4px rgba(126,200,126,0.70))` |
| 3–4 | Filled 5-point star | `#E8B84B` (gold) | `drop-shadow(0 0 5px …) drop-shadow(0 0 10px …)` |
| 5–9 | Filled lightning bolt | `#E8B84B` (gold) | `drop-shadow(0 0 6px …) drop-shadow(0 0 12px …)` |
| 10+ | Filled crown/trophy | `#E8B84B` (gold) | `drop-shadow(0 0 7px …) drop-shadow(0 0 14px …)` |

```tsx
function TierIcon({ level, size = 24 }: { level: number; size?: number }) { ... }
```

Used in the level stat card (size 32) and the level-up celebration modal (size 72). The glow is applied as an inline `style={{ filter: 'drop-shadow(...)' }}` on the SVG element itself — CSS classes can't target SVG fill via `[data-theme]` overrides.

---

## Search "Quick Filters" (not AI)

The search page (`/search`) accepts natural-ish phrases like "live music thursday night" or "yoga this weekend". This is **not** AI — there is no LLM, no embedding model, no external inference call. It is a hand-rolled rules-based parser (`parseVibeQuery` in `app/search/page.tsx`) that:

1. Matches day keywords (`today`, `tonight`, `tomorrow`, `monday`–`sunday`, `weekend`) → resolves to a target weekday
2. Matches time keywords (`morning`, `afternoon`, `evening`, `night`) → maps to hour ranges
3. Matches a small synonym table (`live music → Music`, `coffee → Food & Drink`, `hike → Outdoors & Adventure`, etc.) → resolves to a category
4. Strips stop-words from the rest, sanitizes filter-special characters, and uses the remainder as the ILIKE term against title/description/location

When the parser extracts any structured piece, the UI shows a "Quick filters detected" panel with the inferred category/day/time chips. The previous "✨ Smart Search" / "AI hint" framing was misleading — the labels were renamed to **Quick filters** (⚡) to honestly reflect that this is deterministic keyword matching, not generative AI.

**Why not build a real LLM-backed search?** Pre-launch, the keyword parser already handles ~80% of useful queries at zero infra cost. A real AI agent would require a server-side LLM call per query (latency, API budget, abuse-rate caps), prompt-injection hardening, a new privacy disclosure for sending user queries to a third-party model, and a fallback path when the model is down. That work makes sense once we have signal that users want richer queries (free-form questions, multi-event itineraries, etc.) — not before.

**No AI/LLM is used anywhere else in the app either** — recommendations (`fetchRecommendations`) are a hand-written scoring function over the user's `profile.interests` and event tags/category/spots/recency. The Mystery Match count is a simple SQL count. None of the user's content (messages, posts, profile text, photos) is sent to an AI model.

**Search page UI (post-Splash-D pass):**
- **"Discover" header**: shown above the search bar when no search has fired yet. `font-display` bold h1 + muted subtitle — frames the page as discovery rather than a bare search box.
- **Search bar glow**: `focus-within:border-[#E8B84B]/60` + `shadow-[0_0_0_3px_rgba(232,184,75,0.1),0_4px_24px_rgba(232,184,75,0.08)]` — same glow language as the rest of the app.
- **iOS zoom prevention**: search input uses `font-size: 16px` inline (browser zooms any input < 16px on focus). `text-sm` class removed.
- **Category chips scroller**: chips use `flex-shrink-0` to prevent compression; right-fade overlay (`pointer-events-none`, `bg-gradient-to-l from-[#0D110D]`) signals scrollability; active chip gets a gold glow shadow; thin 3px styled scrollbar for desktop (`[&::-webkit-scrollbar]:h-[3px]`). Browse category tiles use `category-gradient-card` + `CAT_GRADIENT[cat]` CSS variable — same pattern as event thumbnails, same light-mode override.
- **Result tabs**: `flex-1` removed from tabs inside `overflow-x-auto` (caused children to compress instead of overflow). Inner wrapper uses `min-w-max` so tabs stay their natural width and scroll horizontally when needed.
- **Stale tab bug**: `handleSearch` now calls `setActiveTab('All')` as its first line — prevents a blank screen when the user switches category while on e.g. the "People" tab and then searches again.
- **"Picked for you" recommendations**: strong-match cards (score ≥ 0.7) get `border-[#E8B84B]/20 shadow-[0_2px_16px_rgba(232,184,75,0.07)]` gold tint; section header has a `✦` icon box consistent with the Gathr icon language.
- **Trending searches removed**: hardcoded list replaced with nothing — looked like placeholder data. Will return once PostHog has enough data to surface real top-5 terms dynamically (post-beta).
- **Emoji fallbacks replaced**: Quick-filter hint `⚡` is now a bolt SVG polygon; community fallback `👥` is an SVG people icon (or `comm.icon` if set); person avatar fallback `🧑` is the user's first initial with `text-sm font-semibold text-[#7EC87E]`.

---

## Rate Limiting

Server-enforced via Postgres BEFORE INSERT triggers. When a user tries to insert a row (send a wave, post in a community, send a DM), the trigger:
1. Counts rows in `rate_limit_events` for that user + action in the past hour
2. If over the limit, throws `RAISE EXCEPTION 'rate_limit_exceeded'` — the INSERT is aborted, the client gets an error
3. If under the limit, writes a new row to `rate_limit_events` and allows the INSERT to proceed

Limits: waves 30/hr, community posts 20/hr, community chat 100/hr, DMs 200/hr, feedback 5/hr, **user reviews 10/24h** (separate trigger on `user_reviews` BEFORE INSERT — counts reviews by `reviewer_id` in the past 24 hours).

This happens entirely in the database — no application server involved.

---

## The Create Flow (Event Drafts)

The create page is a multi-step form: title → category → datetime → location → details → preview. Every change auto-saves to the `event_drafts` table as an upsert (one draft per user, keyed by `user_id`). If the user leaves mid-flow and comes back, the draft is restored. On publish, the draft row is deleted.

This is implemented with a debounced `useEffect` watching the form state.

**Draft modal on re-entry:** When the user opens `/create` and a draft already exists, a bottom sheet appears with three options:
- **Continue Draft** — loads saved draft into the form
- **Start Fresh (keep draft)** — dismisses the modal and starts a blank form; the draft is *not* deleted. It remains accessible in Profile → Events tab until the user explicitly removes it or overwrites it via auto-save once they start filling in the new form.
- **Delete this draft** — small text link that permanently deletes the draft row and its storage file (same as the trash button in Profile → Events)

**Draft management from Profile:** The Profile page Events tab shows a highlighted "Unsaved Draft" card when a draft exists. It has two actions: tap the card body to resume in `/create`, or tap the 🗑 trash button on the right to delete the draft immediately without navigating away.

**Draft chip on Home feed:** The home page also shows a yellow chip just below the search bar when the user has a saved draft in `event_drafts`. Tapping the chip body routes to `/create`. A small × button on the right deletes the draft (and its cover image from storage) without navigating away — optimistic hide, fire-and-forget delete. Fetched as part of the home feed's `Promise.all` on load.

**Draft card on Host Dashboard:** The host dashboard (`/host`) also queries `event_drafts` on load and shows the same draft banner above the tab strip when a draft exists. Tap to resume in `/create`, or × to delete — consistent with the home chip and profile card.

**Drafts are only auto-deleted on successful event publish.** They are never deleted by navigation (back button, switching tabs, etc.). The user must either publish the event or explicitly delete the draft.

**Resume Draft shortcut:** The Profile page Events tab shows a highlighted "Resume creating your event" banner card when a draft exists in `event_drafts`. Tapping it navigates to `/create` where the draft is auto-loaded.

**Community event linking:** When the create page is opened with `?community=[uuid]`, the UUID is validated against a regex, stored in `fromCommunityId` state, and included as `community_id` in the event insert. After publish, the user is redirected to `/communities/[id]?tab=events` instead of the event detail page.

**Geocoding feedback:** While the Nominatim lookup runs after the user blurs the address field, the field shows a pulsing "Looking up location…" indicator. On success it shows a green "✓ Location confirmed". The Next step button is disabled and shows "Looking up location…" while geocoding is in flight.

**Ticket price validation:** Before inserting a paid event, the client validates that `ticketPrice` parses to a positive finite number between `$0.01` and `$10,000`. The check uses `isFinite(price) && price > 0 && price <= 10000` — non-numeric input, zero, negatives, and values above the cap all surface a clear error message and block the insert.

---

## Settings — Key Behaviours

**Back navigation:** Settings (`/settings`) and Notifications (`/notifications`) both have a `←` back button using `router.back()`. Settings is accessed from the profile page's sliders icon; Notifications from the home page's bell icon. Both return the user to exactly where they came from.

**Password change:** Minimum 10 characters, enforced both client-side (button disabled + strength meter) and server-side (Supabase Auth rejects weak passwords). A 4-bar strength meter updates in real time scoring: length ≥ 8, length ≥ 10, case mix, number + symbol mix. The Update Password button stays disabled until length ≥ 10 and both fields match — so users can't submit a password that will be rejected.

**City change (home feed):** Selecting a new city updates `profiles.city`, shows a 2.5-second pill toast, and immediately re-fetches events from the server for the new city. The local event cache is not reused — a fresh query runs so the full pool for the new city loads. The city picker search input no longer auto-focuses on open (keyboard no longer jumps immediately). Supported cities are scoped to PNW, BC, and West Coast US (32 cities in `ALL_CITIES`, derived from the `CITIES` array in `lib/constants.ts` so the two can never diverge, including Phoenix AZ); the full coordinate lookup table (`CITIES`) covers all of these so `getCityCoords()` never falls back to the default. Phoenix uses `America/Phoenix` (MST year-round, no DST). **City picker overlay:** z-index raised from `z-50` to `z-[60]` so the sheet renders above `<BottomNav>` (also `z-50`, later in the DOM). The search input uses `font-size: 16px` inline style to prevent iOS Safari from auto-zooming on focus (browser zooms when an input's font-size < 16px). Bottom padding uses `max(2.5rem, env(safe-area-inset-bottom))` so city buttons clear the home-indicator on notched iPhones. The same font-size fix is applied to the city search input in the onboarding setup flow (`app/setup/page.tsx`).

**RSVP confirmation:** Tapping "Cancel RSVP" on an event you've already joined opens a confirmation bottom sheet before releasing the spot — accidental taps cannot cancel unintentionally. The actual delete only fires after the user confirms "Yes, Cancel RSVP."

**RSVP confetti:** A confetti burst fires immediately on a successful first-join RSVP, using `canvas-confetti` with gold/cream/green particles (`#E8B84B`, `#F0EDE6`, `#7EC87E`).

**Home page header buttons:** The home page header (`app/home/page.tsx`) has three icon buttons to the right of the Gathr wordmark:

- **Map pin button** — routes to `/map`. Location-pin SVG (`path` teardrop + `circle` dot), `text-[#7EC87E]` mint-green icon, `border-[#7EC87E]/20` subtle green border, `btn-glow-location` ambient glow. In light mode the icon/border remap to `#2E6B36` (dark green) via globals.css overrides, while the glow switches to gold.
- **Bell button** — routes to `/notifications`. Two visual states: idle (`bg-[#1C241C]`, neutral) and has-unreads (`bg-[#E8B84B]/10`, gold tint + glow + soft-pulse badge). See Notifications section for full detail.
- **City picker pill** — opens a city-select bottom sheet. Has a pulsing `bg-[#5BCC7A]` green dot (indicating "live city"), the city name in `font-medium`, and a small SVG chevron at 40% opacity. Also carries `btn-glow-location` (green glow dark, gold glow light). Adding `active:scale-95 transition-all` gives it tap feedback.

Below the header row, a search bar div (routes to `/search`) uses an inline SVG search icon for consistency rather than the `🔍` emoji, and the `⚡ Search` Quick-filters badge on the right.

**Home feed tab persistence:** The active home tab (Trending / For You / Near Me / Friends / Mine) is saved to `sessionStorage` under `gathr_home_tab` and restored on every mount, so navigating to an event and back doesn't reset the user to the Trending tab.

**Profile edit guards:** Save button is disabled while name is blank and shows an arc spinner + "Saving…" while the save is in flight (matches the create/edit event button pattern). Avatar upload failure surfaces a specific error message ("Photo upload failed — your other changes were saved") rather than silently keeping the old photo. Interest search clear re-focuses the input so the user keeps typing without tapping.

---

## Key Code Patterns

**Optimistic UI with rollback:** For actions like bookmarking, liking, and joining — the UI updates immediately and the DB write happens in the background. If the DB write fails, the state is rolled back. This makes the app feel instant on slow connections.

```typescript
// Pattern: optimistic update with rollback
setBookmarked(prev => !prev)
const { error } = await supabase.from('event_bookmarks').insert(...)
if (error) setBookmarked(prev => !prev) // rollback
```

**Parallel queries:** Multiple independent Supabase queries are run with `Promise.all()` to fetch page data in one round-trip instead of sequentially.

**Double-click guards:** Actions like accepting a member request use a `Set` of in-flight IDs (`acceptingIds`, `decliningIds`) instead of a single boolean. This means you can accept multiple different users simultaneously without one blocking the others.

**Supabase client singleton:** The browser client is created once in `lib/supabase.ts` and imported everywhere. No re-instantiation on each component mount.

**`'use client'` everywhere:** Every page is a client component because all pages need live user data. This is intentional for a mobile-first PWA-style app — there are no meaningful server-rendered pages.

**Image optimization via Supabase render endpoint:** All Supabase Storage image URLs are passed through `optimizedImgSrc(url, width, quality?)` in `lib/utils.ts`. This rewrites the URL from `/storage/v1/object/public/` to `/storage/v1/render/image/public/?width=N&quality=N`, which serves a CDN-resized image at the exact dimensions needed. Non-Supabase URLs (Google profile photos, etc.) pass through the `safeImgSrc` allowlist unchanged. Width sizing: 900px for full-page banners/covers, 800px for event card covers, 700px for community post images, 128px for profile hero avatars, 96px for standard avatars, 64px for small mutual-connection thumbnails. All DB-sourced `<img>` tags also carry `loading="lazy"` for deferred loading on long feeds.

**Error boundary:** `components/ErrorBoundary.tsx` is a React class component that wraps the root layout in `app/layout.tsx`. If any page throws an unhandled render error, it catches it and shows a full-screen fallback with a Reload button rather than a blank white screen.

**Community post image lightbox:** Tapping a community post image opens a full-screen overlay (`lightboxUrl` state in `communities/[id]/page.tsx`) showing the image at 900px render quality. Tapping anywhere or the × button dismisses it.

**Reusable UI primitives:**
- `components/PasswordInput.tsx` — password field with a show/hide eye toggle; used in `/auth`, `/auth/reset`, `/settings`. Sets `autoComplete="current-password"` or `"new-password"` so password managers work correctly.
- `components/OfflineBanner.tsx` — mounted in `app/layout.tsx`; listens to `online` / `offline` window events and shows a top banner with a pulsing dot when the network is down.
- `components/UndoToast.tsx` — snackbar with a built-in Undo button + visible progress strip. Caller passes `onUndo` / `onCommit` / `onClose`. Currently used by the profile draft-delete; designed to be reused for any destructive action where the work happens optimistically.
- `components/FadeIn.tsx` — drop-in wrapper for content that benefits from a 300ms opacity + translateY fade-in (instead of a hard pop). Configurable `delay` and `duration`.
- `components/BrandLoader.tsx` — full-screen branded loading state: breathing gold wordmark + animated sweep pill. Used as the Suspense fallback during auth checks on protected pages. Replaces the old emoji spinner.
- `components/OnboardingTooltip.tsx` — gold-bordered tooltip card component (still exists in the codebase). The 3-step tooltip chain it powered on the home feed has been replaced by a single bottom-sheet **welcome modal** (`showWelcome` state in `app/home/page.tsx`). The modal fires once per user account (keyed by `gathr_welcome_${userId}` in localStorage — user-ID-scoped, not device-scoped) on the first home load after sign-in. It shows the Mystery Match concept and two buttons: "Take the tour →" (navigates to `/onboarding`) and "I'm ready" (dismisses). The old device-scoped `gathr_tt_create`, `gathr_tt_groups`, and `gathr_tt_match` localStorage keys are no longer written or read.

**Haptics:** `components/BottomNav.tsx` calls `navigator.vibrate?.(8)` on every tab switch and `(12)` on the central + button. Silent on devices without vibration support (e.g. desktop); no impact on non-touch browsers.

**Dynamic button states (data-driven style):** Buttons that respond to live data (e.g. the bell) are styled via a ternary on a data value rather than a hard-coded class: `className={'base-classes ' + (condition ? 'active-classes' : 'inactive-classes')}`. Inline `style` is used for the `boxShadow` glow since Tailwind arbitrary-value shadows don't coexist cleanly with conditional classes. This pattern keeps all state-driven styling co-located with the condition check.

**`.btn-glow-location` ambient glow class:** A semantic CSS class in `globals.css` that applies a green ambient box-shadow in dark mode (`rgba(126,200,126,0.22)`) and automatically switches to a gold box-shadow in light mode (`rgba(232,184,75,0.30)`) via a `[data-theme="light"]` override. Applied to the map pin button and city picker pill. Color language: **green = location/discovery**, **gold = activity/alerts** (mirrors the bell's gold active state). New location-adjacent elements should use this class rather than a one-off inline style.

---

## The Database Connection to Code

- **`supabase.from('table').select(...)`** → reads rows (filtered by RLS automatically)
- **`.insert({...})`** → creates a row; triggers fire server-side as a side effect
- **`.update({...}).eq('id', id)`** → updates rows
- **`.delete().eq(...)`** → deletes rows
- **`.maybeSingle()`** → returns one row or null (`.single()` errors if no row)
- **`supabase.auth.getSession()`** → gets the current user session (JWT + user object)
- **`supabase.channel(...).on('postgres_changes', ...).subscribe()`** → realtime subscription

RLS means you never have to manually filter by `user_id` on reads — the database does it based on the auth JWT attached to every request.

---

## What Can Go Wrong and How It's Handled

| Risk | Mitigation |
|---|---|
| Race condition on counts (two users click simultaneously) | DB triggers own all count updates — no client writes |
| Duplicate notifications | All notifications created server-side by triggers; client never inserts them |
| Spam / abuse | Rate limiting via BEFORE INSERT triggers on key tables |
| ILIKE wildcard injection in search | `sanitize()` strips `%`, `_`, `\` before passing to PostgREST `.ilike()` |
| Invalid UUID in `?from=` or `?community=` params | UUID regex validation before any DB query |
| Privilege escalation via member role UPDATE | RLS `WITH CHECK (role IN ('member','admin'))` — can't self-promote to owner |
| Private community posts leaking to non-members | RLS SELECT policy requires membership for private communities |
| Malicious file uploads bypassing frontend | Bucket-level MIME type enforcement in Supabase Storage |
| Weak password accepted | Client disables submit until ≥ 10 chars + passwords match; Supabase Auth enforces server-side |
| Avatar upload failure leaves stale preview | Error surfaced to user; DB update proceeds with old URL — no silent mismatch |
| Delete/decline actions double-firing | All destructive buttons check error response before mutating local state |
| Client-side RSVP state gets stale | Realtime subscription or optimistic update + rollback |
| Edge function fails | Called with `.catch(() => {})` — silent failure, doesn't affect the user |
| Typing indicator channel leak | Cleaned up in `useEffect` return (unmount) |
| After-event match check fires every session | Guarded with `sessionStorage.getItem('gathr_match_check')` — runs max once per browser session |
| DB-sourced URL in `<img src>` could load arbitrary content | `optimizedImgSrc()` (wraps `safeImgSrc()` allowlist internally) applied to every DB-sourced image across all pages; non-Supabase URLs (e.g. Google) pass through `safeImgSrc()` unchanged |
| Non-UUID route param causes Supabase query error | `isValidUUID()` guard at the top of every dynamic-route `useEffect` before any DB call |
| Community delete leaves orphan rows | Client explicitly deletes `community_post_comments` → `community_chat_messages` → `community_posts` → `community_members` → `communities` in order |
| `onAuthStateChange` subscription leak on reset page | Subscription returned by Supabase is now unsubscribed in `useEffect` cleanup |
| DM thread hidden state lost between devices | Moved from `localStorage` to `hidden_threads` table — persists across devices and sessions |
| Unsend left image/file in storage | `handleUnsend` now calls `supabase.storage.from('chat-attachments').remove()` after the DB delete, cleaning up the attachment so the URL is fully invalidated |
| Unsend could delete another user's message if RLS misconfigured | Delete query now includes `.eq('sender_id', user.id)` as a client-side safety guard |
| Account deletion blocked by auth layer | `delete-account` Edge Function uses service-role admin client to call `auth.admin.deleteUser()` — bypasses the user's own auth constraints |
| Private event data (host, attendees, comments) returned before access gate fired | Gate check now runs immediately after the event row is fetched — blocked users never trigger the parallel data queries |
| Event cover image orphaned in storage when host deletes event | `handleDelete` extracts the storage path from `cover_url` and calls `supabase.storage.from('event-covers').remove()` after the DB delete |
| CORS wildcard on edge functions allows any origin | All five edge functions read `APP_ORIGIN` env var for `Access-Control-Allow-Origin`; set this secret in Supabase to your production domain |
| Profile XP capped at fetched-array length (50 hosted / 200 attended) | XP now derives from `profile.hosted_count` / `profile.attended_count` (DB-trigger-maintained); display still uses limited arrays |
| Gathr+ trial exploitable via direct API write | `guard_profile_protected_columns_trg` rejects any user UPDATE to `gathr_plus_*` columns. Only `claim-gathr-plus-trial` (service-role) can flip the flag |
| Host realtime subscription received every host's RSVPs platform-wide | Client-side filter via `eventIdsRef: Set<string>` drops payloads for events not owned by current host |
| Map page geocoded events on every visit, never persisted | All geocoding moved to `geocode-event` edge function (proper User-Agent, server-side); map only queries events that already have lat/lng |
| Default Leaflet markers blocked by CSP (unpkg.com not allowed) | Default-icon merge removed entirely; all pins use `L.divIcon` which is inline-HTML and CSP-safe |
| Community create left orphan rows on partial failure | Replaced two sequential inserts with the atomic `create_community` RPC (single transaction, owner row + community row together) |
| Community delete sequential cascade could partially fail | Replaced five sequential client deletes with the atomic `delete_community` RPC |
| City picker sheet renders under BottomNav | Overlay uses `z-[60]` (BottomNav is `z-50`, later in DOM) |
| iOS zooms viewport when city search input is focused | Input has explicit `font-size: 16px`; iOS only zooms inputs below 16px |
| Orphan profile rows from unconfirmed email signups | `handle_new_auth_user` trigger creates the profile only when `auth.users` row commits; client-side profile upserts removed from signup + OAuth callback |
| ILIKE search with leading wildcards forced sequential scans | `pg_trgm` extension + GIN indexes on title/name/description columns; same query now uses index lookups |
| `community_post_comments` count required fetching every row on every load | `community_posts.comment_count` column maintained by `community_post_comment_count_trigger` — page reads the count directly |
| Push permission auto-requested on first page load (browser penalty + low opt-in) | `usePushNotifications` exposes explicit `enable()` / `disable()` actions; Settings has a toggle that requests permission only when user taps it |
| Account deletion possible from a single mis-tap | Delete dialog requires typing the literal string `DELETE` — submit button stays disabled otherwise |
| `dispatch_email` body type mismatch aborts signup transaction | `net.http_post` expects `body jsonb` but the old function passed `payload::text` — SQLSTATE 42883 aborted the whole signup transaction, showing "Database error saving new user". Fixed: `body := payload` (already jsonb, no cast). `EXCEPTION WHEN OTHERS` added so any future email failure logs a warning and returns silently rather than propagating. Migration: `20260513000000_fix_dispatch_email_pg_net_signature.sql`. |

---

## Talking Points for Demos or Technical Conversations

**"How does the matching work?"**
> "When you RSVP, we cross-reference all co-attendees who've opted into matching, remove anyone you're already connected to, and show you a count. We keep the identities anonymous — you just see how many people going share your vibe. After the event ends, full profiles unlock for people you actually attended with."

**"How do you handle safety?"**
> "After every event, attendees get a short anonymous review prompt — three questions and an optional flag. We aggregate those into a safety score and derive a public tier: New, Verified, Trusted, or Flagged. Flagged accounts get pulled from match lists while we review them. The whole system is anonymous — the person being reviewed never sees individual responses."

**"What's the tech stack?"**
> "Next.js 16 App Router on the frontend, deployed on Vercel. Supabase for everything backend — Postgres database, auth, file storage, realtime subscriptions, and edge functions. Tailwind for styling. The whole app is essentially a mobile web app — we use the App Router but every page is a client component because we're doing live data fetching."

**"How do you prevent spam or abuse?"**
> "Rate limiting is enforced at the database level — Postgres BEFORE INSERT triggers check a rate_limit_events log table and throw an exception if a user exceeds the limit. That means even if someone bypasses the frontend entirely and hits the Supabase API directly, they can't spam. Same with file uploads — bucket policies reject disallowed MIME types server-side."

**"What's Gathr+?"**
> "It's the premium tier. Free users see a match count and a blurred silhouette. Gathr+ members see partial names, shared interests, and can send an anonymous wave before the event to signal interest. There's also a milestone system — hit level 5 and you get a 48-hour preview, hit level 10 and you get a 7-day preview. It's a way to let engaged users try it before they commit to paying."

**"How does the realtime chat work?"**
> "Supabase Realtime watches the Postgres write-ahead log and pushes INSERT events to subscribed clients over a WebSocket. The client subscribes on mount and unsubscribes on unmount. Typing indicators use Supabase Presence — a separate ephemeral pub/sub channel that doesn't touch the database, just broadcasts state between clients in the same channel."

---

## File Map — Where to Find Things

| Feature | File |
|---|---|
| Auth flow | `app/auth/page.tsx` |
| Profile setup | `app/setup/page.tsx` |
| Home feed + realtime events | `app/home/page.tsx` |
| Event detail + RSVP + waves + matches | `app/events/[id]/page.tsx` |
| Event creation + draft auto-save | `app/create/page.tsx` |
| Host dashboard | `app/host/page.tsx` |
| Community list + discovery | `app/communities/page.tsx` |
| Community detail + chat + post comments + moderation | `app/communities/[id]/page.tsx` |
| Community settings + member management | `app/communities/[id]/settings/page.tsx` |
| DM inbox + connection requests + delete conversation | `app/messages/page.tsx` |
| DM thread + typing indicators | `app/messages/[id]/page.tsx` |
| Notifications | `app/notifications/page.tsx` |
| Own profile + XP + badges | `app/profile/page.tsx` |
| Public profile view | `app/profile/[id]/page.tsx` |
| Settings + privacy + theme | `app/settings/page.tsx` |
| Gathr+ upgrade | `app/gathr-plus/page.tsx` |
| Supabase client | `lib/supabase.ts` |
| Auth middleware | `middleware.ts` |
| Category emoji map + gradient map | `lib/constants.ts` (`CAT_EMOJI` + `CAT_GRADIENT` constants) |
| Light/dark mode logic | `hooks/useTheme.ts`, `app/globals.css` |
| Theme toggle UI | `components/ThemeToggle.tsx` |
| Safety badge UI | `components/SafetyBadge.tsx` |
| Mystery match card UI | `components/MysteryMatchCard.tsx` |
| Map view | `components/MapView.tsx`, `app/map/page.tsx` |
| Skeleton loading states | `components/Skeleton.tsx` |
| Pull-to-refresh | `hooks/usePullToRefresh.ts` |
| Web push | `hooks/usePushNotifications.ts`, `components/ServiceWorkerRegistrar.tsx` |
| Password input (eye toggle) | `components/PasswordInput.tsx` |
| Offline banner | `components/OfflineBanner.tsx` |
| Undo toast | `components/UndoToast.tsx` |
| Fade-in wrapper | `components/FadeIn.tsx` |
| Branded loading screen | `components/BrandLoader.tsx` |
| App-resume radar overlay | `components/AppResumeRadar.tsx` |
| First-time welcome modal (home, on sign-in) | `app/home/page.tsx` — `showWelcome` state, `gathr_welcome_${userId}` localStorage key |
| Onboarding tooltip card (component, reserved) | `components/OnboardingTooltip.tsx` |
| Analytics (PostHog) provider + `track()` helper | `components/AnalyticsProvider.tsx` |
| Sentry server + edge init | `instrumentation.ts` |
| Sentry browser init | `instrumentation-client.ts` |
| Edge: after-event matches | Supabase Edge Function: `after-event-matches` |
| Edge: claim Gathr+ trial | Supabase Edge Function: `claim-gathr-plus-trial` |
| Edge: claim level-milestone trial | Supabase Edge Function: `claim-level-trial` |
| Edge: server-side geocoding | Supabase Edge Function: `geocode-event` |
| Edge: account deletion | Supabase Edge Function: `delete-account` |
| Edge: web push send | Supabase Edge Function: `send-push` |
| Edge: transactional email | Supabase Edge Function: `send-email` |
| RPC: atomic community create | Postgres function: `create_community` |
| RPC: atomic community delete | Postgres function: `delete_community` |
| Privacy Policy | `app/privacy/page.tsx` |
| Terms of Service | `app/terms/page.tsx` |
| Feature tour | `app/tour/page.tsx` |

---

## Deployment Setup Checklist

Before a public launch:

**Supabase Vault secrets** (set via Supabase SQL editor using `SELECT vault.create_secret('<value>', '<name>', '<description>')`):

These are read by Postgres trigger functions at call time via `vault.decrypted_secrets`. They are **not** in any migration file — you must seed them manually on a fresh project.

| Name | Value source | Used by |
|---|---|---|
| `internal_push_token` | Same value as `INTERNAL_PUSH_TOKEN` edge function secret | `dispatch_push_notification_trg` → `send-push` |
| `send_push_url` | `https://<project-ref>.supabase.co/functions/v1/send-push` | `dispatch_push_notification_trg` |
| `internal_email_token` | Same value as `INTERNAL_EMAIL_TOKEN` edge function secret | `dispatch_email()` → `send-email` |
| `send_email_url` | `https://<project-ref>.supabase.co/functions/v1/send-email` | `dispatch_email()` |

**Supabase Edge Function secrets** (set under Project Settings → Edge Functions → Secrets):
- `APP_ORIGIN` — set to your production app origin, e.g. `https://gathr.app`. Without this, edge functions return `Access-Control-Allow-Origin: *` and accept calls from any website.
- `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` — for `send-push` to sign Web Push payloads. Must match the `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel.
- `INTERNAL_PUSH_TOKEN` — shared secret between the `dispatch_push_notification` Postgres trigger and the `send-push` edge function. The value is stored once in Supabase Vault (as `internal_push_token` secret) so the trigger can read it. Set the SAME value in Edge Function secrets so `send-push` can verify the header. Without it, every push trigger returns 403 silently and pushes never reach users.
- `RESEND_API_KEY` — Resend API key for the `send-email` edge function. Get from resend.com → API Keys. Without it, all transactional email calls return 401 and no emails are sent.
- `INTERNAL_EMAIL_TOKEN` — shared secret between the four email Postgres triggers (via `dispatch_email()`) and the `send-email` edge function. The value is stored in **Supabase Vault** (`internal_email_token`) and read by `dispatch_email()` at call time via `vault.decrypted_secrets` — it is not in the function body or any migration file. Rotate by: (1) `openssl rand -hex 32`, (2) `UPDATE vault.secrets SET secret = '<new>' WHERE name = 'internal_email_token'` in the Supabase SQL editor, (3) update `INTERNAL_EMAIL_TOKEN` in Edge Function secrets. No code or migration change required.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — automatically populated by Supabase.

**Frontend env vars** (`.env.local` or Vercel project settings):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — required for web push notifications. **A keypair was generated for this project; the public key is the one users see in client JS, the private key goes into the Supabase Edge Function secret named `VAPID_PRIVATE_KEY`.** Generate a fresh pair via `npx web-push generate-vapid-keys` if you ever rotate. Without these the Settings → Push Notifications toggle stays inactive.
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry browser + server runtime DSN. Get from Sentry → Project → Client Keys (DSN). Without this Sentry init is a no-op (safe to ship without).
- `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` — build-time source-map upload to Sentry. Without these Sentry still captures errors, but stack traces will be minified.
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key. Without this `track()` calls are no-ops.
- `NEXT_PUBLIC_POSTHOG_HOST` — optional; defaults to `https://us.i.posthog.com`. Set to `https://eu.i.posthog.com` if your PostHog project is in the EU region.

**Static files:**
- `public/robots.txt` — present and configured. Allows `/`, `/terms`, `/privacy`; blocks all auth-required routes (`/home`, `/events/`, `/profile/`, etc.) and API routes from crawlers.
- `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM` — optional. Set to `"true"` only after upgrading Supabase to the Pro plan + enabling Image Transformations. Without it, images are served at full size from Storage (no resize/quality cap). With it, `optimizedImgSrc` rewrites to the `/render/image/public/` endpoint.

**Supabase Auth settings** (Auth → Policies):
- Set the password minimum to 12 characters to match the client-side requirement (otherwise users could bypass the UI and create 6-character passwords via API).
- Enable Sign in with Apple before submitting to the App Store (required when Google sign-in is available).

**Billing** (not yet wired — `/gathr-plus` shows a "Billing Coming Soon" panel until then):

Once mobile apps exist, the platform-store rules force a split:

| Platform | Provider | Notes |
|---|---|---|
| Web (Vercel) | **Stripe** | Direct integration via Stripe Checkout or Elements. ~3% per charge. |
| iOS native app | **Apple In-App Purchases (StoreKit)** | Mandatory by App Store rules for digital subscriptions. 30% (15% after year 1, or 15% under Small Business Program). |
| Android native app | **Google Play Billing** | Mandatory by Play Store rules. 30% / 15% on same terms. |

**Why you'll want RevenueCat as the abstraction layer:**
- One SDK across all three platforms; one entitlement check inside the app
- One outbound webhook to your backend regardless of where the user paid
- Handles subscription lifecycle events (renewal, grace period, cancellation, refund) that you'd otherwise have to reconcile across three different APIs
- Free tier covers up to $10K MTR; ~1% above that

**Integration plan:**
1. Build a new edge function `gathr-plus-webhook` (no JWT verification — accepts RevenueCat's signed webhook payloads; validate the signature server-side)
2. The webhook sets `profiles.gathr_plus = true` and `gathr_plus_expires_at = next_billing_date` via service-role (frontend can't, thanks to the guard trigger)
3. On cancellation/grace expiry, it sets `gathr_plus = false` and lets `gathr_plus_expires_at` lapse naturally
4. Wire Stripe Checkout for the web path; wire RevenueCat's iOS + Android SDKs inside the native shells

The DB and trial code are already structured for this — `claim-gathr-plus-trial` and the future paid-subscription webhook both write to the same protected columns via service-role.

**Known deferred items** (intentionally not done in the polish cycle — call them out so future contributors know they're intentional gaps, not oversights):
- **Event reminders (1h before event start)**: `pg_cron` is enabled. Just needs a cron job that scans `rsvps × events` for events starting in the next hour, inserts notifications with `type='event_reminder'`, and the existing push trigger fans out. Add a new entry to `send-push`'s `formatPushCopy()` for the new type. Maybe 1 hour of work.
- **Sign in with Apple**: required by Apple Store rules when Google sign-in is present. Defer to the mobile build (needs Apple Developer Account, $99/yr).
- **Stripe billing**: the `/gathr-plus` page shows "Billing Coming Soon" until you wire it. Pattern is identical to `claim-gathr-plus-trial` — a new edge function `gathr-plus-webhook` accepts Stripe signed events and updates `profiles.gathr_plus` via service-role.
- **Mobile shake-to-feedback**: in-app feedback button lives in Settings now. A "shake device to report bug" gesture is a nice-to-have for the eventual mobile shell.
- **Next.js + dependency security audit**: `npm audit` reports several Next.js advisories. Bumping requires regression testing; deferred. Don't run `npm audit fix --force` without testing — it would downgrade Next.js significantly.
- **Supabase type generation**: `npx supabase gen types typescript --project-id adhahiqpiqwlvkykhbtf > lib/database.types.ts` would replace many `any` types throughout the app with proper schema types. Several-hour cleanup task.
- **Supabase Image Transformations**: requires Pro plan ($25/mo). When upgraded, set `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=true` in Vercel.

**Observability** (wired, awaiting credentials):
- **Sentry** (`@sentry/nextjs`) is installed. Server + edge init lives in `instrumentation.ts`; browser init in `instrumentation-client.ts`. `next.config.ts` is wrapped with `withSentryConfig` (only activates when `SENTRY_AUTH_TOKEN` is present, so dev builds without Sentry credentials still work). `components/ErrorBoundary.tsx` forwards every caught error to `Sentry.captureException` with the React component stack as context. `AnalyticsProvider` calls `Sentry.setUser({ id, email })` on auth events so error reports are tied to a real person for support follow-up. Cleared on sign-out.
  - Required env vars: `NEXT_PUBLIC_SENTRY_DSN` (browser + server runtimes), `SENTRY_AUTH_TOKEN` (build-time source-map upload), `SENTRY_ORG`, `SENTRY_PROJECT`.
  - 10% trace sampling by default; replay on errors only (1.0), with `maskAllText` + `blockAllMedia` enabled for PII safety. Pings tunnel through `/monitoring` so adblockers don't strip them.
- **PostHog** (`posthog-js`) is installed via `components/AnalyticsProvider.tsx` mounted in the root layout. It auto-identifies users on `SIGNED_IN`, resets on `SIGNED_OUT`, and captures manual `$pageview` events on every App Router transition.
  - Required env vars: `NEXT_PUBLIC_POSTHOG_KEY`, optionally `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`).
  - `autocapture` is **disabled** by design — we send purposeful events via the exported `track(event, properties)` helper. Currently instrumented: `signup_completed`, `signup_started`, `event_created`, `event_rsvp_joined`, `event_rsvp_cancelled`, `gathr_plus_trial_claimed`, `community_joined`, `community_join_requested`. Add more in `track()` calls as features ship.
  - `person_profiles: 'identified_only'` so anonymous users don't bloat your person table.
  - **No PII to PostHog**: the `identify()` call sends only the user UUID and `created_at` — email and any other personal field is kept out by design. (Sentry still receives email since support-driven error follow-up needs it.)

---

## Recent Schema / Behaviour Changes (Audit Cycle)

Tracking the major changes from the most recent audit pass so future code review has a single anchor:

- **XP/Level math**: now uses `profile.hosted_count` / `profile.attended_count` instead of fetched-array lengths (which were capped at 50 / 200).
- **Host realtime**: subscription stays global (Postgres CHANGES doesn't support `IN ()`) but filters via `eventIdsRef` on the client.
- **Map page**: only queries events with non-null coords; no in-browser geocoding (server-side `geocode-event` runs on event create/edit).
- **Leaflet markers**: removed broken default-icon merge (unpkg CDN not in CSP). All pins use `divIcon` with a gold-bordered rotated diamond containing a calendar SVG — no emoji, consistent with the Splash D icon system. Leaflet runs entirely client-side (`ssr: false` dynamic import); any rendering issues appear in the browser console only, not Vercel runtime logs.
- **Community create**: now uses `create_community` RPC; `member_count` starts at 0, trigger handles +1.
- **Community delete**: now uses `delete_community` RPC; atomic cascade.
- **Profile edit**: 10-interest cap enforced; removing avatar deletes the storage object.
- **Event edit**: now supports editing `ticket_type` / `ticket_price` + advanced lat/lng override.
- **Push notifications**: hook no longer auto-prompts; explicit `enable()`/`disable()`.
- **Auth signup**: profile created by DB trigger from `raw_user_meta_data`. No client-side upsert.
- **Gathr+ trial**: only granted via `claim-gathr-plus-trial` edge function. `guard_profile_protected_columns_trg` blocks user writes.
- **Account deletion**: now requires typing "DELETE" in confirm dialog.
- **DB indexes**: pg_trgm on text fields used in search; btree composites on hot-path filters.
- **New tables/columns**: `community_posts.comment_count` (trigger-maintained).
- **Polish components**: `PasswordInput`, `OfflineBanner`, `UndoToast`, `FadeIn`. Bottom nav haptics.
- **Observability wired**: Sentry (instrumentation files + `withSentryConfig` wrap + ErrorBoundary integration), PostHog (AnalyticsProvider + `track()` helper) — both no-op gracefully when their env vars are absent. First batch of events instrumented: signup, RSVP join/cancel, event create, community join, Gathr+ trial claim.

### Polish/observability follow-up cycle

- **Image rendering** (`lib/utils.ts`): the Supabase render endpoint requires Pro plan ($25/mo). On Free tier it returns 403 → every avatar/cover showed as a broken image. `optimizedImgSrc` now returns the raw object URL by default; new env var `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=true` opts back into the render rewrite when upgraded.
- **Unique upload paths**: avatar and event-cover uploads now write to `{userId}/{timestamp}.{ext}` instead of `{userId}.{ext}`. URL changes per upload → no cache-buster query string → CDN can cache. Old files deleted on re-upload (best-effort, doesn't block save).
- **PostHog PII tightened**: `identify()` no longer sends email — only the user UUID. Sentry still gets `setUser({ id, email })` since error follow-up legitimately needs it.
- **Google OAuth onboarding fix**: fresh-user heuristic now keys on `interests.length === 0` only (was also checking `!avatar_url`, but Google users come in with an avatar pre-set, which previously routed them straight to `/home` skipping `/setup`).
- **Community realtime efficiency**: post-INSERT and chat-INSERT handlers skip the row hydration refetch when `payload.user_id === user?.id` (already inserted optimistically). Halves DB load for active senders.
- **Hot-path DB indexes**: added `events_public_city_start_idx` and `events_public_start_idx` as **partial** indexes on `WHERE visibility='public'` — half the size, faster than the unfiltered composite.
- **Notifications pagination**: `Load more` button with cursor on `created_at`. Page size 30. Replaces silent 50-row cap.
- **Feedback table + Settings UI**: new `feedback` table with 5/hour rate-limit trigger. Settings → Send Feedback drops a bottom-sheet modal with category chips (bug/idea/praise/other), textarea, and auto-capture of page_path + user_agent.
- **UI polish primitives applied**:
  - FadeIn now wraps `/profile` and `/events/[id]` main containers (soft entry instead of skeleton snap)
  - MysteryMatchCard locked avatars get a `mystery-shimmer-sweep` gold gradient pass every 3.6s
  - Gathr+ trial countdown soft-pulses when `<24h` remain
  - RSVP +1 ghost (`rsvp-ghost-up` keyframe) floats above the attendee count when others RSVP via realtime
  - Bookmarks empty-state emoji uses `empty-float` keyframe — available as a reusable class for any empty state
- **Live profile-state sync on home feed**: home page now subscribes to UPDATE on its own `profiles` row plus `visibilitychange` and `auth.onAuthStateChange`. Editing interests / city / profile_mode anywhere (this tab, another tab, another device) is reflected in the "For You" filter instantly without pull-to-refresh. Pattern is reusable on any page that wants live profile sync.
- **Push notifications fully wired**: `dispatch_push_notification_trg` on `notifications AFTER INSERT` calls `send-push` via `pg_net.http_post` with `X-Internal-Token` auth. Per-type policy: `rsvp` honours host's new `notify_on_rsvp` profile preference + 30-min per-event rate limit on `events.last_rsvp_push_at`; all other types push unconditionally. `send-push` switched to `verify_jwt: false` + custom token auth (anon-key acceptance via verify_jwt was a real attack vector); also adds per-type title copy (e.g. "Your matches are ready" for `after_event_match`).
- **Light mode contrast pass**: full audit of every hex color class in the app; ~145+ `[data-theme="light"]` overrides now in `globals.css`. Key additions this pass: solid `border-[#E8B84B]`/`border-[#7EC87E]` (tab underlines) → darker shades; badge cutout `border-[#0D110D]` → `#F4F0E8` cream; achievement tier dark gradient pairs remapped to light-tinted equivalents; city-dot `bg-[#5BCC7A]` → `#2A9E4F` for legibility on cream; `bg-[#3A1E1E]` (swipe-delete red) → `#FDEAEA` pale pink; `bg-[#1E3A1E]/30` (connection-request banner) → `rgba(237,246,237,0.50)` light mint; `.search-tip-card` custom class → `rgba(232,184,75,0.09)` amber tint so the Quick-filters hint card is visible on cream without blending in.
- **Quick filters rename**: `✨ AI` / "Smart Search" labels in search and home replaced with `⚡ Quick filters` / "Quick filters detected" to honestly reflect that `parseVibeQuery` is a deterministic keyword parser — no LLM, no external inference call. AI disclosure sections added to both Privacy Policy (§9) and Terms of Service (§12).
- **Bell button redesign**: home header bell now has two visual states — idle (neutral dark card) and has-unreads (gold tint bg + border + icon + ambient box-shadow glow + soft-pulse badge). Uses `soft-pulse` keyframe already defined in `globals.css`.
- **Home header button refresh**: map button upgraded to a location-pin SVG (`path` + `circle`) in mint green with a subtle green border; city picker gains a `rounded-full` pulsing dot, SVG chevron, `font-medium` city name, and tap-scale feedback; search bar replaces emoji `🔍` with an SVG search icon for icon consistency. All new classes already covered by existing light-mode overrides.
- **Bell glow moved to CSS class**: active-state glow switched from inline `boxShadow` style to `btn-glow-bell` class. Dark mode: `rgba(232,184,75,0.30)`, light mode: `rgba(142,110,19,0.22)`. Inline style couldn't respond to `data-theme`. Also added missing base `text-[#E8B84B]` → `#8E6E13` light-mode remap (was only opacity variants before).
- **Draft delete from home chip**: home-page draft chip now has a × button that deletes the draft (DB row + cover storage) inline without navigating away. Optimistic hide.
- **Draft card on host dashboard**: `/host` now queries `event_drafts` on load and shows the same draft banner above tabs. Hosts have one place to manage all event work — including in-progress drafts.
- **Transactional email live**: `send-email` edge function deployed (`verify_jwt: false`, `X-Internal-Token` custom auth). Four Postgres triggers fire on profile create (welcome), RSVP insert (host notified), connections insert (connection request), connections update (connection accepted). All email HTML is dark-themed, built inline without an external template engine. Resend shared domain in use for testing — **must register a custom domain in Resend before real-user launch**.
- **Review rate limiting**: `rate_limit_reviews_trg` BEFORE INSERT on `user_reviews` — max 10 reviews per reviewer per 24 hours. Prevents safety score manipulation via spam reviews. Applied via migration `20260512130000_rate_limit_reviews.sql`.
- **Phoenix, AZ added**: `Phoenix` added to `ALL_CITIES` in `lib/constants.ts` and `CITY_COORDS` fallback in the `geocode-event` edge function. Uses `America/Phoenix` timezone (MST year-round, no DST). City count: 18.
- **Draft chip on home screen**: home feed now queries `event_drafts` as part of its `Promise.all` on load. If a draft exists, a yellow "Draft — resume your event" chip renders below the search bar. Complements the existing draft card in Profile → Events tab.
- **Light mode Tailwind gradient stops**: `globals.css` now includes `[data-theme="light"]` overrides for every `from-[...]` / `to-[...]` class used across host dashboard, profile achievement tier cards, search filter banner, communities overlay — all dark gradient pairs remapped to light-tinted equivalents.
- **Internal email token moved to Vault + rotated**: `dispatch_email()` previously hardcoded both the token and the edge function URL in its body, exposing them in migration files and git history. Both values are now stored in Supabase Vault (`internal_email_token`, `send_email_url`) alongside the existing push secrets (`internal_push_token`, `send_push_url`). `dispatch_email()` reads them via `vault.decrypted_secrets` at call time — no secrets in function body or migration files. Token rotated as part of the migration. Rotation going forward requires only a Vault update + Edge Function secret update; no code changes needed.
- **`btn-glow-location` glow system**: new semantic CSS class providing green ambient glow in dark mode / gold ambient glow in light mode, applied to map + city picker. Establishes green = location, gold = alerts as the header's color language.
- **City picker bug fixes**: (1) Overlay z-index raised from `z-50` → `z-[60]` — `<BottomNav>` is also `z-50` and is rendered after the overlay in the DOM, so it was painting on top. (2) Search input font-size set to 16px inline — iOS Safari auto-zooms any `<input>` with font-size < 16px on focus; both the home sheet and the setup-flow city search are fixed. (3) Bottom sheet padding upgraded to `max(2.5rem, env(safe-area-inset-bottom))` so content clears the iPhone home indicator (`viewportFit: "cover"` already set in layout).

### Splash D — Design System Pass

- **SVG icon system (complete)**: All UI emoji replaced with inline SVG icons across every page — home, host, bookmarks, profile, events/[id], events/[id]/edit, events/[id]/attendees, create, communities/[id], communities, communities/create, search, profile/edit, messages, and map. Two intentional exceptions preserved: (1) achievement badge emoji are semantic identity for each of the 32 badges; (2) `community.icon` is user-configured data, rendered with SVG fallback only when the field is empty.
- **Font system**: `font-display` (Bricolage Grotesque) applied to every h1/h2 across the app; `font-editorial` (Fraunces) for italic accents; `font-mono-ui` (Geist Mono) for micro-labels, timestamps, and category meta text. All loaded via `next/font/google`.
- **Event tile gradient backgrounds**: Image-less event tiles now use `CAT_GRADIENT[event.category]` from `lib/constants.ts` with dark forest fallback `linear-gradient(135deg,#1E3A1E,#0D110D)`. Community event tiles use `var(--gradient-event-hero)`. No emoji on tiles.
- **TierIcon helper**: Inline component in `app/profile/page.tsx`. Renders filled solid SVG (leaf/star/bolt/crown) based on level — green for newcomer, gold for all higher tiers. Replaces deprecated `tier.icon` emoji field. Used in level stat card (size 32) and level-up modal (size 72).
- **Empty-state patterns standardised**: All empty states converted from bare `text-4xl` emoji divs to the icon box pattern (`w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl`) with 22px gold-tinted SVG inside. Home tab empty states use contextual icons: calendar (Trending/For You/Near Me), people (Friends tab), bookmark (Mine tab). All three use `stroke="currentColor" className="text-white/35"` — not hardcoded rgba — so they remain visible in light mode via the existing `text-white/35` → `rgba(0,0,0,0.44)` override.
- **Arc spinner pattern standardised**: Submit buttons that trigger async operations show `<svg className="animate-spin">` arc + ellipsis text while in-flight: Create Event (create page), Save (event edit), Create Community (communities/create), Save Changes (profile/edit). Consistent across all form submission points.
- **Map pins redesigned**: Leaflet `divIcon` pins replaced from category emoji inside a rotated diamond to a **calendar SVG** (`rect` + date lines) in gold stroke inside the same gold-bordered diamond shape. All pins use the same icon — category is communicated by the selected-event card below, not the pin itself. `catEmoji` helper removed from `components/MapView.tsx` entirely. Selected event card: `catEmoji` fallback → `category-gradient-card` thumbnail, `✕` text → SVG X button.
- **Light mode inline gradients (complete)**: All category thumbnail divs in `app/host/page.tsx`, `app/profile/page.tsx`, `app/search/page.tsx`, and `app/map/page.tsx` that used `background: CAT_GRADIENT[...]` as a direct inline style (uncssable by `[data-theme="light"]` overrides) converted to `category-gradient-card` class + `'--cat-bg': CAT_GRADIENT[...]` CSS variable. The existing `[data-theme="light"] .category-gradient-card` override in `globals.css` now remaps all of them to the soft green light-mode gradient automatically. No hardcoded gradient inline styles remain outside of `onboarding` and `tour` (intentionally dark-only splash screens).
- **For You tab subtitle**: removed the truncated interest list (`· coffee, hiking, music`) from the section header subtitle. Showed only the first 3 of up to 10 interests — misleading and redundant with "Picked For You". Now shows event count only, consistent with all other tabs.
- **Dead imports cleaned**: `catEmoji` (from `lib/categoryEmoji.ts`) imports removed from `map/page.tsx` and `components/MapView.tsx` after all usages were replaced with the `category-gradient-card` CSS variable pattern. `CAT_EMOJI` was also removed from `home/page.tsx` at the time — it was later re-added in the pre-beta audit sweep as the emoji-overlay feature (see below).
- **Mystery match slide consistency pass**: `/tour` and `/onboarding` SlideMatch now tell the same story. Onboarding SlideMatch (Variant B): match block layout changed from horizontal flex (avatars left, count right) to vertical — three silhouettes on top, count + reveal label beneath; centre sil gets `match-float-bob` CSS animation (3 s ease-in-out infinite), gold background + border + glow, `mystery-shimmer-gold` pass (more vivid, 2 s). Body copy updated: "reveals who they are only after the event ends" → "reveals them at the start of the event" (accurate — ongoing state fires the reveal, not post-event). Tour page viz fully brought in line with onboarding: replaced static map-style 34×34 tiles (`.map()` loop with inline transform) with explicit three-sil layout — left/right neutral with `mystery-shimmer`, centre golden with `match-float-bob` + `mystery-shimmer-gold` + gold border/glow, `items-end` alignment so float animation reads clearly. Height bumped 140 → 150 px for float headroom. Caption "RSVP unlocks the reveal" → "Attending reveals the match" throughout. Two new CSS utilities added to `globals.css`: `match-float-bob` keyframe + class, `mystery-shimmer-gold` class.
- **Settings "Take the App Tour" button**: currently routes to `/tour` (single-slide mystery match primer). Mismatch for returning users who expect a feature walkthrough. Decision deferred — options are rename, remove, or restore 7-slide tour. See pinned todos.
- **Interests cap decision**: 10-interest cap intentionally preserved. The For You tab does a soft sort (matched events first, all events still visible below) — more interests wouldn't unlock new events, only widen the reordering signal. Cap forces intentionality and keeps matching meaningful.

### Pre-beta audit sweep (2026-05-13)

- **Host dashboard race condition fixed**: realtime RSVP subscription was set up before `fetchData` resolved, leaving `eventIdsRef` empty during the window — incoming RSVPs for the user's events were silently dropped. Fixed by making the effect async and `await`ing `fetchData` before calling `.subscribe()`.
- **Draft delete confirmation**: single-tap × on the host dashboard draft banner now shows an inline "Delete this draft? [Cancel] [Delete]" confirmation instead of immediately deleting.
- **Map city validation**: `profileData.city` is now validated against the `ALL_CITIES` allowlist before being used as a Supabase `.eq()` filter. A corrupted/unexpected city value previously caused the map to silently show no events.
- **Accessibility — meaningful alt text**: event cover images in `app/map/page.tsx` and `app/bookmarks/page.tsx` changed from `alt=""` to `alt={event.title}`.
- **MapView PIN hoisted**: `createPin()` call moved outside the component as `const PIN = L.divIcon({...})` — allocated once at module load instead of per-render per-marker.
- **Bookmarks unbookmark + UndoToast**: each bookmark card now has a bookmark-slash SVG button overlaid on the cover. Tap removes the card optimistically and shows an `UndoToast` with a 5 s window. On expire, the DB `DELETE` fires; on Undo, the card is restored. Orphan cleanup errors are now `console.error`'d instead of swallowed. `📅` `📍` `🔖` replaced with SVG calendar, pin, and bookmark icons.
- **Profile edit SVG pass**: top Save button now shows arc spinner + "Saving…" (previously only the bottom button did). Avatar placeholder `🧑‍💻` → person outline SVG. Profile mode options (Social / Professional / Both) and RSVP visibility options (Public / Connections / Private) icons converted from emoji to inline SVGs, colour-keyed: gold (`text-[#E8B84B]`) when selected, dim (`text-white/30`) otherwise.
- **Search clock SVG**: `🕐` in recent searches list replaced with an SVG clock. `handleConnect` now shows a timed red error banner ("Could not send request — try again") on Supabase failure instead of silently no-oping.
- **Email branding**: CTA button in all transactional emails (`send-email` edge function) updated from `background:#22c55e;color:#fff` (generic green) to `background:#E8B84B;color:#0D110D` (Gathr gold). Affects welcome, RSVP, connection request/accepted emails.
- **RSVP-gated address reveal**: `location_address` (full street address) on the event detail page is now hidden behind an RSVP check. Non-RSVPed, non-host viewers see the venue name (`location_name`) + "RSVP to unlock full address" in muted italic with a lock icon; the "Open →" Maps button is removed. RSVPed users and the host see the full address and the active Maps button as before. Calendar exports (Google Calendar URL and ICS download) also strip `location_address` from the `location` field for non-RSVPed/non-host users. This is a client-side gate; `location_address` is still fetched via `select('*')` — RLS-level enforcement is a future hardening step.
- **Search page UI overhaul**: "Discover" header added above the search bar (hidden after search fires); search bar gains focus-within gold glow; stale-tab bug fixed (`setActiveTab('All')` at top of `handleSearch`); iOS auto-zoom prevented on search input (16px font-size inline); category chip scroller fixed — `flex-shrink-0` + right-fade gradient overlay + thin 3px desktop scrollbar; result tabs fixed — `flex-1` inside `overflow-x-auto` replaced with `min-w-max` inner wrapper; browse category tiles converted to `category-gradient-card` + `CAT_GRADIENT` CSS variable; hardcoded trending searches removed; all three remaining emoji in search UI replaced with SVG icons.
- **Founder badge**: `✦ Gathr Founder` badge injected client-side for the founder's account via `FOUNDER_ID` constant (`lib/constants.ts`). Rendered first in the pinned badge row and Achievements list on own profile; first in the pinned row on public profile view. Exclusive darker-gold visual treatment. Does not count against the 3-badge pin limit. No DB migration — purely a client-side check.
- **iOS auto-zoom sweep (round 2)**: `fontSize:16px` added to every remaining input/textarea that lacked it — compose search (messages inbox), message input (DM thread), post textarea (communities/[id]), reply input (communities/[id]), community chat textarea (communities/[id]), communities home search input. iOS Safari zooms any input with font-size < 16px on focus.
- **Messages UI polish + emoji sweep**: all UI-chrome emoji replaced with inline SVGs across messages inbox and DM thread — compose button (`✏️` → pencil SVG), header avatar fallback (`🧑` → first initial), connections bar fallback (`🧑` → first initial), compose list fallback (`🧑` → first initial), community chat icon (`👥` → people SVG), profile-view button (`👤` → person SVG), empty-state wave (`👋` → chat bubble SVG), attachment button (`📎` → paperclip SVG). Remaining emoji (`📎` in file link text, `Hey 👋` starter suggestion) are text content, not UI chrome — intentionally kept.
- **Swipe-to-delete tip**: first-time dismissible tip banner shown above the DM thread list ("Swipe left on a conversation to mark read or delete"). Gated by `gathr_swipe_tip_seen` in `localStorage` — fires once ever, then gone.
- **Communities chip scroller**: communities home page category chips now match the search page treatment — `flex-shrink-0`, 3px desktop scrollbar, right-fade overlay, active chip gold glow shadow. Search input on communities home also gets iOS zoom fix.
- **Communities member list emoji**: `🧑` fallback in join-request list and members tab replaced with `'?'` initial fallback.
- **Search "Quick filters" label consistency**: tip card header renamed from "Smart search" → "Quick filters" to match the `⚡ Quick filters` badge on the home search bar. Both surfaces now use the same honest framing — no AI claim, no inconsistency.
- **Light-mode gradient gaps patched**: `to-[#181F18]` (search tip card gradient, `from-[#1C241C] to-[#181F18]`) and `bg-white/[0.025]` (SwipeThread unread row highlight) both lacked light-mode overrides — added to `globals.css`. Without these the tip card had a white-to-dark-green gradient on cream, and the unread row highlight was invisible in light mode.
- **Notification SVG icons**: `getTypeIcon()` (returned emoji strings) replaced with `getTypeIconSvg()` (returns 11×11 `React.ReactNode` inline SVGs). All 8 notification types have gold or mint SVG icons — no emoji, platform-consistent, theme-aware. Used in both the avatar badge overlay and the avatar fallback.
- **TierIcon glow system**: `TierIcon` in `app/profile/page.tsx` upgraded from flat solid fills to `filter: drop-shadow()` glows. Level 1–2 sprout: single mint glow. Levels 3–4 star, 5–9 bolt, 10+ crown: double gold drop-shadow for ambient intensity. All gold variants also carry an inner highlight polygon layer simulating a lit face — visually engaging, not just a clean vector shape.
- **Category emoji overlays on home feed tiles**: `CAT_EMOJI` added to `lib/constants.ts` (42 categories → emoji). On home feed event tiles that have no cover image, a centered emoji renders at 25–30% opacity as a category watermark over the dark gradient. Three tile sizes (h-20 rail, h-28 grid, h-36 featured). No emoji shown when a cover image exists.
- **DM incoming bubble border**: `border border-white/10` added to incoming message bubbles (`bg-[#1C241C]`). In light mode the bubble maps to white-on-cream = invisible without a border; `border-white/10` → `rgba(0,0,0,0.09)` gives a subtle edge.
- **Search tip card light-mode visibility**: `.search-tip-card` CSS class added to the Quick Filters hint card in `app/search/page.tsx`. `[data-theme="light"] .search-tip-card` in `globals.css` sets `rgba(232,184,75,0.09)` amber tint background + `rgba(142,110,19,0.28)` border — distinguishable from cream without being garish.
- **Swipe-delete red button light-mode fix**: `bg-[#3A1E1E]` (delete action in `SwipeThread`) had no light-mode override — dark maroon on cream. Added `[data-theme="light"] .bg-\[\#3A1E1E\]` → `#FDEAEA` pale pink.
- **Connection-request banner opacity fix**: `bg-[#1E3A1E]/30` (incoming connection banner in messages inbox) had no light-mode override — dark green at 30% on cream. Added override → `rgba(237,246,237,0.50)` light mint.
- **Messages full SVG sweep**: All remaining text-character icons in the messages inbox and DM thread replaced with SVGs — back button `←` → chevron SVG, send button `↑` → upward-arrow SVG, swipe action `✓`/`●` → mint checkmark / gold dot SVGs, compose close `✕` → SVG ×, empty-state + compose list `→` arrows → chevron-right SVGs. `SwipeThread` avatar fallback given `text-[#7EC87E] font-semibold text-sm` for consistency. Message timestamps bumped from `text-white/20` to `text-white/30` for cream legibility in light mode (`rgba(0,0,0,0.38)` vs 0.28).
- **`comm-banner` CSS variable system**: Community card banners (all locations — joined square, suggested strip, discover strip, messages-inbox community thumbnail) converted from `style={{ background: banner_gradient || 'var(--gradient-community-banner)' }}` inline style to the `category-gradient-card` pattern: `className="comm-banner"` + `style={banner_gradient ? { '--comm-bg': banner_gradient } : {}}`. In `globals.css`: `.comm-banner { background: var(--comm-bg, var(--gradient-community-banner)); }` + `[data-theme="light"] .comm-banner { background: var(--gradient-community-banner) !important; }`. This ensures all community banners (even those with a dark custom `banner_gradient` stored in the DB) show the soft mint light-mode gradient (`#D8EDD8 → #EDF6ED`) in light mode. No inline style override is possible without this class pattern.
- **Placeholder text light-mode fix**: `placeholder-white/30::placeholder` (and `/25`, `/40` variants) were invisible on white inputs in light mode — `rgba(255,255,255,0.30)` on white = 0 contrast. Added three `[data-theme="light"]` overrides in `globals.css` remapping to `rgba(0,0,0,0.30–0.45)`. Applies globally to every search input, message compose field, and filter bar across the app.
- **Hardcoded rgba stroke audit (messages + communities)**: All remaining `stroke="rgba(255,255,255,X)"` hardcoded values replaced with `stroke="currentColor" className="text-white/X"` (which has a `[data-theme="light"]` override). Affected: DM thread profile button (0.5), attachment button (0.4), mini avatar below messages, communities search icon (0.3), all people SVG fallbacks inside community banners (0.2 → 0.40–0.45, also increasing visibility). Back button class changed from `text-[#F0EDE6]/80` (no light override) to `text-white/60`. Compose icon changed from `text-[#F0EDE6]/60` (no light override) to `text-white/55`.
- **Communities page SVG + UX sweep**: Search clear `✕` → SVG ×; joined community `›` text arrow → SVG chevron; suggested community banner height `h-14` → `h-16` for more visual presence; empty-state seedling icon and all people SVG fallbacks converted to `currentColor` + CSS class strokes.
- **Contextual first-time tooltips on home feed**: `components/OnboardingTooltip.tsx` added. Three-step sequence fires on a user's first visit to each home feed surface: (1) gold ✦ create button → tooltip "Drop an event. Anyone can create.", (2) Communities tab → "Find your people.", (3) mystery match section → "Gathr shows you who's going." Each step gated by a localStorage flag (`gathr_tooltip_create`, `gathr_tooltip_groups`, `gathr_tooltip_match`) — fires once per device, never again. Replaces the retired 7-slide `/tour` as the primary feature education layer.
- **Tour retired from 7-slide to single slide**: `/tour` now shows one mystery-match primer slide (same viz as onboarding SlideMatch). The full feature walkthrough is removed; education happens via contextual tooltips instead. Settings "Take the App Tour" button still routes to `/tour` — rename/remove decision deferred.
- **BrandLoader component**: `components/BrandLoader.tsx` — breathing gold wordmark + sweep pill, replaces emoji spinner as the Suspense/auth-check loading state.
- **App-resume radar** (`components/AppResumeRadar.tsx`): A 750ms gold radar sweep animation fires whenever a logged-in user switches back to the app (tab or OS app-switch), detected via `visibilitychange`. Renders a 220px radar with the same conic sweep and 3 concentric rings as the splash screen, over a 55% dark veil. Skipped on unauthenticated pages (`/`, `/auth/*`, `/onboarding`, `/tour`). Mounted in `app/layout.tsx` alongside the existing 200ms `page-enter` transition (which fires on in-app navigation — both coexist). CSS lives in the `globals.css` resume-radar block. `prefers-reduced-motion` hides the overlay entirely.
- **Friends tab icon redesign + light-mode fix**: The home feed Friends-tab empty-state used the standard lopsided "users" icon with `stroke="rgba(255,255,255,0.25)"` — hardcoded rgba, invisible on the white `bg-[#1C241C]` card in light mode. Redesigned to a symmetric two-circle layout (both people at equal visual weight, `cx="7.5"/cx="16.5"`) with a small crossbar connector suggesting mutual connection. All three home-tab empty-state SVGs (calendar, people, bookmark) updated from hardcoded rgba to `stroke="currentColor" className="text-white/35"`, which the existing globals.css override maps to `rgba(0,0,0,0.44)` in light mode.
- **Communities empty-state icon upgrade**: The discover-section empty state (shown when no communities match the active filter, above the "Create Community" CTA) previously used an abstract seedling/plant icon (`app/communities/page.tsx`). Replaced with a proper three-person community icon — centre person (`cx="12"`) flanked by two slightly smaller figures (`cx="4.5"`, `cx="19.5"`) — conveying community formation. Container upgraded from the standard flat dark box (`w-14 h-14 bg-[#1C241C] border-white/10`) to a slightly larger `w-16 h-16` with a mint gradient ring (`linear-gradient(135deg, rgba(126,200,126,0.12), rgba(126,200,126,0.04))` + `border: rgba(126,200,126,0.18)`) as an inline style — warm and inviting directly above the CTA. Icon uses `stroke="currentColor" className="text-white/50"` (covered by globals.css → `rgba(0,0,0,0.60)` in light mode). The inline gradient reads clearly in both modes: subtle mint accent on dark, barely-there green wash on cream.
- **Community detail full light-mode + SVG audit** (`app/communities/[id]/page.tsx`): Comprehensive pass across all tabs and states — public, private, member, pending, owner/admin:
  - **Banner + info avatar** — both used inline `background: community.banner_gradient || 'var(--gradient-community-banner)'` (inline styles cannot be overridden by `[data-theme]` selectors). Converted to `comm-banner` class + `--comm-bg` CSS variable pattern, matching the approach used on the communities list. All community banners in the detail page now show the soft mint gradient in light mode regardless of the stored dark `banner_gradient`.
  - **Hardcoded rgba strokes** — `stroke="rgba(255,255,255,X)"` on the large banner SVG fallback (0.2), private-community lock icon (0.3), feed empty state (0.25), events empty state (0.25), chat members-only gate icon (0.3), and chat empty state (0.25) — all converted to `stroke="currentColor" className="text-white/X"` (covered by globals.css light-mode overrides).
  - **Text character icons swept** — back button `←` → SVG chevron-left; share button `↑` → SVG upload icon; share-copied confirmation `✓` → SVG checkmark; image clear `✕` → SVG ×; comment send `↑` → SVG arrow-up; chat send `↑` → SVG arrow-up; pending request `⏳` → SVG clock.
  - **Comment author name** — `text-[#F0EDE6]/80` has no `[data-theme="light"]` override (only `/70` is covered) — the name was cream-on-white = invisible. Changed to `text-[#F0EDE6]` (solid, covered).
  - **Feed empty state icon** — replaced the abstract "antenna/wave" SVG with a chat bubble SVG, matching the chat tab's visual language and more clearly conveying "no posts yet."
  - **Pending request CTA** — `⏳ Request Sent — Tap to Cancel` button refactored to use `flex items-center justify-center gap-2` layout with a proper SVG clock icon prepended.
- **Communities list "Add" button** (`app/communities/page.tsx`): The "Add →" text in the personalisation prompt card replaced the `→` text character with an SVG chevron-right, consistent with the rest of the app's icon system.
- **`bg-white/5` hairline divider** — `globals.css` now includes `[data-theme="light"] .bg-white\/5 { background-color: rgba(0,0,0,0.06) !important; }`. The `flex-1 h-px bg-white/5` separator in the "Suggested for you" section header was invisible on the cream page background (rgba(255,255,255,0.05) on white = zero contrast). The override maps it to a faint dark line visible on cream. Light mode override count: ~156+.
- **Signup broken by `dispatch_email` body type mismatch** — new user signups returned "Database error saving new user". Root cause: `dispatch_email(payload jsonb)` called `net.http_post(body := payload::text)` but `pg_net`'s `http_post` function expects `body jsonb` — the `::text` cast produced a type mismatch (SQLSTATE 42883), which aborted the entire signup transaction (profile INSERT + `auth.users` row). Fix: `body := payload` (already jsonb, no cast needed). Also added `EXCEPTION WHEN OTHERS THEN raise log ...` so any future pg_net or Resend failure is logged and silently swallowed — email sending can never abort a signup. Applied directly to production via migration `20260513000000_fix_dispatch_email_pg_net_signature.sql`.
- **Image crop/zoom on all upload points** (`components/ImageCropModal.tsx`): Added `react-easy-crop`-powered crop modal that appears after file selection on all four image upload points — profile photo (setup + profile edit, 1:1 circular crop), community banner (create + settings, 16:9), and event cover (create + edit, 16:9). The modal shows a gold-bordered crop frame, a zoom slider, and "Cancel" / "Use photo" buttons. Pinch-to-zoom works on mobile. The cropped result is drawn to a canvas via `drawImage`, converted to a Blob, and wrapped in a new `File` object — the existing upload code is unchanged downstream. `react-easy-crop` v5.5.7 added to `package.json`.
- **First name / Last name split in setup and profile edit**: The single "Your name" / "Display name" input replaced with side-by-side "First name" and "Last name" inputs in both `app/setup/page.tsx` (step 0) and `app/profile/edit/page.tsx`. Values are concatenated as `"First Last"` on save to the existing `profiles.name` column — no DB migration. On load, `name` is split at the first space back into two fields. `autoCapitalize="words"` applied to both inputs. Save button requires at least a non-empty first name.
- **Setup onboarding resumption**: `app/setup/page.tsx` now fetches all 7 profile fields on mount (previously only `name` and `city`). If `name` is already set, the page jumps to step 2 (interests — always the missing piece), prefills all state from the DB, and shows a gold "Welcome back, [first name]" banner with avatar preview. Fresh users see the normal step 0 flow unchanged. The progress bar naturally fills to the resumed position, giving a strong visual signal of partial completion.
- **RSVP join error fixed** (DB migration): `guard_profile_protected_columns_trg` was blocking every RSVP insert — the `update_attended_count` SECURITY DEFINER trigger called `UPDATE profiles SET attended_count = ...` but `auth.role()` in that context was `'authenticated'` (not `'service_role'`), so the guard raised an exception that aborted the RSVP INSERT. Fix: count triggers set `app.internal_update = 'true'` (transaction-local via `set_config`) before their UPDATE; the guard now checks this flag and allows the change. Same fix applied to `update_hosted_count`.
- **Delete-account cascade fixed** (DB migration): When `auth.admin.deleteUser()` cascades, `rsvps`/`events` are deleted which fires the count triggers. Those triggers then attempted `UPDATE profiles SET ...` on an already-deleted profile row, triggering the guard. Fix: both count triggers now check `NOT EXISTS (SELECT 1 FROM profiles WHERE id = OLD.user_id)` before the UPDATE on DELETE operations — if the profile is already gone, they return NULL immediately. All child data (rsvps, events, community_members, connections, messages, waves, notifications, bookmarks, comments, invites) is still removed via FK CASCADE.
- **`communities` relation error fixed** (DB migration): `update_community_member_count` trigger function was missing `SET search_path TO 'public'`. In cron/service contexts the default search path doesn't include `public`, causing "relation communities does not exist". Added `SET search_path TO 'public'` to the function definition.
- **Leave community confirmation**: `handleLeave` in `app/communities/[id]/page.tsx` previously fired the delete immediately. Now sets `showLeaveConfirm(true)` and renders a bottom sheet ("Leave this community?" / "Yes, Leave Community" / "Stay") matching the cancel-RSVP sheet pattern.
- **RSVP error toast**: `handleRsvp` in `app/events/[id]/page.tsx` silently rolled back on failure with no user feedback. Now shows a 4-second red error banner above the RSVP CTA button. Duplicate RSVP (code 23505) gets a specific message; other failures get a generic retry message.
- **Setup name validation**: The "Continue →" button on step 0 (photo/name) now validates that `firstName.trim()` is non-empty before advancing. Shows an inline red error + red border on the First name field if blank. The field clears the error as the user types.
- **Setup avatar upload failure feedback**: If the storage upload fails in `handleFinish`, the profile saves without a photo and shows a non-blocking warning ("Photo didn't upload — profile saved. Try adding it later in Settings."), then auto-navigates to `/home` after 2.5 s so the user isn't stranded.
- **Profile "Going" tab shows full RSVP history**: The attended events query in `app/profile/[id]/page.tsx` previously filtered `.gte('start_datetime', now)` — past events vanished silently once they ended. Filter removed; events now sorted most-recent first. Upcoming RSVPs show a green "Going" badge; past events show a muted "Attended" badge. Empty state updated from "No upcoming events" to "No events yet".
- **Avatar initials fallback**: `🧑` emoji replaced with initials in `app/profile/[id]/page.tsx` — the main profile avatar shows up to 2 initials (first letters of first + last name) in gold on dark green (`bg-[#2A4A2A]`); mutual-connection thumbnails show 1 initial. Consistent with the emoji-sweep done across messages and communities in prior sessions.
- **Community browse join error feedback**: `handleJoin` in `app/communities/page.tsx` had no error path — a failed insert simply reset the button silently. Now shows a dismissing red toast banner ("Could not join — please try again.") for 3.5 s on failure.
- **Paid ticket gate** (`app/events/[id]/page.tsx`): `handleRsvp()` was silently inserting an RSVP row even for events with `ticket_type === 'paid'`. Fixed by intercepting before the Supabase insert: if `event.ticket_type === 'paid'`, set `showPaidGate(true)` and return. A bottom sheet renders with "Paid tickets coming soon" and a "Join the Waitlist →" button (links to a Google Form). No DB changes required — `ticket_type` was already stored correctly.
- **Event detail edit-tab style fix** (`app/events/[id]/page.tsx`): The edit button (pencil icon on the event hero) had a gold pill background (`bg-[#E8B84B]/20 border-[#E8B84B]/30`) that differed from the share and bookmark pills. Aligned to the same style: `bg-[#0D110D]/70 border border-white/15 rounded-xl`. Icon stroke kept at `rgba(232,184,75,0.85)` for gold accent.
- **Add-to-Calendar button and modal redesign** (`app/events/[id]/page.tsx`): The inline "+ Calendar" text button replaced with a pill matching brand pattern — calendar SVG icon + "Save" label, `bg-[#E8B84B]/10 border border-[#E8B84B]/30 rounded-xl`. The calendar modal header upgraded to a gold-tinted bar with a calendar SVG; Google Calendar option shows a gradient icon (`#4285F4 → #34A853`); Apple/ICS option shows a dark gradient icon (`#555 → #1C1C1E`); each row has a chevron-right arrow.
- **React hooks violation — Sentry "Rendered more hooks than during the previous render"** (`app/profile/[id]/page.tsx`): `const [showAvatarExpanded, setShowAvatarExpanded] = useState(false)` was declared at line ~153, after two early returns (`if (loading) return <PublicProfileSkeleton />` and `if (!profile) return null`). First render with `loading = true` skips the hook; second render with data hits it — React hook count mismatch → crash. Fix: moved the declaration to the top of the component with all other state declarations (before any early returns). Also removed the duplicate declaration that remained in the original position.
- **Public profile bottom padding** (`app/profile/[id]/page.tsx`): `pb-32` (128px) was insufficient to clear the fixed Message/Connect action bar (~176px from bottom). Changed to `pb-56` (224px).
- **Avatar lightbox — profile pic expand on tap**: Both own profile (`app/profile/page.tsx`) and public profile (`app/profile/[id]/page.tsx`) now support tapping the avatar to expand it full-screen. Avatar wrapped in a `<button onClick={() => setShowAvatarExpanded(true)}>`. Lightbox overlay: `fixed inset-0 z-50 bg-black/90`, centred `<img>` with `object-contain`, × close button top-right.
- **Achievement first-visit silent baseline removed** (`app/profile/page.tsx`): The `seenRaw` check was silently baselining all unlocked achievements on a user's first profile visit — users who'd already joined communities or RSVPed before visiting their profile never saw the unlock pop-up. Fix: if `seenRaw` is null (first visit), check for already-unlocked achievements and celebrate them immediately instead of suppressing. Only if there are no unlocked achievements on first visit does it write an empty `[]` to localStorage.
- **Founder badge premium CSS classes** (`app/globals.css`): Three new CSS classes — `.founder-badge-pill`, `.founder-badge-card`, `.founder-badge-icon` — with multi-layer `box-shadow` (outer gold glow, soft halo, inset highlight) and dark-gold gradient backgrounds. `[data-theme="light"]` overrides use cream-gold gradients with deep gold borders. Applied in `app/profile/page.tsx` and `app/profile/[id]/page.tsx` to the founder badge elements.
- **Contextual first-use tips — full set of 5** (localStorage-gated dismissible banners): All 5 tips are now live across the app. Each fires at most once per device, dismissed with an × that sets a localStorage key.
  1. **Host dashboard** (`app/host/page.tsx`): "Tap the Events tab to see live RSVPs — tap View on any event to manage attendees" — shown in the overview tab when `events.length > 0`. Key: `gathr_host_tip_seen`.
  2. **Event detail mystery match teaser** (`app/events/[id]/page.tsx`): "RSVP to unlock your match count — see how many people share your vibe" — no localStorage; purely conditional on `!rsvped && !isHost && upcoming && matches.length === 0`. Disappears automatically on RSVP.
  3. **Profile achievements tab** (`app/profile/page.tsx`): "Pin up to 3 badges to your public profile — they'll show under your name" — fires on first switch to the achievements tab (`activeTab === 2`). Key: `gathr_badge_tip_seen`.
  4. **DM thread** (`app/messages/[id]/page.tsx`): "Long-press any of your messages to unsend it from both sides" — shown at the top of the message scroll area on first open. Key: `gathr_unsend_tip_seen`.
  5. **Community feed** (`app/communities/[id]/page.tsx`): "This community has a live group chat — tap Chat to join the conversation" — shown to members only in the Feed tab; localStorage check fires in `fetchCommunity` after `isMember` is set. Key: `gathr_community_chat_tip_seen`.
- **Leaflet map tiles not rendering** (`components/MapView.tsx`, `app/layout.tsx`): Map showed event pins but the tile layer was a solid dark blob. Root cause: `import 'leaflet/dist/leaflet.css'` was inside `MapView.tsx`, which is loaded via `dynamic(..., { ssr: false })`. Next.js cannot guarantee that CSS from a dynamically imported chunk is flushed before the component mounts — so `.leaflet-tile-pane` styles never applied and tile images had no container layout. Markers still appeared because they are absolute-positioned DOM elements whose styles come from the inline `divIcon` HTML, not the tile CSS. Fix: moved the CSS import to `app/layout.tsx` (always in the critical bundle). Also removed the `{r}` retina placeholder from the CARTO tile URL (simplified to the standard non-retina path), added explicit `subdomains="abcd"` and `maxZoom={19}` to the `<TileLayer>`.
- **Notifications: robust connection accept + error feedback** (`app/notifications/page.tsx`): `handleAcceptConnection` now uses `.select()` + `.eq('status','pending')` on the UPDATE so 0-row updates (request already withdrawn or accepted elsewhere) are detected rather than silently treated as success. Shows a red `actionError` message below the buttons when the request is no longer pending or a DB error occurs. `hydrateConnectionStatuses` made defensive — if the connections SELECT query fails or returns null, all buttons remain visible (no false `_resolved` from a query error). Guard added for null `actor_id` notifications.
- **Notifications: connection accept persistence + individual read toggle** (`app/notifications/page.tsx`): Two fixes. (1) `hydrateConnectionStatuses()` — on page load, batch-queries `connections` for all `connection_request` notification actor IDs and pre-sets `_accepted` / `_resolved` flags so Accept/Decline buttons correctly reflect DB state after a refresh (previously the in-memory `_accepted` flag reset on every reload, re-showing buttons for already-accepted requests). `_resolved` covers the case where the requester withdrew before the addressee acted — shows "Request no longer pending" instead of stale buttons. (2) Individual read/unread toggle — the left-side dot on every notification row is now a button (20×24px touch target): gold dot = unread (tap → `markRead`), faint white dot = read (tap → `markUnread`). The "Mark all read" header button remains unchanged.
- **Connection request notification dedup** (`app/profile/[id]/page.tsx`, migration `20260514000000_fix_connection_request_dedup.sql`): Repeatedly connecting → withdrawing → reconnecting generated a fresh email and push notification every cycle, and the in-app notification row was orphaned on withdrawal (stayed visible as actionable even after the request was taken back). Two-part fix: (1) On withdrawal, the client now calls `UPDATE notifications SET read=true WHERE user_id=profileId AND actor_id=user.id AND type='connection_request'` — the row persists for dedup purposes but is no longer actionable in the notification centre. (2) The `trigger_connection_request_email` Postgres function was updated (applied via migration) to skip sending if a `connection_request` notification for this requester→addressee pair already exists and was created more than 1 minute ago (the 1-minute guard avoids a within-transaction race with the push-notification trigger). Net result: each pair of users receives at most one connection-request email regardless of how many reconnect cycles occur.

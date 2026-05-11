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
├── tour/                 7-slide feature walkthrough (after setup)
├── home/                 Main feed (events + communities tabs)
├── events/[id]/          Event detail — RSVP, matches, comments, waves, calendar export
├── create/               Multi-step event creation form (with auto-save draft)
├── host/                 Host dashboard — manage your own events, RSVPs
├── communities/          Community discovery + joined communities list
├── communities/[id]/     Community detail — posts, chat, members, pending requests
├── search/               Universal search — events, communities, people
├── map/                  Map view of events as Leaflet pins
├── messages/             DM inbox + pending connection requests
├── messages/[id]/        DM thread — realtime chat with typing indicators
├── notifications/        Notification centre — mark read, navigate to source
├── bookmarks/            Saved events
├── profile/              Own profile — bio, stats, XP, badges, achievements
├── profile/[id]/         Public profile — other users
├── settings/             Account settings, privacy toggles, theme, password, delete account
├── gathr-plus/           Gathr+ upgrade page
├── privacy/              Privacy Policy
├── terms/                Terms of Service
└── waitlist/             Waitlist signup (for pre-launch)
```

**Public routes** (no auth required): `/`, `/onboarding`, `/auth`, `/tour`, `/privacy`, `/terms`, `/waitlist`. Every other route is protected by the middleware.

---

## Authentication & Middleware

The middleware (`middleware.ts`) runs on every request via Next.js Edge Runtime. It uses `createServerClient` from `@supabase/ssr` (which reads cookies from the request) to check for a valid Supabase session. If there's no session and the route isn't public, it redirects to `/auth`.

**Why `@supabase/ssr` instead of `@supabase/supabase-js` directly?** The SSR package handles the cookie-based session automatically — it reads and writes the Supabase auth token from `request.cookies`, which is what Next.js middleware needs. The browser client (`lib/supabase.ts`) uses the same package's `createBrowserClient` which manages the token in browser cookies instead.

Auth flow:
1. User hits `/onboarding` → `/auth` → signs in or creates account
2. On first sign-in, a trigger on `auth.users` creates a `profiles` row automatically
3. After auth, if their profile has no `name`, they're redirected to `/setup`
4. After setup, they hit the `/tour`, then `/home`

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
| `event_drafts` | Auto-saved event-creation draft. One row per user, upserted on every form change. Cleared on successful publish. |
| `friendships` | Legacy/reserved table (not currently used in UI) |

### Key Column Details on `profiles`

User-writable:
- `name`, `avatar_url`, `bio_social`, `bio_professional`, `title_professional`, `org_professional`, `links`, `city`, `interests` (array, capped at 10), `profile_mode` ('social' / 'professional' / 'both'), `rsvp_visibility` ('public' / 'connections' / 'private'), `is_discoverable`, `matching_enabled`, `pinned_badges` (up to 3 badge titles user pins to their public profile)

**System-managed** (locked down by `guard_profile_protected_columns_trg` — user UPDATE attempts on these columns RAISE an exception; only service-role inside edge functions can write):
- `hosted_count`, `attended_count` (maintained by DB triggers on events/rsvps)
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
| `trigger_update_attended_count` | rsvps INSERT/DELETE | Updates `profiles.attended_count` |
| `trigger_update_hosted_count` | events INSERT/DELETE | Updates `profiles.hosted_count` |
| `post_like_count_trigger` | community_post_likes INSERT/DELETE | Updates `community_posts.like_count` |
| `community_member_count_trigger` | community_members INSERT/UPDATE/DELETE | Updates `communities.member_count` (INSERT→+1, DELETE→-1, UPDATE pending→member →+1) |
| `rsvp_notification_trigger` | rsvps INSERT | Notifies event host: "X is going to your event" |
| `message_notification_trigger` | messages INSERT | Notifies recipient of new DM |
| `connection_request_notification_trigger` | connections INSERT | Notifies addressee of connection request |
| `on_connection_accepted_notify` | connections UPDATE (status→accepted) | Notifies requester that request was accepted |
| `notify_on_event_comment` | event_comments INSERT | Notifies event host of new comment |
| `rate_limit_waves` | waves BEFORE INSERT | Blocks if user sent >30 waves in last hour |
| `rate_limit_community_posts` | community_posts BEFORE INSERT | Blocks if user posted >20 posts in last hour |
| `rate_limit_community_chat` | community_chat_messages BEFORE INSERT | Blocks if user sent >100 chat messages in last hour |
| `rate_limit_messages` | messages BEFORE INSERT | Blocks if user sent >200 DMs in last hour |
| `community_post_comment_count_trigger` | community_post_comments INSERT/DELETE | Maintains `community_posts.comment_count` (replaces fetching all comments to count them on every load) |
| `guard_profile_protected_columns_trg` | profiles BEFORE UPDATE | Rejects user writes to billing (`gathr_plus_*`), safety (`safety_*`, `review_count`), and trigger-maintained counts (`hosted_count`, `attended_count`). Service-role bypasses |
| `on_auth_user_created` | auth.users INSERT | Auto-creates a `profiles` row from `raw_user_meta_data` (name, city, avatar). Eliminates orphan-profile risk when email confirmation is pending |

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
- `events (visibility, start_datetime)` — public-event filter + sort
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

**Web push** (`push_subscriptions` table, VAPID protocol) is also wired up via `ServiceWorkerRegistrar` and `usePushNotifications` hook — for native push notifications when the app is not open.

The notifications page shows all notifications, marks them read on view, and navigates to the `link` when tapped.

---

## Realtime

Supabase Realtime uses `postgres_changes` subscriptions — it watches the Postgres WAL (Write-Ahead Log) and pushes change events to subscribed clients over a WebSocket.

**Used on:**
- `messages/[id]/page.tsx` — DM chat: subscribes to INSERT and DELETE on `messages` filtered by `thread_id`. New messages append in real time; unsent messages are removed in real time for both parties.
- `communities/[id]/page.tsx` — Community chat: subscribes to INSERT and DELETE on `community_chat_messages` filtered by `community_id` (DELETE fires when a moderator removes a message)
- `home/page.tsx` — subscribes to INSERT on `events` **filtered by `city=eq.${profile.city}`** (only new public events in the user's selected city are pushed) and UPDATE on `events` (spots_left changes propagate to feed cards instantly). The channel is set up in a dedicated `useEffect` dependent on `user.id` and `profile.city` — it automatically reconnects with the updated city filter when the user switches cities
- `events/[id]/page.tsx` — subscribes to INSERT and DELETE on `rsvps` filtered by `event_id`, keeping attendee list and spots_left live
- `notifications/page.tsx` — subscribes to INSERT on `notifications` filtered by `user_id`, so new notifications appear without a refresh
- `host/page.tsx` — subscribes to INSERT and DELETE on `rsvps` so RSVP counts on the host dashboard update as people join/leave events. **The subscription has no server-side filter** (Postgres CHANGES filters don't support `event_id IN (…)`), so it filters client-side via `eventIdsRef: Set<string>` — payloads for events not owned by the current host are dropped before mutating state. Without this filter, every host got every other host's RSVPs over the WebSocket

**DM inbox (delete conversation):** The DM inbox (`messages/page.tsx`) includes a `SwipeThread` component — swipe left on a thread to reveal two action buttons: Mark Read/Unread and Delete. Deletion hides the thread from the user's list; the underlying messages are preserved for the other party. Hidden thread IDs are stored in the `hidden_threads` table (RLS-protected, `user_id` + `thread_id` primary key) and loaded on mount via `fetchData`, so threads stay hidden across devices and sessions.

**DM thread (unsend message):** Long-press (mobile) or right-click (desktop) any message you sent to reveal the Unsend sheet. Tapping Unsend deletes the message row from the database (guarded by `.eq('sender_id', user.id)` on the client in addition to RLS). If the message contained an image or file attachment, the storage object in the `chat-attachments` bucket is also deleted so the URL is fully invalidated. The realtime DELETE subscription propagates the removal to the recipient's screen immediately. If the DB delete fails, the message is restored in the local state.

**Typing indicators** in DMs use Supabase **Presence** (not postgres_changes). Presence is a ephemeral pub/sub channel — each user broadcasts a `{ typing: true/false }` state, and others see it in real time via the `sync` event. It doesn't touch the database at all.

---

## Edge Functions

Supabase Edge Functions run on Deno, server-side, close to the database. Five functions are deployed. All read `APP_ORIGIN` env var for `Access-Control-Allow-Origin` (defaults to wildcard if unset — set this to your production domain when you deploy).

**`delete-account`**:
- Called from Settings → Danger Zone (Type "DELETE" confirmation required client-side)
- Verifies the caller's identity via `auth.getUser()` using the bearer token
- Uses a service-role admin client to call `auth.admin.deleteUser(userId)` — this cascades to all linked data via FK constraints
- Returns `{ success: true }` on success; the client then calls `supabase.auth.signOut()` and redirects to `/auth`

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

**`geocode-event`** (JWT-verified, **new**):
- Replaces all in-browser Nominatim calls (browsers can't set a proper User-Agent; in-browser geocoding violated Nominatim ToS and could get user IPs rate-limited or banned)
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

**`send-push`**:
- Sends a Web Push notification to a specific user's subscribed devices
- Looks up rows in `push_subscriptions` for the recipient, then POSTs each endpoint with the VAPID-signed payload
- Triggered server-side from `pg_net` calls or scheduled jobs — not directly called from the client

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
- `globals.css` has ~80 overrides scoped to `[data-theme="light"]` that remap every Tailwind color class to a light palette
- **Inline style gradients** (which can't be overridden by Tailwind class selectors) are all extracted into CSS variables — e.g. `var(--gradient-event-hero)` — with light mode values defined in `[data-theme="light"]` in globals.css
- Category gradient cards use a `category-gradient-card` class that gets `!important` overridden in light mode

**Dark palette:** `#0D110D` (page bg), `#1C241C` (card bg), `#F0EDE6` (primary text), `#E8B84B` (gold accent), `#7EC87E` (green accent)

**Light palette:** `#F4F0E8` (warm cream page bg), `#FFFFFF` (card bg), `#18180E` (dark text), `#E8B84B` (gold — stays the same), `#D8EDD8` / `#EDF6ED` (light greens)

---

## Rate Limiting

Server-enforced via Postgres BEFORE INSERT triggers. When a user tries to insert a row (send a wave, post in a community, send a DM), the trigger:
1. Counts rows in `rate_limit_events` for that user + action in the past hour
2. If over the limit, throws `RAISE EXCEPTION 'rate_limit_exceeded'` — the INSERT is aborted, the client gets an error
3. If under the limit, writes a new row to `rate_limit_events` and allows the INSERT to proceed

Limits: waves 30/hr, community posts 20/hr, community chat 100/hr, DMs 200/hr.

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

**Drafts are only auto-deleted on successful event publish.** They are never deleted by navigation (back button, switching tabs, etc.). The user must either publish the event or explicitly delete the draft.

**Resume Draft shortcut:** The Profile page Events tab shows a highlighted "Resume creating your event" banner card when a draft exists in `event_drafts`. Tapping it navigates to `/create` where the draft is auto-loaded.

**Community event linking:** When the create page is opened with `?community=[uuid]`, the UUID is validated against a regex, stored in `fromCommunityId` state, and included as `community_id` in the event insert. After publish, the user is redirected to `/communities/[id]?tab=events` instead of the event detail page.

**Geocoding feedback:** While the Nominatim lookup runs after the user blurs the address field, the field shows a pulsing "Looking up location…" indicator. On success it shows a green "✓ Location confirmed". The Next step button is disabled and shows "Looking up location…" while geocoding is in flight.

**Ticket price validation:** Before inserting a paid event, the client validates that `ticketPrice` parses to a positive finite number between `$0.01` and `$10,000`. The check uses `isFinite(price) && price > 0 && price <= 10000` — non-numeric input, zero, negatives, and values above the cap all surface a clear error message and block the insert.

---

## Settings — Key Behaviours

**Back navigation:** Settings (`/settings`) and Notifications (`/notifications`) both have a `←` back button using `router.back()`. Settings is accessed from the profile page's sliders icon; Notifications from the home page's bell icon. Both return the user to exactly where they came from.

**Password change:** Minimum 12 characters, enforced both client-side (button disabled + strength meter) and server-side (Supabase Auth rejects weak passwords). A 4-bar strength meter updates in real time scoring: length ≥ 8, length ≥ 12, case mix, number + symbol mix. The Update Password button stays disabled until length ≥ 12 and both fields match — so users can't submit a password that will be rejected.

**City change (home feed):** Selecting a new city updates `profiles.city`, shows a 2.5-second pill toast, and immediately re-fetches events from the server for the new city. The local event cache is not reused — a fresh query runs so the full pool for the new city loads. The city picker search input no longer auto-focuses on open (keyboard no longer jumps immediately). Supported cities are scoped to PNW, BC, and West Coast US (17 cities in `ALL_CITIES`); the full coordinate lookup table (`CITIES`) covers all of these so `getCityCoords()` never falls back to the default.

**RSVP confirmation:** Tapping "Cancel RSVP" on an event you've already joined opens a confirmation bottom sheet before releasing the spot — accidental taps cannot cancel unintentionally. The actual delete only fires after the user confirms "Yes, Cancel RSVP."

**RSVP confetti:** A confetti burst fires immediately on a successful first-join RSVP, using `canvas-confetti` with gold/cream/green particles (`#E8B84B`, `#F0EDE6`, `#7EC87E`).

**Home feed tab persistence:** The active home tab (Trending / For You / Near Me / Friends / Mine) is saved to `sessionStorage` under `gathr_home_tab` and restored on every mount, so navigating to an event and back doesn't reset the user to the Trending tab.

**Profile edit guards:** Save button is disabled while name is blank. Avatar upload failure surfaces a specific error message ("Photo upload failed — your other changes were saved") rather than silently keeping the old photo. Interest search clear re-focuses the input so the user keeps typing without tapping.

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

**Haptics:** `components/BottomNav.tsx` calls `navigator.vibrate?.(8)` on every tab switch and `(12)` on the central + button. Silent on devices without vibration support (e.g. desktop); no impact on non-touch browsers.

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
| Weak password accepted | Client disables submit until ≥ 12 chars + passwords match; Supabase Auth enforces server-side |
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
| Orphan profile rows from unconfirmed email signups | `handle_new_auth_user` trigger creates the profile only when `auth.users` row commits; client-side profile upserts removed from signup + OAuth callback |
| ILIKE search with leading wildcards forced sequential scans | `pg_trgm` extension + GIN indexes on title/name/description columns; same query now uses index lookups |
| `community_post_comments` count required fetching every row on every load | `community_posts.comment_count` column maintained by `community_post_comment_count_trigger` — page reads the count directly |
| Push permission auto-requested on first page load (browser penalty + low opt-in) | `usePushNotifications` exposes explicit `enable()` / `disable()` actions; Settings has a toggle that requests permission only when user taps it |
| Account deletion possible from a single mis-tap | Delete dialog requires typing the literal string `DELETE` — submit button stays disabled otherwise |

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
| Category emoji map | `lib/categoryEmoji.ts` |
| Category gradient map | `app/home/page.tsx` (CAT_GRADIENT constant) |
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
| Analytics (PostHog) provider + `track()` helper | `components/AnalyticsProvider.tsx` |
| Sentry server + edge init | `instrumentation.ts` |
| Sentry browser init | `instrumentation-client.ts` |
| Edge: after-event matches | Supabase Edge Function: `after-event-matches` |
| Edge: claim Gathr+ trial | Supabase Edge Function: `claim-gathr-plus-trial` |
| Edge: claim level-milestone trial | Supabase Edge Function: `claim-level-trial` |
| Edge: server-side geocoding | Supabase Edge Function: `geocode-event` |
| Edge: account deletion | Supabase Edge Function: `delete-account` |
| Edge: web push send | Supabase Edge Function: `send-push` |
| RPC: atomic community create | Postgres function: `create_community` |
| RPC: atomic community delete | Postgres function: `delete_community` |
| Privacy Policy | `app/privacy/page.tsx` |
| Terms of Service | `app/terms/page.tsx` |
| Feature tour | `app/tour/page.tsx` |

---

## Deployment Setup Checklist

Before a public launch:

**Supabase Edge Function secrets** (set under Project Settings → Edge Functions → Secrets):
- `APP_ORIGIN` — set to your production app origin, e.g. `https://gathr.app`. Without this, edge functions return `Access-Control-Allow-Origin: *` and accept calls from any website.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — automatically populated by Supabase.

**Frontend env vars** (`.env.local` or Vercel project settings):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — required for web push notifications. **A keypair was generated for this project; the public key is the one users see in client JS, the private key goes into the Supabase Edge Function secret named `VAPID_PRIVATE_KEY`.** Generate a fresh pair via `npx web-push generate-vapid-keys` if you ever rotate. Without these the Settings → Push Notifications toggle stays inactive.
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry browser + server runtime DSN. Get from Sentry → Project → Client Keys (DSN). Without this Sentry init is a no-op (safe to ship without).
- `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` — build-time source-map upload to Sentry. Without these Sentry still captures errors, but stack traces will be minified.
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key. Without this `track()` calls are no-ops.
- `NEXT_PUBLIC_POSTHOG_HOST` — optional; defaults to `https://us.i.posthog.com`. Set to `https://eu.i.posthog.com` if your PostHog project is in the EU region.

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

**Observability** (wired, awaiting credentials):
- **Sentry** (`@sentry/nextjs`) is installed. Server + edge init lives in `instrumentation.ts`; browser init in `instrumentation-client.ts`. `next.config.ts` is wrapped with `withSentryConfig` (only activates when `SENTRY_AUTH_TOKEN` is present, so dev builds without Sentry credentials still work). `components/ErrorBoundary.tsx` forwards every caught error to `Sentry.captureException` with the React component stack as context.
  - Required env vars: `NEXT_PUBLIC_SENTRY_DSN` (browser + server runtimes), `SENTRY_AUTH_TOKEN` (build-time source-map upload), `SENTRY_ORG`, `SENTRY_PROJECT`.
  - 10% trace sampling by default; replay on errors only (1.0), with `maskAllText` + `blockAllMedia` enabled for PII safety. Pings tunnel through `/monitoring` so adblockers don't strip them.
- **PostHog** (`posthog-js`) is installed via `components/AnalyticsProvider.tsx` mounted in the root layout. It auto-identifies users on `SIGNED_IN`, resets on `SIGNED_OUT`, and captures manual `$pageview` events on every App Router transition.
  - Required env vars: `NEXT_PUBLIC_POSTHOG_KEY`, optionally `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`).
  - `autocapture` is **disabled** by design — we send purposeful events via the exported `track(event, properties)` helper. Currently instrumented: `signup_completed`, `signup_started`, `event_created`, `event_rsvp_joined`, `event_rsvp_cancelled`, `gathr_plus_trial_claimed`, `community_joined`, `community_join_requested`. Add more in `track()` calls as features ship.
  - `person_profiles: 'identified_only'` so anonymous users don't bloat your person table.

---

## Recent Schema / Behaviour Changes (Audit Cycle)

Tracking the major changes from the most recent audit pass so future code review has a single anchor:

- **XP/Level math**: now uses `profile.hosted_count` / `profile.attended_count` instead of fetched-array lengths (which were capped at 50 / 200).
- **Host realtime**: subscription stays global (Postgres CHANGES doesn't support `IN ()`) but filters via `eventIdsRef` on the client.
- **Map page**: only queries events with non-null coords; no in-browser geocoding (server-side `geocode-event` runs on event create/edit).
- **Leaflet markers**: removed broken default-icon merge (unpkg CDN not in CSP). All pins use `divIcon`.
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

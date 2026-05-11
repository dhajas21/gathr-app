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
| `community_posts` | Posts inside a community. Text (nullable — image-only posts allowed), image_url, like_count |
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

- `pub_tier` (text) — achievement tier: Newcomer / Regular / Veteran / Legend (computed server-side and cached here)
- `pub_badges` (text[]) — array of earned badge titles shown on public profile
- `pinned_badges` (text[]) — up to 3 badge titles the user has pinned to their own profile view

> **Note:** XP and level are **not stored** in the database. They are computed on the client from `hosted_count`, `attended_count`, connection count, and interest count: `xp = hosted×10 + attended×5 + connections×3 + interests×2`, `level = floor(xp/50)+1`.
- `safety_score` (float) — 0–100, average of all post-event reviews
- `safety_tier` (text) — New / Verified / Trusted / Flagged
- `gathr_plus` (bool) — paid subscriber
- `gathr_plus_expires_at` (timestamptz) — milestone preview expiry (null if full subscriber)
- `matching_enabled` (bool) — whether they appear in match lists
- `discoverable` (bool) — whether they appear in search/people
- `profile_mode` (text) — 'social' / 'professional' / 'both' — controls what's visible on public profile
- `attended_count` (int) — maintained by DB trigger
- `hosted_count` (int) — maintained by DB trigger

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

Rate limiting works by writing to `rate_limit_events` and counting recent rows. If over the limit, the trigger runs `RAISE EXCEPTION 'rate_limit_exceeded'` which aborts the INSERT and surfaces as an error on the client.

All trigger functions are `SECURITY DEFINER` — they run with the permissions of the function owner (not the calling user), which lets them write to system tables like `rate_limit_events` that users can't write to directly.

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

**Subscription status** is stored on `profiles.gathr_plus` (bool). A time-limited preview is stored as `profiles.gathr_plus_expires_at`. The client treats the user as Gathr+ if `gathr_plus === true` OR if `gathr_plus_expires_at` is in the future.

The `gathr-plus/page.tsx` is the upgrade page. Actual billing is handled via the device's app store or payment provider — Gathr never stores card details.

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
- `messages/[id]/page.tsx` — DM chat: subscribes to INSERT on `messages` filtered by `thread_id`. New messages append in real time.
- `communities/[id]/page.tsx` — Community chat: subscribes to INSERT and DELETE on `community_chat_messages` filtered by `community_id` (DELETE fires when a moderator removes a message)
- `home/page.tsx` — subscribes to INSERT on `events` (new events added to feed) and UPDATE on `events` (spots_left changes propagate to feed cards instantly)
- `events/[id]/page.tsx` — subscribes to INSERT and DELETE on `rsvps` filtered by `event_id`, keeping attendee list and spots_left live
- `notifications/page.tsx` — subscribes to INSERT on `notifications` filtered by `user_id`, so new notifications appear without a refresh
- `host/page.tsx` — subscribes to INSERT and DELETE on `rsvps` so RSVP counts on the host dashboard update as people join/leave events

**DM inbox (delete conversation):** The DM inbox (`messages/page.tsx`) includes a `SwipeThread` component — swipe left on a thread to reveal two action buttons: Mark Read/Unread and Delete. Deletion hides the thread from the user's list; the underlying messages are preserved for the other party. Hidden thread IDs are stored in the `hidden_threads` table (RLS-protected, `user_id` + `thread_id` primary key) and loaded on mount via `fetchData`, so threads stay hidden across devices and sessions.

**Typing indicators** in DMs use Supabase **Presence** (not postgres_changes). Presence is a ephemeral pub/sub channel — each user broadcasts a `{ typing: true/false }` state, and others see it in real time via the `sync` event. It doesn't touch the database at all.

---

## Edge Functions

Supabase Edge Functions run on Deno, serverside, close to the database. Three functions are deployed:

**`delete-account`** (JWT not pre-verified — function handles auth internally):
- Called from Settings → Danger Zone when the user confirms account deletion
- Verifies the caller's identity via `auth.getUser()` using the bearer token
- Uses a service-role admin client to call `auth.admin.deleteUser(userId)` — this cascades to all linked data via FK constraints
- Returns `{ success: true }` on success; the client then calls `supabase.auth.signOut()` and redirects to `/auth`

**`claim-level-trial`** (JWT not pre-verified — function handles auth internally):
- Called from the profile page when a level milestone is reached
- Computes XP and level server-side from authoritative DB counts
- Grants the appropriate Gathr+ preview trial (48h at level 5, 7-day at level 10) if not already claimed

**`after-event-matches`** (JWT-verified):
- Called once per session from the home page: `supabase.functions.invoke('after-event-matches')`
- Reads the caller's identity from the JWT (no user ID needed in the request body — it's derived from the auth token)
- Scans for events the user attended that ended in the last 48 hours
- For each such event, finds unconnected co-attendees with `matching_enabled = true`
- Sends one notification per qualifying event (deduped against existing notifications)
- Runs server-side so it can do multi-table joins efficiently without the client making 5+ sequential queries on load

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

**Resume Draft shortcut:** The Profile page "Mine" tab shows a highlighted "Resume creating your event" banner card when a draft exists in `event_drafts`. Tapping it navigates to `/create` where the draft is auto-loaded.

**Community event linking:** When the create page is opened with `?community=[uuid]`, the UUID is validated against a regex, stored in `fromCommunityId` state, and included as `community_id` in the event insert. After publish, the user is redirected to `/communities/[id]?tab=events` instead of the event detail page.

**Geocoding feedback:** While the Nominatim lookup runs after the user blurs the address field, the field shows a pulsing "Looking up location…" indicator. On success it shows a green "✓ Location confirmed". The Next step button is disabled and shows "Looking up location…" while geocoding is in flight.

---

## Settings — Key Behaviours

**Password change:** Minimum 12 characters, enforced both client-side (button disabled + strength meter) and server-side (Supabase Auth rejects weak passwords). A 4-bar strength meter updates in real time scoring: length ≥ 8, length ≥ 12, case mix, number + symbol mix. The Update Password button stays disabled until length ≥ 12 and both fields match — so users can't submit a password that will be rejected.

**City change (home feed):** Selecting a new city updates `profiles.city`, shows a 2.5-second pill toast, and immediately re-fetches events from the server for the new city. The local event cache is not reused — a fresh query runs so the full pool for the new city loads.

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
| Account deletion blocked by auth layer | `delete-account` Edge Function uses service-role admin client to call `auth.admin.deleteUser()` — bypasses the user's own auth constraints |

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
| After-event match edge function | Supabase Edge Function: `after-event-matches` |
| Privacy Policy | `app/privacy/page.tsx` |
| Terms of Service | `app/terms/page.tsx` |
| Feature tour | `app/tour/page.tsx` |

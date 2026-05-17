# Gathr

Social event discovery and hosting app — mobile-first web app built with Next.js 16 App Router and Supabase.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (see `GATHR_OVERVIEW.md` → Deployment Setup Checklist for the full list):
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — web push notifications
- `NEXT_PUBLIC_SENTRY_DSN` — error tracking (Sentry)
- `NEXT_PUBLIC_POSTHOG_KEY` — product analytics (PostHog)
- `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM` — set `"true"` only on Supabase Pro plan with Image Transformations enabled
- `NEXT_PUBLIC_FOUNDER_ID` — UUID of the founder account; controls which profile shows the founder badge. Defaults to the hardcoded fallback in `lib/constants.ts` if not set

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) |
| Hosting | Vercel |

## Project docs

- **[GATHR_OVERVIEW.md](GATHR_OVERVIEW.md)** — complete technical reference: database schema, triggers, RLS, edge functions, realtime, code patterns, deployment checklist
- **[GATHR_BRIEF.md](GATHR_BRIEF.md)** — product and business context: features, positioning, competitive landscape
- **[GATHR_PLAYBOOK.md](GATHR_PLAYBOOK.md)** — launch playbook: beta strategy, city rollout, growth levers, funding roadmap

## Key conventions

- Every page is `'use client'` — the app is a mobile PWA-style app on Next.js infrastructure; all pages need live user data
- **Tailwind v4**: `@import "tailwindcss"` syntax, no `tailwind.config.js`
- **Supabase client**: singleton at `lib/supabase.ts` — never re-instantiate per component
- **Count integrity**: all count updates (spots left, member counts, XP triggers) owned by Postgres DB triggers — never write counts directly from the client
- **SVG icon system**: all UI icons live in `components/icons.tsx` — a shared barrel of named exports (`MapPinIcon`, `CalendarIcon`, `SearchIcon`, `BookmarkIcon`, `BellIcon`, `UserIcon`, `PeopleIcon`, `InfoCircleIcon`, `ChevronDownIcon`, `XIcon`, `MessageIcon`). Consistent defaults: `strokeWidth 1.75`, `strokeLinecap/Join round`. No emoji in the UI layer. Two exceptions: achievement badge emoji (semantic identity for 32 badges) and `community.icon` (user-configured)
- **Empty states**: use `components/EmptyState` — accepts `icon` (ReactNode from the icon barrel), `headline` (Fraunces italic), optional `body`, and optional `action` (`primary` or `secondary` variant). The icon wrapper has `empty-float` applied for a gentle bounce. Never write inline empty state blocks in page files
- **Category colors**: `CAT_GRADIENT` in `lib/constants.ts` is the source of truth for image-less event tile backgrounds
- **Font classes**: `font-display` (Bricolage Grotesque), `font-editorial` (Fraunces), `font-mono-ui` (Geist Mono)
- **Light mode**: CSS class `data-theme="light"` on `<html>`; 130+ overrides in `app/globals.css`; inline gradient colors must use CSS variables (e.g. `var(--gradient-event-hero)`) so they can be themed
- **Security**: middleware lives in `middleware.ts` at the root — Next.js only loads middleware from this exact filename. It generates a per-request CSP nonce; a static fallback CSP is also set in `next.config.ts`
- **Private events**: `invite_code` is never included in the main event select — only fetched separately for the host. Invite validation happens server-side via a parameterized `eq('invite_code', param)` query

## Architecture notes

- RLS is enabled on every table — queries are automatically scoped to the authenticated user; no manual `user_id` filter needed on reads
- Gathr+ trial/billing columns (`gathr_plus_*`) are protected by `guard_profile_protected_columns_trg` — only edge functions running with service-role can write them
- Rate limiting is enforced at the DB level via BEFORE INSERT triggers on `waves`, `community_posts`, `community_chat_messages`, `messages`, `feedback`, and `user_reviews`
- The mystery match system, post-event match notifications, and Gathr+ level trials are all gated behind edge functions — not client-side logic

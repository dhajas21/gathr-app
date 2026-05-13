# Gathr — Complete Business & Product Brief
*Paste this entire document into Claude for marketing, business, launch planning, or copywriting help.*

---

## What Is Gathr?

Gathr is a **social event discovery and hosting app** for mobile web. The core problem it solves: people who share interests are already in the same city — they just don't know it yet.

You can create and browse local events across 40+ categories (fitness, food, music, tech, outdoors, coffee, etc.), RSVP to events, join communities built around shared interests, and message people you meet.

**The main differentiator — the mystery match system:**
When you RSVP to an event, Gathr shows you *how many* people going share your vibe — but keeps their identities blurred until after you've actually attended. Full profiles unlock post-event for people who showed up. This turns attendance into something worth doing: you commit because you're curious who's going, and you actually show up because you want the reveal.

**The secondary differentiator — safety infrastructure:**
After every event, attendees get a short anonymous post-event review (3 yes/no questions + an optional safety flag). Scores aggregate into a public safety tier shown on every profile: New, Verified, Trusted, or Flagged. Flagged accounts are removed from match lists automatically. No other local social app has this built-in.

---

## The Founder

- **Solo founder** (Jaskaran Dhatt), building as a side project → full-time
- Based in **Bellingham, WA** with networks in Olympia and Seattle
- Bootstrapped — no external funding yet
- App is fully built and deployed; pre-beta, no live users yet
- Unfair advantage: embedded in the Bellingham community, access to the WWU student network (~16,000 students)

---

## Core Features (All Built and Deployed)

### Events
- Create events in under 2 minutes: title, category (40+), date/time, location, visibility (public/unlisted/private), ticket type (free/paid/donation), cover photo, interest tags
- Auto-save draft — leave mid-flow and resume later; a draft chip with a × delete button appears on the home screen, in the host dashboard (above the tabs), and in your profile Events tab
- Home feed with 5 tabs: Trending, For You, Near Me, Friends, Mine
- Map view — pin-based event discovery
- RSVP with confetti celebration on join
- RSVP cancellation with confirmation guard
- Full street address revealed only to RSVPed attendees and the host — everyone else sees venue name only (Maps button also gated; calendar exports honour the same rule)
- Event bookmarks (saved events page)
- Comments on events
- Calendar export (.ics)

### Mystery Match System
- RSVP → see match count + blurred silhouettes (free users)
- Gathr+ members see partial first names + shared interests pre-event
- Anonymous "wave" feature (Gathr+ only) — signal interest before the event; a mutual wave gives both users an early first-name reveal
- Post-event: full profiles of co-attendees unlock for people who actually attended
- Safety-flagged accounts are hidden from all match lists

### Communities (Groups)
- Persistent community groups around shared interests
- Post text + photos, comment, like, and real-time group chat
- Public communities (instant join) and private communities (join request → owner approval)
- Community roles: owner, admin, member, pending
- Owners and admins can moderate all content
- Create an event directly from inside a community to link it to the group
- Tap a post image to view full-screen

### People & Connections
- Send connection requests; once accepted, start a private DM thread
- Each DM shows where you two first met
- Long-press to unsend messages (removes from both sides + any attached files)
- Swipe to delete a conversation from your inbox
- Typing indicators in DMs (real-time, doesn't touch the database)

### Safety System
- Anonymous post-event reviews: 3 yes/no questions + optional safety flag
- Aggregated into a safety score → public tier: New / Verified / Trusted / Flagged
- Verified: 3+ reviews averaging >70%; Trusted: 10+ reviews averaging >85%
- Two safety flags from different users can restrict an account while the team reviews
- Rate limited: max 10 reviews per reviewer per 24 hours (prevents score manipulation)

### Notifications & Push
- In-app notification centre (bell button on home)
- Web push notifications (opt-in; works when app is not open)
- Push for: RSVPs (host toggle, rate-limited per event), DMs, connection requests, connection accepted, waves, post-event match reveals, level-ups
- Transactional email (Resend): welcome on signup, RSVP notification to host, connection request, connection accepted

### XP, Levels & Achievements
- XP earned from: hosting events (+10 each), attending (+5), making connections (+3), adding interests (+2)
- Level = XP / 50 + 1 (no cap)
- 32 achievements across bronze, silver, gold: hosting milestones, attendance milestones, connection count, interest variety, community activity, profile completeness, safety tier, and combos
- Pin up to 3 achievement badges on your public profile
- Level 5 → 48-hour Gathr+ preview; Level 10 → 7-day Gathr+ preview (both one-time, auto-granted)
- Founder badge: exclusive `✦ Gathr Founder` badge on the founder's profile — non-earnable, always shown first, distinct darker-gold treatment

### Gathr+ (Premium Tier)
- Expanded pre-event match visibility (partial names + shared interests vs. just a count)
- Send anonymous waves before events
- Priority matching rank (appears higher in other users' match lists)
- Access paths currently: (1) one-time 7-day free trial (server-enforced, can't be claimed twice), (2) level milestone previews (level 5 = 48h, level 10 = 7 days)
- **Paid billing not yet wired** — the `/gathr-plus` page shows "Billing Coming Soon" with a waitlist. Plan: RevenueCat + Apple IAP + Google Play + Stripe for web

### Cities Supported (18 Total)
Bellingham, Seattle, Bellevue, Tacoma, Olympia, Spokane, Portland, Eugene, Salem, Vancouver BC, Victoria, Surrey, Burnaby, San Francisco, Los Angeles, San Diego, Sacramento, Phoenix

### Light Mode / Dark Mode
Full dual-theme support — the app ships with a dark default and a warm cream light mode. Theme toggle in Settings. 145+ CSS overrides ensure every element reads correctly in both modes.

---

## What Makes Gathr Different

| Feature | Gathr | Facebook Events | Meetup | Eventbrite | Partiful |
|---|---|---|---|---|---|
| Mystery match (who's going, revealed post-event) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Safety tier system (peer reviews → public trust score) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Communities with real-time group chat | ✅ | Groups only | ✅ | ❌ | ❌ |
| Anonymous wave (signal interest before event) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Free to host | ✅ | ✅ | ❌ ($) | ❌ ($) | ✅ |
| Modern mobile-first UX | ✅ | ❌ | ❌ | ❌ | ✅ |
| Public social discovery | ✅ | ✅ | ✅ | ✅ | ❌ (private only) |

---

## Target Market

**Primary user:** 21–34, socially active, undersatisfied with existing apps. Already goes to events but craves the "who else is going" context before committing. Uses Facebook Events reluctantly. Values real-world connection over digital interaction.

**Secondary user:** Event organisers — run club leads, coffee chat hosts, hobby group organisers — who want a better way to grow their attendee base and create buzz around their events.

**Not the target (yet):** Corporate event planners, ticketed concerts, passive browsers.

**Positioning:**
> "The social layer between saying yes and showing up."

The mystery match mechanic is genuinely differentiated. No competitor does pre-event social matching. Lead with this in every pitch, every piece of content, every marketing message.

---

## The Business

### Monetisation
**Current:** Gathr+ premium tier (free trial + level milestone previews only — billing not yet live)

**Planned:** 
- Monthly subscription: ~$4.99/mo
- Annual: ~$34.99/yr
- Platform fee on paid events (longer term)

**Billing stack (when live):**
- iOS: Apple In-App Purchases (mandatory)
- Android: Google Play Billing (mandatory)
- Web: Stripe
- Abstraction layer: RevenueCat (one SDK, one entitlement check, one webhook to your backend)

### Unit Economics (Targets)
- Gathr+ conversion: 2%+ of MAU at launch → 3%+ post-Seattle
- LTV: ~$4.99/mo subscription × average subscriber lifetime
- CAC: Near-zero at launch (organic only — organiser partnerships, community posts, referrals)

---

## Launch Strategy

### Phase 1: Bellingham Beta (Start Here)

**Why Bellingham first:**
- Small enough to achieve density fast (~90,000 city population)
- Founder is embedded in the community
- WWU gives access to 15,000+ young, socially active users
- Tight-knit community = word of mouth travels fast

**90-Day Bellingham Roadmap:**

*Days 1–14: Organiser Recruitment*
- Personal outreach to 20 potential organiser partners (WWU club leaders, Bellingham running clubs, coffee chat / meetup organisers, local hobby groups)
- Goal: 10 committed organisers, 5+ live events before beta opens
- Walk each one through creating their first event in person (this surfaces bugs and UX issues faster than anything else)
- Incentive: free Gathr+ for life for the first 25 organisers who list 3+ events

*Days 15–30: Closed Beta*
- Invite 50–75 beta testers (organisers + their immediate networks)
- TestFlight (iOS) only — control the rollout
- Weekly feedback calls with 3–4 organiser partners, daily crash log monitoring
- Run a private beta group chat (iMessage or Discord) — keep it small and personal

*Days 31–60: Open Beta*
- Expand to 150–250 users via organiser referrals and WWU student networks
- Post in r/Bellingham, Bellingham Facebook groups, WWU student forums
- First press: pitch Bellingham Herald / WWU student paper
- Tagline for Bellingham: *"Bellingham's first app that shows you who's going before you commit"*

*Days 61–90: Validation & Polish*
- Target: 100+ MAU
- 5+ events/week running without your involvement
- Fix all critical bugs from beta feedback
- Collect testimonials and "I met someone through Gathr" stories for marketing
- Prepare App Store submission

**Key Bellingham Channels:**
- r/Bellingham (~30k members)
- Bellingham community Facebook groups
- WWU student Discord servers and club portals
- Physical flyers at The Pickford, Local Public Eatery, Woods Coffee

**Signals that Bellingham is working (move to Seattle when you see all three):**
- 3+ events/week happening without you pushing it
- 30%+ of RSVPed users return week-over-week
- You've heard "I used this to meet someone" at least once

---

### Phase 2: Seattle Launch

**Why Seattle after Bellingham:**
- You'll have a working product, real testimonials, and a proven playbook
- The "Seattle Freeze" is a documented cultural problem — Gathr is the antidote

**Seattle positioning:**
> "Seattle is finally thawing."

The mystery match mechanic is especially resonant in a city where people struggle to convert casual acquaintances into real connections. Lead with this in all Seattle marketing.

**Seattle Ecosystem to Target:**
- Tech meetups: Startup Grind Seattle, Seattle Tech Meetup, Product Hunt Seattle
- Social clubs: Seattle Running Club, Outdoor Adventures, Seattle Social Club
- Neighbourhoods: Capitol Hill, Fremont, Ballard, South Lake Union Discord/Slack groups
- Universities: UW (~46k students), Seattle University, SPU

**90-Day Seattle Roadmap:**

*Days 1–21: Supply Seeding*
- Recruit 25+ Seattle organiser partners before public launch
- Target: tech meetup organisers (easy early adopters), running clubs, social hobby groups
- Offer free Gathr+ for life to first Seattle organiser cohort

*Days 22–45: Soft Launch*
- Invite-only via organiser networks
- 200–400 initial users
- Seattle-specific PR pitch: Seattle Times, The Stranger, GeekWire

*Days 46–90: Public Launch + Growth*
- ProductHunt launch (Tuesday or Wednesday for peak traffic)
- r/Seattle (~700k members — use carefully, not spammy)
- Paid Instagram/TikTok targeting 22–34 in Seattle ZIP codes ($200–500 test budget)
- Partnership with 2–3 established Seattle event series

---

## Checklist: Must-Have Before Any Public Launch

- [ ] **Payment processing** — RevenueCat + Apple IAP + Google Play + Stripe for web
- [ ] **Sign in with Apple** — Required by Apple if Google sign-in is present
- [x] **Push notifications** — Live (web push, opt-in, working)
- [x] **Analytics** — PostHog installed, events instrumented
- [x] **Crash reporting** — Sentry installed and configured
- [x] **Privacy policy** — Live at `/privacy`
- [x] **Terms of service** — Live at `/terms`
- [ ] **Support email monitored** — Route to personal email until volume justifies more
- [ ] **App Store assets** — Screenshots (6 per device size), subtitle, preview video
- [ ] **Custom email domain** — Register `getgathr.com` or similar, verify in Resend (currently using shared dev domain — won't deliver to real users)
- [ ] **Age gate** — App Store/COPPA compliance consideration
- [x] **Transactional email** — Welcome, RSVP, connection emails live (pending custom domain)

## Checklist: Bellingham → Seattle Transition

- [ ] Stable app with <1% crash rate
- [ ] Payment processing live
- [ ] Push notifications working reliably
- [ ] Support email monitored daily
- [ ] At least one press mention or testimonial quote
- [ ] Analytics showing 25%+ week-2 retention in Bellingham

---

## Key Metrics to Track (From Day 1)

| Metric | Bellingham Target | Seattle Target | Why It Matters |
|---|---|---|---|
| Events created/week | 5+ | 20+ | Supply-side health |
| RSVP rate per event | 3+ average | 5+ average | Demand-side engagement |
| Week-2 retention | 30%+ | 30%+ | The most important number |
| Gathr+ conversion | 2%+ of MAU | 3%+ | Proves monetisation |
| Organiser retention | 70%+ month-2 | 70%+ | Supply side is sticky |
| App Store rating | 4.5+ | 4.5+ | Affects discoverability |

**Week-2 retention is the north star.** Every growth decision should filter through: "Will this improve week-2 retention?" If users don't come back after their first event, scale doesn't matter.

---

## Growth Levers (In Priority Order)

| Channel | Effort | Expected Yield | Priority |
|---|---|---|---|
| Organiser partnerships | High | High — each brings an audience | #1 |
| Community group posts (Reddit, Facebook) | Medium | Medium — organic reach | #2 |
| University partnerships | Medium | High — large captive audience | #3 |
| Social media content | Low-medium | Medium — compounds over time | #4 |
| ProductHunt | One-time | Burst traffic + press attention | #5 |
| Local press | Medium | Credibility + organic users | #6 |
| Paid ads | Low (budget) | Skip until $500+ test budget | Last |

**The Organiser Flywheel is the single biggest lever.** Every organiser you onboard brings their existing audience. One run club with 200 members = 200 potential users. 25 active organisers before you hit 500 users is the target.

**Content that works:**
- "Who you might meet" angle: show a real event, show the mystery match count, tease who might be there
- After-event reveal stories: "3 people who met at a Bellingham run club through Gathr" (real names, with permission)
- Organiser spotlights: feature the organisers using Gathr — they share it with their audience

---

## Funding Roadmap

**Don't raise yet.** With no live users, you'll get bad terms or no meetings. Investors want retention data.

**Exception:** If someone offers a check right now based on the product and vision, take it.

**Milestone Sequence:**

| Milestone | Have | What It Unlocks |
|---|---|---|
| App live in Bellingham | 50+ MAU, 5+ events/week | Credibility for angel conversations |
| Bellingham proven | 200+ MAU, 25%+ week-2 retention | Pre-seed ($150k–$500k), angels |
| Two cities, growing | 1,000+ MAU, Gathr+ revenue, 3 cities | Seed ($500k–$2M) |
| Scale | 10k+ MAU, clear unit economics | Series A |

**Accelerators to apply to (do this now, regardless of stage):**
- **Y Combinator** — solo-founder friendly, most prestigious, apply every batch
- **Pioneer** — fully remote, solo-founder friendly
- **Techstars Seattle** — local, strong PNW network

**The one-paragraph investor pitch:**
> "Gathr builds the social graph of who shows up to real-world events — the relationship layer between interest and attendance that no one else owns. Our mystery match mechanic shows you how many people going to the same event share your vibe before you commit, with full profiles unlocking after you actually attend. We launched in Bellingham, Washington with [X] MAU, [Y]% week-2 retention, and [Z] events/week running without any paid acquisition. We're expanding to Seattle and [next city] and raising [amount] to accelerate organiser acquisition and city expansion."

**Questions investors will ask:**
- *"How do you solve the cold-start problem?"* — Organiser-first model. Seed events before inviting attendees. Stay in small cities until you have density.
- *"What's your moat?"* — The social graph of who attends what compounds with scale. Every review, connection, and match makes the network more valuable and more defensible.
- *"Why won't Facebook copy this?"* — They've tried and failed at local social repeatedly. Trust is the moat and Gathr is purpose-built for it.
- *"What does LTV look like?"* — Gathr+ at ~$4.99/mo or ~$34.99/yr, with platform fee on paid events as the scale revenue layer.

---

## What's Left to Build

**Before any public launch:**
- RevenueCat / Apple IAP / Stripe billing (Gathr+ must actually charge)
- Sign in with Apple (Apple App Store requires it when Google sign-in is present)
- Custom email domain (register domain, verify DNS in Resend — current shared domain won't deliver to real users)
- App Store assets (screenshots, preview video, metadata)

**Before Seattle specifically:**
- Age gates (App Store / COPPA compliance)
- Event reminders (push 1 hour before event start — infrastructure is there, just needs a cron job)

**Nice-to-have, not blocking:**
- Day-3 and day-7 onboarding email nudges (welcome email already live; drip sequence not built)
- Referral mechanism ("Invite a friend, both get 1 week Gathr+")
- Shake-to-report-bug gesture (for eventual mobile native shell)
- Native iOS / Android apps (currently mobile web; planned shell via Capacitor or similar)

---

## Technical Reality (Simplified)

The app is a mobile-first web app — it runs in the browser on any device, no app store install required for the web version. It's built on Next.js (React) deployed on Vercel, with Supabase handling the entire backend (database, auth, file storage, real-time chat, serverless functions).

**What "production-ready" means in this context:**
- Row-level database security — every user can only read/write their own data
- Rate limiting enforced at the database level — can't be bypassed even with direct API access
- File uploads validated server-side — wrong file types are rejected even if someone bypasses the app UI
- Crash reporting (Sentry) and analytics (PostHog) both wired
- Transactional email (Resend) live for welcome, RSVP, and connection events
- Web push notifications live and opt-in
- All count management (spots left, member counts, XP) handled by database triggers — no race conditions
- Gathr+ trial and billing status can't be manipulated by users — protected at the DB level
- Event street address gated behind RSVP — only RSVPed attendees and the host see the full address; the map pin shows venue name only to everyone else

The biggest technical gap before launch is **billing** (RevenueCat + IAP). Everything else is done.

---

## Brand & Voice

**Name:** Gathr

**Tagline options:**
- "The social layer between saying yes and showing up."
- "Know your vibe before you go."
- "Events are better when you know who's going."
- (Seattle-specific) "Seattle is finally thawing."

**Tone:** Warm, confident, slightly playful. Never corporate. Speaks to the person who wants real connection but is tired of social apps that deliver followers instead of friends.

**Visual identity:** Dark mode as the hero aesthetic — dark green (`#1C241C` cards on `#0D110D` page), warm cream text (`#F0EDE6`), gold accent (`#E8B84B`), mint green accent (`#7EC87E`). Light mode is warm cream on white. The palette reads premium and intentional — not a generic social app.

**Typography:** Three semantic typefaces — Bricolage Grotesque (`font-display`, all h1/h2 headings and stat numbers), Fraunces (`font-editorial`, italic editorial accents), Geist Mono (`font-mono-ui`, micro-labels, category tags, and meta text). The type hierarchy reinforces information density without relying solely on color.

**Icon system:** All UI icons are inline SVG — no emoji in the interface layer. Consistent gold-tinted stroke style (`rgba(232,184,75,0.7)`, 1.5px, round caps) gives every icon the same premium feel. Notification type icons are also SVG (gold for alerts, mint for social actions). Level tier icons (leaf → star → bolt → crown) use `filter: drop-shadow()` glow instead of flat fills — visually engaging, not just clean vectors. Exception: each of the 32 achievement badges has its own emoji identity (intentional — they are semantic data, not UI decoration). Category emoji (`CAT_EMOJI`) are used as watermark overlays on event tiles without cover photos — visible but not distracting (25–30% opacity).

**The hook in every message:** The mystery. Who's going? You don't know yet — but you will after you show up.

---

## App Store Metadata (Draft Starting Points)

**App name:** Gathr

**Subtitle (30 chars max):** "Discover who's going"

**Description opening:**
> You're always wondering who else is going to that event. Gathr answers the question — after you show up.
> 
> RSVP to any event and see how many people going share your vibe. We keep them anonymous until after you've actually attended, so attendance is worth it and no-shows stay home. Full profiles unlock for people who showed up together.

**Keywords to target:** event discovery, meet people, social events, local events, event app, social app, who's going, mystery match, community events, find friends

**Category:** Social Networking (primary), Lifestyle (secondary)

**Screenshots priority order:** 
1. Mystery match reveal moment
2. Home feed with live events
3. Event creation flow
4. Community group chat
5. Safety tier profile badge
6. Gathr+ wave feature

---

## Competitive Positioning — One-Liners

**vs. Facebook Events:** "Facebook Events shows you what's happening. Gathr shows you who you'll meet when you go."

**vs. Meetup:** "Meetup costs organisers money and looks like it was built in 2009. Gathr is free to host and built for how people actually discover things."

**vs. Eventbrite:** "Eventbrite is a ticketing platform. Gathr is a social network built around showing up."

**vs. Partiful:** "Partiful is great for private parties. Gathr is for when you want to actually meet new people."

---

## Questions This Brief Should Help You Answer

- How should we write the landing page / waitlist page?
- What should the App Store description and screenshots say?
- How should we structure the beta outreach (email scripts, DM templates, flyer copy)?
- What social media content strategy works for this type of app?
- How do we pitch organiser partners?
- What does the waitlist email sequence look like?
- How should we think about pricing Gathr+?
- What does the ProductHunt launch post look like?
- How should we frame the pitch for accelerators (YC, Pioneer, Techstars)?
- What does the press pitch to GeekWire / The Stranger / local papers look like?
- What referral mechanism makes sense for this business model?
- How should we think about community-building before the app has many users?
- What's the 12-month roadmap from beta to Series A?

'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const updated = 'May 15, 2026'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/[0.07]">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-16 max-w-2xl mx-auto w-full">
        <p className="text-xs text-white/30 mb-8">Last updated: {updated}</p>

        {[
          {
            title: '1. Who We Are',
            body: 'Gathr is a social event discovery platform that helps people find and host events in their city. References to "Gathr," "we," "us," or "our" in this policy refer to the Gathr application and its operators.',
          },
          {
            title: '2. Information We Collect',
            body: 'We collect information you provide directly: your name, email address, city, profile photo, interests, bio, and profile mode (Social, Professional, or both). When you use Gathr, we also collect activity data such as events you create or RSVP to, messages you send, connections you make, community groups you join, community group chat messages you send, community posts and photo attachments you share, replies (comments) you submit, and other content you upload. File attachments in chat are limited to images (JPG, PNG, WebP), PDFs, and plain-text files — we do not accept or store other file types. Community post images must be JPG, PNG, or WebP and may not exceed 5 MB. We also store XP and level milestones derived from your activity, and which achievements you have earned. If you subscribe to Gathr+, we record your subscription status and billing period. If you receive a level-milestone Gathr+ preview reward, we record the expiry timestamp of that preview on your profile.\n\nImage uploads: Profile photos, event covers, community banners, community post images, and chat attachments are stored in Supabase Storage. Each upload is validated server-side for file type and size — the server rejects disallowed types even if the client is bypassed. Images are served over a public CDN; deleting your account removes your profile photo but community post images are removed only when the associated post or community is deleted.\n\nCommunity moderation: Community owners and admins may delete posts, post replies, and chat messages within communities they manage. Deleted content is permanently removed from our systems.\n\nCommunity deletion: When a community owner deletes a community, all associated data is permanently removed — including all posts, post comments, chat messages, and member records for that community.\n\nCheck-In Data: When you tap "I\'m Here" to check in to an event, Gathr may request your device\'s GPS location. If you grant access, we record your approximate latitude/longitude and your distance from the event venue at the moment of check-in. If location access is denied or unavailable, your GPS coordinates are stored as null and check-in is still recorded. Check-in data is visible to the event host and is retained until you delete your account.',
          },
          {
            title: '3. How We Use Your Information',
            body: 'We use your information to operate and improve Gathr, match you with relevant events and people, send notifications about activity on your account, calculate your trust score (see section 7), and communicate with you about the service. We do not sell your personal information to third parties.',
          },
          {
            title: '4. People Matching & the Mystery System',
            body: 'When you RSVP to an event, Gathr may show your profile to other attendees as a potential match, based on shared interests and profile completeness. By default, matching is enabled. You can turn it off at any time in Settings → Privacy. If matching is disabled, you will not appear in other people\'s match lists and you will not see matches yourself.\n\nBefore an event, free users see a limited mystery view: match count and a blurred silhouette. Gathr+ members see partial names and shared interests even before RSVPing (pre-RSVP preview). Full profile details — name, photo, and bio — are only shown to other attendees after the event ends. The post-event survey and match reveals require that you checked in or RSVPed to the event.\n\nPaths Crossed: Gathr+ members can view a "Paths Crossed" feed showing everyone they have co-attended events with (based on check-in and RSVP records), ordered by most recent shared event. The feed shows first names, shared interests, and a list of the events you attended together. Only users with matching_enabled = true and a non-flagged safety tier appear in the feed. Users you are already connected with are excluded. Co-attendance records used to compute Paths Crossed are derived from the same check-in and RSVP data described in section 2 and are not collected separately.',
          },
          {
            title: '5. Waves & Anonymity',
            body: 'Gathr+ members can send a "wave" to a match before an event to signal interest.\n\nWhat free users see: If you receive a wave and are not a Gathr+ subscriber, you see only the total number of waves you have received for that event — no identity information about who sent them.\n\nWhat Gathr+ recipients see: If you are a Gathr+ subscriber, Gathr reveals the sender\'s first name, profile photo, and interests you share with them for each incoming wave. This means your first name, photo, and shared interests are disclosed to any Gathr+ user you wave at. By sending a wave, you acknowledge that the recipient may be a Gathr+ subscriber and can see this information.\n\nMutual waves: If two users wave at each other for the same event, both see the other\'s first name regardless of subscription tier.\n\nWe do not provide any mechanism beyond the above for identifying wave senders. Attempting to infer sender identity through coordinated testing, multiple accounts, or social engineering violates our Terms of Service.',
          },
          {
            title: '6. Post-Event Safety Reviews',
            body: 'After an event ends, you may be invited to submit a short review for people you attended alongside. The survey is only available to users who checked in or RSVPed to the event, and only once the event has ended. Reviews consist of three yes/no questions and an optional safety flag. Review responses are stored securely and are never shown to the person being reviewed in individual form. Only aggregated scores and a derived safety tier (New, Verified, Trusted, or Flagged) are displayed publicly on a user\'s profile.\n\nAccounts with a Flagged safety tier are excluded from appearing in other users\' pre-event match lists.\n\nSafety flags (uncomfortable, inappropriate, or threatening) are reviewed by our team. Two or more safety flags from different reviewers may result in account restrictions while under review. Reviewers are not identified to the person being flagged.',
          },
          {
            title: '7. Safety Tiers & Trust Scores',
            body: 'Gathr calculates a safety score for each user based on the aggregate results of post-event reviews submitted by other members. This score determines a publicly visible tier: New (insufficient review history), Verified (3 or more reviews averaging above 70%), Trusted (10 or more reviews averaging above 85%), or Flagged (2 or more safety flags from separate reviewers). Tiers are recalculated automatically after each new review. You can view your own safety score in your profile.',
          },
          {
            title: '8. Information Sharing',
            body: 'Your profile name, photo, city, and public events are visible to other Gathr users. Your email address is never displayed publicly. Safety tier badges are visible on your public profile once you have received reviews. We do not sell or rent your personal data.\n\nWe share limited operational data with the following service providers as necessary to run the platform:\n\n• Supabase — database, authentication, file storage, and serverless functions. All of your account data lives here.\n• Vercel — hosting and serving the web application. Vercel processes incoming requests but does not retain personal data beyond standard server logs.\n• Sentry — error and crash reporting. When the app encounters a bug, an error event (including the page URL, browser, a sanitised stack trace, and — when you are signed in — your user ID and email address) is sent to Sentry so we can fix it. Your email address is included solely so we can follow up on reported errors; it is not used for any other purpose. Session replays only fire on errors and are recorded with all visible text masked and all media blocked.\n• PostHog — product analytics. Pageviews and specific in-app actions (such as creating an event, RSVPing, or joining a community) are sent to PostHog with your user ID once you are signed in. Anonymous visitors do not have person profiles created. Autocapture is disabled; only events we have explicitly named are recorded.\n• Resend — transactional email delivery. When Gathr sends you a system email (welcome, event RSVP notification, connection request, connection accepted), the recipient email address and email body are transmitted to Resend for delivery. Resend does not use this data for advertising.\n\nEach of these providers acts as a data processor on our behalf and is bound by their own privacy commitments. We do not share personal data with any third party for advertising purposes.',
          },
          {
            title: '9. AI & Automated Processing',
            body: 'Gathr does not use artificial intelligence, large language models (LLMs), or machine learning to process the content you create on the platform. Specifically:\n\n• Your messages, community posts, post comments, profile bio, and event descriptions are not sent to any AI or LLM service.\n• Your profile photos, event covers, community banners, and chat image attachments are not analysed by computer vision or generative AI.\n• Search queries you type are not sent to any third-party AI model — search is handled by a deterministic keyword and synonym parser that runs against our database. The "Quick filters" panel that appears for phrases like "music thursday night" is rules-based pattern matching, not AI.\n• People matching and event recommendations are produced by hand-written scoring functions that compare your stated interests, city, and activity to the interests, tags, and categories of events and other users. There is no AI model in the loop.\n• Safety tier badges (New / Verified / Trusted / Flagged) are computed by averaging post-event review responses with simple arithmetic — no AI ranking is applied.\n\nIf we ever introduce AI-assisted features in the future (for example, optional content moderation or smarter search), we will update this policy, name the provider, and describe what data is sent before the feature ships.',
          },
          {
            title: '10. Google Sign-In',
            body: 'If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive access to your Google contacts, Gmail, or any other Google services. You can revoke this access at any time via your Google account settings.',
          },
          {
            title: '11. Gathr+ Subscription',
            body: 'Gathr+ is the premium tier of Gathr. It unlocks: pre-RSVP match preview, wave sender identity reveal, unlimited waves, Paths Crossed history, priority matching rank, and — for the first 1,000 subscribers — a permanent Founding Member badge on your profile.\n\nWhat we record: When you have an active Gathr+ subscription or trial, we store `gathr_plus = true` and/or `gathr_plus_expires_at` on your profile. If you are among the first 1,000 paid subscribers, we also set `founding_member = true` — a permanent flag that survives subscription cancellation. The trial usage flag (`gathr_plus_trial_used`) records that the one-time trial has been claimed.\n\nPricing: Gathr+ will be available at $4.99/month or $39.99/year (saving 33%). Billing has not yet launched; current subscribers join a waitlist and will be notified before any charge is made.\n\n7-Day Free Trial: Eligible users may claim a one-time 7-day Gathr+ free trial. No card is required. The trial can only be claimed once per account, enforced server-side.\n\nLevel-Milestone Previews: Reaching level 5 grants a one-time 48-hour Gathr+ preview; reaching level 10 grants a one-time 7-day preview. These are automatic, non-repeatable rewards. We store the preview expiry timestamp on your profile.\n\nPaid Plans (when live): If you subscribe, your subscription status and plan type are recorded on your profile. Billing will be handled through our web payment provider. We will not store full payment card details on our servers. You may cancel at any time and features remain active until the end of the billing period.\n\nServer-side enforcement: Gathr+ status, trial flag, expiry timestamp, and founding_member flag are protected database columns. They cannot be modified by direct API calls from your client — only Gathr-controlled server functions can write to them.',
          },
          {
            title: '12. Data Storage & Security',
            body: 'Your data is stored securely using Supabase, hosted on AWS infrastructure. We use row-level security policies to ensure users can only access data they are authorised to see, plus database-level safeguards on sensitive columns (billing status, safety scores, activity counts) that prevent client-side tampering. No system is completely secure, and we encourage you to use a strong, unique password.\n\nPush Notifications: Push notifications are opt-in. We do not request permission until you explicitly enable them from Settings → Push Notifications. If you enable them, we store a subscription record (browser endpoint and encryption keys) so we can send notifications to your device. You can disable them at any time from the same settings page, which removes the subscription record. When a notification is sent, only the title, body, and a link path (e.g. "/events/abc") are included in the push payload — never your interests, profile data, or message content beyond what is needed to display the notification. Hosts can additionally toggle "Notify me when people RSVP" off if they don\'t want pushes for new attendees; RSVP-type pushes are rate-limited to once per event every 30 minutes regardless of how many people RSVP, so popular events never spam.\n\nVenue Autocomplete: When you type a venue name while creating an event, Gathr looks up matching venues and addresses using the OpenStreetMap Nominatim geocoding service. These requests are routed through Gathr\'s own servers — your browser does not contact Nominatim directly, so your IP address is not transmitted to the Nominatim service. We do not store your venue search queries beyond what is saved when you actually create the event. OpenStreetMap\'s data is published under the Open Database Licence (ODbL). Venue search results are only fetched while you are actively typing in the event creation form and only after you have signed in.\n\nEvent Location Data: When you publish an event, the address you provide is geocoded into latitude/longitude coordinates so the event can appear on the map. Post-publish geocoding happens server-side via our backend (not your browser), so your IP address is not additionally exposed to third-party services at that step. Coordinates are stored alongside the event and are visible only at the level the event itself is visible (public events show pins to everyone; private events do not appear on the public map).\n\nCheck-In Location: When you tap "I\'m Here" during an event, Gathr may request your device\'s GPS location. If granted, we record your approximate latitude/longitude and your distance from the event venue at the moment of check-in. This data is visible to the event host for attendance verification and analytics. If you decline location access your GPS coordinates are stored as null — check-in is still recorded and a soft confirmation prompt is shown instead. Check-in location data is retained until you delete your account.\n\nAddress Reveal: The full street address of an event is not shown to everyone who views the event page. Only the venue name is visible to all viewers. The full street address is revealed only to (1) users who have RSVPed to the event, and (2) the event host. Calendar exports (Google Calendar and .ics downloads) also reflect this — the street address is included in the calendar entry only for RSVPed users and the host. This protects hosts who prefer not to broadcast a home address or private venue location to the general public.\n\nFeedback Submissions: When you send feedback through Settings → Send Feedback, we record the message you wrote, the category you picked, the URL path you were on, your user ID, and your browser user-agent string. This information is only used to help us reproduce bugs and prioritise improvements. Feedback rows are only readable by Gathr team members and by you (you can request your own feedback history at any time). You can submit up to 5 feedback messages per hour to prevent abuse.',
          },
          {
            title: '13. Data Retention',
            body: 'We retain your account data for as long as your account is active. Post-event reviews you have submitted are retained to maintain the integrity of the safety score system. If you delete your account, your personal profile information is removed within 30 days. Submitted reviews are anonymised rather than deleted, as removing them would unfairly alter other users\' safety scores.',
          },
          {
            title: '14. Your Rights',
            body: 'You have the right to access, correct, or delete your personal information at any time. You can update your profile in Settings. You can disable people matching and control your RSVP visibility in Settings → Privacy. To delete your account, go to Settings → Danger Zone — deletion is immediate and permanent. For a data export, contact us at the address below.',
          },
          {
            title: '15. Children\'s Privacy',
            body: 'Gathr is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.',
          },
          {
            title: '16. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the app. Your continued use of Gathr after changes are posted constitutes acceptance of the updated policy.',
          },
          {
            title: '17. Contact Us',
            body: 'If you have questions about this Privacy Policy, your personal data, or a safety concern, please contact us at: privacy@gathr.app',
          },
        ].map(section => (
          <div key={section.title} className="mb-6">
            <h2 className="text-sm font-bold text-[#F0EDE6] mb-2">{section.title}</h2>
            <p className="text-sm text-white/45 leading-relaxed whitespace-pre-line">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

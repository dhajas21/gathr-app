'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const updated = 'May 11, 2026'

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
            body: 'We collect information you provide directly: your name, email address, city, profile photo, interests, bio, and profile mode (Social, Professional, or both). When you use Gathr, we also collect activity data such as events you create or RSVP to, messages you send, connections you make, community groups you join, community group chat messages you send, community posts and photo attachments you share, replies (comments) you submit, and other content you upload. File attachments in chat are limited to images (JPG, PNG, WebP), PDFs, and plain-text files — we do not accept or store other file types. Community post images must be JPG, PNG, or WebP and may not exceed 5 MB. We also store XP and level milestones derived from your activity, and which achievements you have earned. If you subscribe to Gathr+, we record your subscription status and billing period. If you receive a level-milestone Gathr+ preview reward, we record the expiry timestamp of that preview on your profile.\n\nImage uploads: Profile photos, event covers, community banners, community post images, and chat attachments are stored in Supabase Storage. Each upload is validated server-side for file type and size — the server rejects disallowed types even if the client is bypassed. Images are served over a public CDN; deleting your account removes your profile photo but community post images are removed only when the associated post or community is deleted.\n\nCommunity moderation: Community owners and admins may delete posts, post replies, and chat messages within communities they manage. Deleted content is permanently removed from our systems.\n\nCommunity deletion: When a community owner deletes a community, all associated data is permanently removed — including all posts, post comments, chat messages, and member records for that community.',
          },
          {
            title: '3. How We Use Your Information',
            body: 'We use your information to operate and improve Gathr, match you with relevant events and people, send notifications about activity on your account, calculate your trust score (see section 7), and communicate with you about the service. We do not sell your personal information to third parties.',
          },
          {
            title: '4. People Matching & the Mystery System',
            body: 'When you RSVP to an event, Gathr may show your profile to other attendees as a potential match, based on shared interests and profile completeness. By default, matching is enabled. You can turn it off at any time in Settings → Privacy. If matching is disabled, you will not appear in other people\'s match lists and you will not see matches yourself.\n\nBefore an event, free users see a limited mystery view: match count and a blurred silhouette. Gathr+ members see partial names and shared interests. Full profile details — name, photo, and bio — are only shown to other attendees after the event ends.',
          },
          {
            title: '5. Waves & Anonymity',
            body: 'Gathr+ members can send an anonymous "wave" to a match before an event to signal interest. Waves are entirely anonymous: the recipient receives only a count of waves received and an event reference. The sender\'s identity is never revealed unless both parties wave at each other for the same event (a mutual wave), in which case both users receive only each other\'s first name — no other profile data is disclosed pre-event. We do not provide any mechanism to identify wave senders, and attempting to infer sender identity through any means violates our Terms of Service.',
          },
          {
            title: '6. Post-Event Safety Reviews',
            body: 'After an event ends, you may be invited to submit a short review for people you attended alongside. The survey is only available to users who RSVPed to the event, and only once the event has ended. Reviews consist of three yes/no questions and an optional safety flag. Review responses are stored securely and are never shown to the person being reviewed in individual form. Only aggregated scores and a derived safety tier (New, Verified, Trusted, or Flagged) are displayed publicly on a user\'s profile.\n\nAccounts with a Flagged safety tier are excluded from appearing in other users\' pre-event match lists.\n\nSafety flags (uncomfortable, inappropriate, or threatening) are reviewed by our team. Two or more safety flags from different reviewers may result in account restrictions while under review. Reviewers are not identified to the person being flagged.',
          },
          {
            title: '7. Safety Tiers & Trust Scores',
            body: 'Gathr calculates a safety score for each user based on the aggregate results of post-event reviews submitted by other members. This score determines a publicly visible tier: New (insufficient review history), Verified (3 or more reviews averaging above 70%), Trusted (10 or more reviews averaging above 85%), or Flagged (2 or more safety flags from separate reviewers). Tiers are recalculated automatically after each new review. You can view your own safety score in your profile.',
          },
          {
            title: '8. Information Sharing',
            body: 'Your profile name, photo, city, and public events are visible to other Gathr users. Your email address is never displayed publicly. Safety tier badges are visible on your public profile once you have received reviews. We do not sell or rent your personal data.\n\nWe share limited operational data with the following service providers as necessary to run the platform:\n\n• Supabase — database, authentication, file storage, and serverless functions. All of your account data lives here.\n• Vercel — hosting and serving the web application. Vercel processes incoming requests but does not retain personal data beyond standard server logs.\n• Sentry — error and crash reporting. When the app encounters a bug, an error event (including the page URL, browser, a sanitised stack trace, and your authenticated user ID when applicable) is sent to Sentry so we can fix it. Session replays only fire on errors and are recorded with all visible text masked and all media blocked.\n• PostHog — product analytics. Pageviews and specific in-app actions (such as creating an event, RSVPing, or joining a community) are sent to PostHog with your user ID once you are signed in. Anonymous visitors do not have person profiles created. Autocapture is disabled; only events we have explicitly named are recorded.\n\nEach of these providers acts as a data processor on our behalf and is bound by their own privacy commitments. We do not share personal data with any third party for advertising purposes.',
          },
          {
            title: '9. Google Sign-In',
            body: 'If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive access to your Google contacts, Gmail, or any other Google services. You can revoke this access at any time via your Google account settings.',
          },
          {
            title: '10. Gathr+ Subscription',
            body: 'Gathr+ is the premium tier of Gathr. Paid plans are not yet live; until they are, Gathr+ access is granted only through (1) a one-time 7-day free trial, or (2) automatic level-milestone previews.\n\n7-Day Free Trial: When you start the trial we record `gathr_plus_expires_at` (the timestamp it ends) and `gathr_plus_trial_used = true` on your profile. The trial can only be claimed once per account; this is enforced server-side via a dedicated edge function (`claim-gathr-plus-trial`) so it cannot be bypassed.\n\nLevel-Milestone Previews: Reaching level 5 or level 10 automatically grants a time-limited Gathr+ preview (48 hours and 7 days respectively). These are one-time rewards per milestone — not a free trial linked to payment. We store the preview expiry timestamp on your profile. Once the preview expires, Gathr+ features are no longer accessible unless you subscribe.\n\nPaid Plans (when live): If you subscribe, we will record your subscription status and plan type on your profile. Billing will be handled through your device\'s app store or our web payment provider. We will not store full payment card details on our servers. You will be able to cancel your subscription at any time, and your Gathr+ features will remain active until the end of your current billing period.\n\nServer-side enforcement: Your Gathr+ status, trial usage flag, and expiry timestamp are protected database columns. They cannot be modified by direct API calls from your client — only Gathr-controlled edge functions can write to them, which ensures the one-time trial rule and your subscription status are tamper-resistant.',
          },
          {
            title: '11. Data Storage & Security',
            body: 'Your data is stored securely using Supabase, hosted on AWS infrastructure. We use row-level security policies to ensure users can only access data they are authorised to see, plus database-level safeguards on sensitive columns (billing status, safety scores, activity counts) that prevent client-side tampering. No system is completely secure, and we encourage you to use a strong, unique password.\n\nPush Notifications: Push notifications are opt-in. We do not request permission until you explicitly enable them from Settings → Push Notifications. If you enable them, we store a subscription record (browser endpoint and encryption keys) so we can send notifications to your device. You can disable them at any time from the same settings page, which removes the subscription record.\n\nEvent Location Data: When you create an event, the address you provide is geocoded into latitude/longitude coordinates so the event can appear on the map. Geocoding happens server-side via our backend so your IP address is not exposed to third-party geocoding services. Coordinates are stored alongside the event and are visible only at the level the event itself is visible (public events show pins to everyone; private events do not appear on the public map).',
          },
          {
            title: '12. Data Retention',
            body: 'We retain your account data for as long as your account is active. Post-event reviews you have submitted are retained to maintain the integrity of the safety score system. If you delete your account, your personal profile information is removed within 30 days. Submitted reviews are anonymised rather than deleted, as removing them would unfairly alter other users\' safety scores.',
          },
          {
            title: '13. Your Rights',
            body: 'You have the right to access, correct, or delete your personal information at any time. You can update your profile in Settings. You can disable people matching and control your RSVP visibility in Settings → Privacy. To delete your account, go to Settings → Danger Zone — deletion is immediate and permanent. For a data export, contact us at the address below.',
          },
          {
            title: '14. Children\'s Privacy',
            body: 'Gathr is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it promptly.',
          },
          {
            title: '15. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the app. Your continued use of Gathr after changes are posted constitutes acceptance of the updated policy.',
          },
          {
            title: '16. Contact Us',
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

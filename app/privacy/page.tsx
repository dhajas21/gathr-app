'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const updated = 'May 9, 2026'

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
            body: 'We collect information you provide directly: your name, email address, city, profile photo, interests, and bio. When you use Gathr, we also collect activity data such as events you create or RSVP to, messages you send, connections you make, community posts you write, and content you upload. We also store XP and level milestones derived from your activity, and which achievements you have earned. If you subscribe to Gathr+, we record your subscription status and billing period. If you receive a level-milestone Gathr+ preview reward, we record the expiry timestamp of that preview on your profile.',
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
            body: 'Your profile name, photo, city, and public events are visible to other Gathr users. Your email address is never displayed publicly. Safety tier badges are visible on your public profile once you have received reviews. We share data with service providers (Supabase for database, Vercel for hosting) only as necessary to operate the platform. We do not sell or rent your personal data.',
          },
          {
            title: '9. Google Sign-In',
            body: 'If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive access to your Google contacts, Gmail, or any other Google services. You can revoke this access at any time via your Google account settings.',
          },
          {
            title: '10. Gathr+ Subscription',
            body: 'Gathr+ is a paid subscription tier. If you subscribe, we record your subscription status and plan type on your profile. Billing is handled through your device\'s app store or payment provider. We do not store full payment card details on our servers. You can cancel your subscription at any time; your Gathr+ features remain active until the end of your current billing period.\n\nLevel-Milestone Previews: Reaching level 5 or level 10 automatically grants a time-limited Gathr+ preview (48 hours and 7 days respectively). These are one-time rewards per milestone — not a free trial linked to payment. We store the preview expiry timestamp (`gathr_plus_expires_at`) on your profile record. Once the preview expires, Gathr+ features are no longer accessible unless you subscribe.',
          },
          {
            title: '11. Data Storage & Security',
            body: 'Your data is stored securely using Supabase, hosted on AWS infrastructure. We use row-level security policies to ensure users can only access data they are authorised to see. No system is completely secure, and we encourage you to use a strong, unique password.',
          },
          {
            title: '12. Data Retention',
            body: 'We retain your account data for as long as your account is active. Post-event reviews you have submitted are retained to maintain the integrity of the safety score system. If you delete your account, your personal profile information is removed within 30 days. Submitted reviews are anonymised rather than deleted, as removing them would unfairly alter other users\' safety scores.',
          },
          {
            title: '13. Your Rights',
            body: 'You have the right to access, correct, or delete your personal information at any time. You can update your profile in Settings. You can disable people matching and control your RSVP visibility in Settings → Privacy. To request full account deletion or a data export, contact us at the address below.',
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

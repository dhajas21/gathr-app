'use client'

import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  const updated = 'May 11, 2026'

  return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4 border-b border-white/[0.07]">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6] text-sm">
          ←
        </button>
        <h1 className="text-lg font-bold text-[#F0EDE6]">Terms of Service</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 pb-16 max-w-2xl mx-auto w-full">
        <p className="text-xs text-white/30 mb-8">Last updated: {updated}</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Gathr, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the platform. We reserve the right to update these terms at any time with notice posted in the app.',
          },
          {
            title: '2. Eligibility',
            body: 'You must be at least 13 years old to use Gathr. By using the platform, you represent that you meet this requirement. Users between 13 and 18 should have parental or guardian consent. Gathr is designed for social event discovery and in-person meetups — use of the platform for any purpose inconsistent with this is prohibited.',
          },
          {
            title: '3. Your Account',
            body: 'You are responsible for maintaining the security of your account and password. You are responsible for all activity that occurs under your account. Notify us immediately at legal@gathr.app of any unauthorised use. You may not create multiple accounts, transfer your account to another person, or impersonate any other user.',
          },
          {
            title: '4. Acceptable Use',
            body: 'You agree not to use Gathr to post illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable content. You may not impersonate others, spam users, scrape data, or use the platform for any unlawful purpose. Violations may result in immediate account suspension or termination. We reserve the right to remove content and restrict accounts that violate these rules, including based on community safety reports.',
          },
          {
            title: '5. People Matching & Waves',
            body: 'By enabling People Matching in Settings, you consent to your profile being surfaced to other attendees of the same events as a potential match. You can disable this at any time.\n\nThe wave feature allows Gathr+ members to send anonymous signals of interest before an event. You agree to use waves in good faith as a genuine expression of interest in meeting someone at an event. Waves may not be used to harass, target, or intimidate other users. Attempting to identify the sender of an anonymous wave through any means — including coordinated testing, multiple accounts, or social engineering — is a violation of these Terms and may result in immediate account termination.',
          },
          {
            title: '6. Post-Event Safety Reviews',
            body: 'After events, you may submit anonymous reviews of other attendees. By submitting a review, you represent that your responses reflect your honest, good-faith experience with that person at that event. You agree not to:\n\n• Submit false, misleading, or retaliatory reviews\n• Coordinate with others to inflate or damage another user\'s safety score\n• Use safety flags to harass or target users you have a personal dispute with\n\nAbuse of the review system — including false safety flags — is grounds for account suspension. Gathr investigates all safety flags and retains the right to discount or remove reviews that appear to be in bad faith.',
          },
          {
            title: '7. Safety Tiers & Account Restrictions',
            body: 'Gathr calculates a safety tier (New, Verified, Trusted, or Flagged) based on aggregated community reviews. Accounts with a Flagged status may have certain features restricted — including People Matching visibility, exclusion from pre-event match lists, and event hosting — while our team reviews the reported conduct. We will notify you if your account is placed under review. Repeated or severe violations may result in permanent account termination.',
          },
          {
            title: '8. Gathr+ Subscription',
            body: 'Gathr+ is a paid subscription that unlocks additional features including expanded pre-event match visibility, the wave feature, and priority matching rank.\n\nBilling: Gathr+ is billed monthly or annually as selected at the time of purchase. Prices are displayed at checkout and may change with notice.\n\nManual Free Trial: First-time subscribers who have held an account for at least one hour may activate a 7-day free trial from the Gathr+ page. This trial can only be claimed once per account. You will be charged at the end of the trial unless you cancel before it expires.\n\nLevel-Milestone Previews: Reaching level 5 grants a one-time 48-hour Gathr+ preview; reaching level 10 grants a one-time 7-day preview. These are automatic, non-repeatable rewards — not a paid free trial. They do not renew, cannot be transferred, and expire at the time shown in your profile. Gathr+ features are removed when the preview expires unless you subscribe.\n\nCancellation: You may cancel Gathr+ at any time. Your subscription remains active until the end of the current billing period; no partial refunds are issued for unused time.\n\nRefunds: Refund requests may be submitted to support@gathr.app within 48 hours of a charge. We handle refund requests on a case-by-case basis.\n\nFeature changes: We may add, modify, or remove Gathr+ features at any time. Material reductions in features will be communicated in advance.',
          },
          {
            title: '9. Events & RSVPs',
            body: 'Gathr is a platform for discovering and organising events. We are not responsible for the content, safety, or conduct of any event listed on the platform. Event hosts are solely responsible for ensuring their events comply with applicable laws and regulations. Attending any event found through Gathr is at your own risk.\n\nTicket Types: When creating an event, hosts may designate it as Free, Paid, or Donation-based. Paid and Donation events display the specified price or suggested amount on the event card. Gathr does not process payments — hosts are solely responsible for collecting any fees, ensuring the ticket price displayed is accurate, and complying with any applicable laws regarding ticket sales or donations. Misrepresenting ticket pricing or collecting fees without delivering the advertised event is a violation of these Terms.',
          },
          {
            title: '10. User Content',
            body: 'You retain ownership of content you post on Gathr (photos, event descriptions, comments, reviews, etc.). By posting content, you grant Gathr a non-exclusive, royalty-free licence to display and distribute that content within the platform. You represent that you have the rights to any content you post and that it does not violate any third-party rights.',
          },
          {
            title: '11. Privacy',
            body: 'Your use of Gathr is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information, including the anonymity protections for waves and safety reviews.',
          },
          {
            title: '12. Intellectual Property',
            body: 'The Gathr name, logo, and platform design are owned by Gathr and may not be used without permission. All rights not expressly granted in these Terms are reserved.',
          },
          {
            title: '13. Disclaimers',
            body: 'Gathr is provided "as is" without warranties of any kind. We do not guarantee that the platform will be uninterrupted, error-free, or that defects will be corrected. Safety tier scores reflect aggregated community feedback and are not an endorsement or guarantee of any individual\'s conduct. We are not liable for any damages arising from your use of the platform or from attending any event found through it.',
          },
          {
            title: '14. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Gathr shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform, including damages arising from reliance on safety tier information, wave interactions, or event attendance.',
          },
          {
            title: '15. Termination',
            body: 'We may suspend or terminate your account at any time for violation of these Terms, including for abuse of the safety review system, wave system, or repeated safety flags from other community members. You may delete your account at any time through Settings. Upon termination, your right to use Gathr ceases immediately. Anonymised review data you submitted may be retained to preserve the integrity of other users\' safety scores.',
          },
          {
            title: '16. Governing Law',
            body: 'These Terms are governed by the laws of the State of Washington, United States, without regard to conflict of law principles.',
          },
          {
            title: '17. Contact',
            body: 'For questions about these Terms, contact us at: legal@gathr.app\nFor safety concerns or reports, contact us at: safety@gathr.app',
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

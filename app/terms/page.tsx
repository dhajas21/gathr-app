'use client'

import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  const updated = 'May 8, 2026'

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
            body: 'By accessing or using Gathr, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the platform. We reserve the right to update these terms at any time.',
          },
          {
            title: '2. Eligibility',
            body: 'You must be at least 13 years old to use Gathr. By using the platform, you represent that you meet this requirement. Users under 18 should have parental consent.',
          },
          {
            title: '3. Your Account',
            body: 'You are responsible for maintaining the security of your account and password. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use of your account.',
          },
          {
            title: '4. Acceptable Use',
            body: 'You agree not to use Gathr to post illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable content. You may not impersonate others, spam users, scrape data, or use the platform for any unlawful purpose. We reserve the right to remove content and suspend accounts that violate these rules.',
          },
          {
            title: '5. Events & RSVPs',
            body: 'Gathr is a platform for discovering and organizing events. We are not responsible for the content, safety, or conduct of any event listed on the platform. Event hosts are solely responsible for ensuring their events comply with applicable laws and regulations.',
          },
          {
            title: '6. User Content',
            body: 'You retain ownership of content you post on Gathr (photos, event descriptions, comments, etc.). By posting content, you grant Gathr a non-exclusive, royalty-free license to display and distribute that content within the platform. You represent that you have the rights to any content you post.',
          },
          {
            title: '7. Privacy',
            body: 'Your use of Gathr is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices.',
          },
          {
            title: '8. Intellectual Property',
            body: 'The Gathr name, logo, and platform design are owned by Gathr and may not be used without permission. All rights not expressly granted in these Terms are reserved.',
          },
          {
            title: '9. Disclaimers',
            body: 'Gathr is provided "as is" without warranties of any kind. We do not guarantee that the platform will be uninterrupted, error-free, or that defects will be corrected. We are not liable for any damages arising from your use of the platform.',
          },
          {
            title: '10. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Gathr shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the platform.',
          },
          {
            title: '11. Termination',
            body: 'We may suspend or terminate your account at any time for violation of these Terms. You may delete your account at any time through the app settings. Upon termination, your right to use Gathr ceases immediately.',
          },
          {
            title: '12. Governing Law',
            body: 'These Terms are governed by the laws of the State of Washington, United States, without regard to conflict of law principles.',
          },
          {
            title: '13. Contact',
            body: 'For questions about these Terms, contact us at: legal@gathr.app',
          },
        ].map(section => (
          <div key={section.title} className="mb-6">
            <h2 className="text-sm font-bold text-[#F0EDE6] mb-2">{section.title}</h2>
            <p className="text-sm text-white/45 leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

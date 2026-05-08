'use client'

import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  const updated = 'May 8, 2026'

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
            body: 'We collect information you provide directly: your name, email address, city, profile photo, interests, and bio. When you use Gathr, we also collect activity data such as events you create or RSVP to, messages you send, connections you make, and content you post.',
          },
          {
            title: '3. How We Use Your Information',
            body: 'We use your information to operate and improve Gathr, match you with relevant events and people, send notifications about activity on your account, and communicate with you about the service. We do not sell your personal information to third parties.',
          },
          {
            title: '4. Information Sharing',
            body: 'Your profile name, photo, and public events are visible to other Gathr users. Private information such as your email address is never displayed publicly. We share data with service providers (Supabase for database hosting, Vercel for hosting) only as necessary to operate the platform.',
          },
          {
            title: '5. Google Sign-In',
            body: 'If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive access to your Google contacts, Gmail, or any other Google services. You can revoke this access at any time via your Google account settings.',
          },
          {
            title: '6. Data Storage & Security',
            body: 'Your data is stored securely using Supabase, which is hosted on AWS infrastructure. We use row-level security policies to ensure users can only access data they are authorized to see. No system is completely secure, and we encourage you to use a strong password.',
          },
          {
            title: '7. Data Retention',
            body: 'We retain your account data for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal reasons.',
          },
          {
            title: '8. Your Rights',
            body: 'You have the right to access, correct, or delete your personal information at any time. You can update your profile information in the app settings. To request account deletion, contact us at the email below.',
          },
          {
            title: '9. Children\'s Privacy',
            body: 'Gathr is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will delete it.',
          },
          {
            title: '10. Changes to This Policy',
            body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy in the app. Your continued use of Gathr after changes constitutes acceptance of the updated policy.',
          },
          {
            title: '11. Contact Us',
            body: 'If you have questions about this Privacy Policy or your personal data, please contact us at: privacy@gathr.app',
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

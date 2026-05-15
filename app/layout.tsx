// app/layout.tsx
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Bricolage_Grotesque, Fraunces } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import "leaflet/dist/leaflet.css"
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar"
import ErrorBoundary from "@/components/ErrorBoundary"
import OfflineBanner from "@/components/OfflineBanner"
import AnalyticsProvider from "@/components/AnalyticsProvider"
import AppResumeRadar from "@/components/AppResumeRadar"
import { headers } from "next/headers"

// ── Type system ─────────────────────────────────────────
// Geist           — body / UI
// Geist Mono      — eyebrows, labels, timestamps
// Bricolage       — wordmark, display, section heads
// Fraunces        — editorial moments (taglines, reveals)
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Gathr — Find your people",
  description: "Discover local events and connect with people who share your vibe.",
  manifest: "/manifest.json",
  verification: {
    google: 'GrXBgixypH69plo7mOJgzxGYpMJfR_5qZqTnY2Dq-nA',
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0D110D",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${bricolage.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('gathr_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body className="min-h-full antialiased bg-[#0D110D] text-[#F0EDE6]">
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        <AppResumeRadar />
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  )
}

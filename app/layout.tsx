import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { Syne } from "next/font/google"
import "./globals.css"
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["700", "800"] })

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${syne.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('gathr_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </head>
      <body className="min-h-full antialiased bg-[#0D110D] text-[#F0EDE6]">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}

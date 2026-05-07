import type { Metadata, Viewport } from "next"
import { Geist } from "next/font/google"
import { Syne } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["700", "800"] })

export const metadata: Metadata = {
  title: "Gathr — Find your people",
  description: "Discover local events and connect with people who share your vibe.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0D110D",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${syne.variable} h-full`}>
      <body className="min-h-full antialiased bg-[#0D110D] text-[#F0EDE6]">{children}</body>
    </html>
  )
}

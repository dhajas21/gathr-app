import type { NextConfig } from "next";

const SUPABASE_HOST = 'adhahiqpiqwlvkykhbtf.supabase.co'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://${SUPABASE_HOST} https://lh3.googleusercontent.com`,
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://nominatim.openstreetmap.org`,
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    remotePatterns: [
      { hostname: 'adhahiqpiqwlvkykhbtf.supabase.co' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig;

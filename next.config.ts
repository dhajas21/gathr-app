import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs'

const supabaseHostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    remotePatterns: [
      { hostname: supabaseHostname },
      { hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

// Sentry build-time config — only wraps when an auth token is available
// (so local dev builds without Sentry credentials still work normally).
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Bundler + source-map upload settings
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Hides source maps from public bundles (uploaded to Sentry, not served)
      sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
      // Adds an /monitoring tunnel so adblockers don't strip Sentry pings
      tunnelRoute: '/monitoring',
      disableLogger: true,
    })
  : nextConfig


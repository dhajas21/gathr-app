// Next.js instrumentation entrypoint — runs once per server process.
// Boots Sentry for server + edge runtimes. Client init lives in
// instrumentation-client.ts (Next.js 16+ pattern).

import * as Sentry from '@sentry/nextjs'

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return // No-op when DSN not configured (dev / preview without Sentry)

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.0,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      // Don't capture user agents from health-check pings
      ignoreErrors: ['ResizeObserver loop limit exceeded'],
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    })
  }
}

// Captures uncaught errors from React Server Components + route handlers
export const onRequestError = Sentry.captureRequestError

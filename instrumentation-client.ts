// Sentry browser init — Next.js 16+ picks this up automatically.

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Sample 10% of transactions; raise once we have real volume to budget
    tracesSampleRate: 0.1,
    // Session replays are powerful but expensive — only record on errors
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true, // PII safety: mask all rendered text in replays
        blockAllMedia: true,
      }),
    ],
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    // Browser-noise we don't care about
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
      'Failed to fetch',
      'Load failed',
    ],
  })
}

// Required export for Next.js 16 router transition tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

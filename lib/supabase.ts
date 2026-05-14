import { createBrowserClient } from '@supabase/ssr'
import { isValidUUID } from './utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

/**
 * PostgREST `.or()` filter for the connection-pair pattern.
 * Validates the UUID so accidental misuse with user input fails loudly rather
 * than producing a malformed filter or interpolating untrusted data.
 *
 * Usage:
 *   .or(connectionPairOr(userId))
 */
export function connectionPairOr(userId: string): string {
  if (!isValidUUID(userId)) throw new Error('connectionPairOr: invalid userId')
  return `requester_id.eq.${userId},addressee_id.eq.${userId}`
}

/**
 * Canonical thread ID for a 1:1 conversation between two users.
 * Sorted so it's stable regardless of who initiated.
 */
export function buildThreadId(a: string, b: string): string {
  if (!isValidUUID(a) || !isValidUUID(b)) throw new Error('buildThreadId: invalid UUID')
  return [a, b].sort().join('_')
}

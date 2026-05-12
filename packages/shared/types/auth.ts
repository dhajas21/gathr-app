// Lightweight shared types for the Supabase auth user + the Gathr profile row.
// Opt-in: import these in new code instead of `useState<any>(null)`. Existing
// callsites still using `any` are fine and will be migrated as those files are
// touched for unrelated reasons.

export interface AuthUser {
  id: string
  email: string | null
  created_at: string
}

export type ProfileMode = 'social' | 'professional' | 'both'

export type SafetyTier = 'new' | 'verified' | 'trusted'

export interface Profile {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  city: string | null
  bio_social: string | null
  bio_professional: string | null
  interests: string[] | null
  profile_mode: ProfileMode | null
  is_discoverable: boolean | null
  matching_enabled: boolean | null
  notify_on_rsvp: boolean | null
  rsvp_visibility: 'public' | 'connections' | 'private' | null
  safety_tier: SafetyTier | null
  review_count: number | null
  hosted_count: number | null
  attended_count: number | null
  gathr_plus: boolean | null
  gathr_plus_expires_at: string | null
  gathr_plus_trial_used: boolean | null
  gathr_plus_trial_levels: number[] | null
  created_at: string | null
  updated_at: string | null
}

// Notification type strings — keep in sync with the DB check constraint
// (notifications.type) and the formatPushCopy switch in send-push.
export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'rsvp'
  | 'event_reminder'
  | 'community_event'
  | 'message'
  | 'achievement'
  | 'after_event_match'
  | 'survey_prompt'
  | 'wave'
  | 'event_comment'

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  title: string | null
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

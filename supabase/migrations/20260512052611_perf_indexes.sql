-- Performance indexes recommended by the May 2026 audit.
-- All use IF NOT EXISTS so it's safe to re-run; all use CONCURRENTLY so the
-- migration won't lock writes against hot tables in production.
--
-- Apply with:
--   supabase db push
-- or, against a remote database directly (transactional DDL won't work with
-- CONCURRENTLY, so this must run one statement at a time outside a tx):
--   psql $DATABASE_URL -f supabase/migrations/20260512052611_perf_indexes.sql
--
-- Each index targets a query that the audit identified as a hot path.

-- Home feed: upcoming public events ordered by start time.
-- Supports: WHERE visibility='public' AND start_datetime >= now() ORDER BY start_datetime.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_visibility_start
  ON public.events (visibility, start_datetime)
  WHERE visibility = 'public';

-- City-scoped event lookups (also used by map page and home city filter).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_city_start
  ON public.events (city, start_datetime);

-- Unread message counts in the bottom-nav badge.
-- Partial index: only rows where read_at IS NULL, which is the vast minority.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_unread
  ON public.messages (recipient_id)
  WHERE read_at IS NULL;

-- Thread message fetch (newest-first, paginated).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_sent
  ON public.messages (thread_id, sent_at DESC);

-- Notifications: user's unread + ordered feed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read = false;

-- All notifications for a user, ordered.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- RSVP membership check (who's going to event X / what events is user Y going to).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvps_event_user
  ON public.rsvps (event_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rsvps_user_created
  ON public.rsvps (user_id, created_at DESC);

-- Connections: looked up by either side. We index both columns to cover
-- the `.or(requester_id.eq.X, addressee_id.eq.X)` pattern used everywhere.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_requester_status
  ON public.connections (requester_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connections_addressee_status
  ON public.connections (addressee_id, status);

-- Community membership lookups (BottomNav, /messages community-chats, RLS).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_user_role
  ON public.community_members (user_id, role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_community_role
  ON public.community_members (community_id, role);

-- Community chat: latest-message lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_chat_community_created
  ON public.community_chat_messages (community_id, created_at DESC);

-- Event bookmarks (used on home + bookmarks pages).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user
  ON public.event_bookmarks (user_id, created_at DESC);

-- Waves (Gathr+): sender + receiver lookups per event.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waves_event_sender
  ON public.waves (event_id, sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_waves_event_receiver
  ON public.waves (event_id, receiver_id);

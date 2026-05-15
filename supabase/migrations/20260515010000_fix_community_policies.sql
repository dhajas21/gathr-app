-- Fix community RLS policies: unlisted post leakage + public→authenticated role corrections

-- 1. Fix community_posts_select: unlisted posts were readable by anyone (NOT c.is_private let unlisted through)
DROP POLICY IF EXISTS "community_posts_select" ON community_posts;
CREATE POLICY "community_posts_select" ON community_posts
  FOR SELECT TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM communities c WHERE c.id = community_posts.community_id AND c.visibility = 'public'))
    OR
    (EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_posts.community_id AND cm.user_id = auth.uid() AND cm.role <> 'pending'))
  );

-- 2. Fix community_owner_can_remove_members: public → authenticated
DROP POLICY IF EXISTS "community_owner_can_remove_members" ON community_members;
CREATE POLICY "community_owner_can_remove_members" ON community_members
  FOR DELETE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM community_members cm_owner WHERE cm_owner.community_id = community_members.community_id AND cm_owner.user_id = auth.uid() AND cm_owner.role = 'owner'))
    AND (user_id <> auth.uid())
  );

-- 3. Fix community_owner_can_update_member_roles: public → authenticated
DROP POLICY IF EXISTS "community_owner_can_update_member_roles" ON community_members;
CREATE POLICY "community_owner_can_update_member_roles" ON community_members
  FOR UPDATE TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM community_members cm_owner WHERE cm_owner.community_id = community_members.community_id AND cm_owner.user_id = auth.uid() AND cm_owner.role = 'owner'))
    AND (user_id <> auth.uid())
  )
  WITH CHECK (role = ANY (ARRAY['member'::text, 'admin'::text]));

-- 4. Fix Authors can delete posts: public → authenticated
DROP POLICY IF EXISTS "Authors can delete posts" ON community_posts;
CREATE POLICY "Authors can delete posts" ON community_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 5. Fix Members can insert posts: public → authenticated
DROP POLICY IF EXISTS "Members can insert posts" ON community_posts;
CREATE POLICY "Members can insert posts" ON community_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. Fix community_posts_delete_moderator: public → authenticated
DROP POLICY IF EXISTS "community_posts_delete_moderator" ON community_posts;
CREATE POLICY "community_posts_delete_moderator" ON community_posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM community_members cm WHERE cm.community_id = community_posts.community_id AND cm.user_id = auth.uid() AND cm.role = ANY (ARRAY['owner'::text, 'admin'::text]))
  );

-- 7. Fix chat_delete_moderator: public → authenticated
DROP POLICY IF EXISTS "chat_delete_moderator" ON community_chat_messages;
CREATE POLICY "chat_delete_moderator" ON community_chat_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM community_members WHERE community_members.community_id = community_chat_messages.community_id AND community_members.user_id = auth.uid() AND community_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))
  );

-- 8. Drop duplicate chat_delete_own (covered by "Users can delete own community chat" on authenticated)
DROP POLICY IF EXISTS "chat_delete_own" ON community_chat_messages;

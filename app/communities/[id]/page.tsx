'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { CommunityDetailSkeleton } from '@/components/Skeleton'
import { optimizedImgSrc, isValidUUID, formatDate } from '@/lib/utils'
import { cityToTimezone } from '@/lib/constants'
import { track } from '@/components/AnalyticsProvider'

interface Post {
  id: string
  user_id: string
  text: string | null
  image_url?: string | null
  like_count: number
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null }
  liked?: boolean
}

interface ChatMessage {
  id: string
  user_id: string
  text: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null }
}

interface Comment {
  id: string
  post_id: string
  user_id: string
  text: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null }
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [community, setCommunity] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [memberRole, setMemberRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [communityId, setCommunityId] = useState('')
  const [activeTab, setActiveTab] = useState<'feed' | 'events' | 'members' | 'chat'>('feed')
  const [postText, setPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [myEvents, setMyEvents] = useState<any[]>([])
  const [addingEvent, setAddingEvent] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [postCount, setPostCount] = useState(0)
  const [acceptingIds, setAcceptingIds] = useState<Set<string>>(new Set())
  const [decliningIds, setDecliningIds] = useState<Set<string>>(new Set())
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({})
  const [commentCountMap, setCommentCountMap] = useState<Record<string, number>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const postInputRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    params.then(({ id }) => {
      if (cancelled) return
      if (!isValidUUID(id)) { router.push('/communities'); return }
      setCommunityId(id)
      const tab = new URLSearchParams(window.location.search).get('tab')
      if (tab === 'chat' || tab === 'feed' || tab === 'events' || tab === 'members') setActiveTab(tab)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchCommunity(id, session.user.id)
      })
    })
    return () => { cancelled = true }
  }, [params, router])

  useEffect(() => {
    if (!communityId) return
    const channel = supabase
      .channel('community-posts-' + communityId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_posts',
        filter: 'community_id=eq.' + communityId,
      }, async (payload) => {
        // Skip refetch for our own posts — already inserted optimistically
        const newPost = payload.new as any
        if (newPost.user_id === user?.id) return
        const { data } = await supabase
          .from('community_posts')
          .select('id, user_id, text, image_url, like_count, created_at, profiles(id, name, avatar_url)')
          .eq('id', newPost.id).maybeSingle()
        if (data) setPosts(prev => {
          if (prev.some(p => p.id === (data as any).id)) return prev
          return [{ ...(data as any), liked: false }, ...prev]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [communityId, user?.id])

  useEffect(() => {
    if (!communityId || !isMember) return
    const channel = supabase
      .channel('community-chat-' + communityId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_chat_messages',
        filter: 'community_id=eq.' + communityId,
      }, async (payload) => {
        // Skip refetch for our own messages — already inserted optimistically
        const newMsg = payload.new as any
        if (newMsg.user_id === user?.id) return
        const { data } = await supabase
          .from('community_chat_messages')
          .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
          .eq('id', newMsg.id).maybeSingle()
        if (data) setChatMessages(prev => {
          if (prev.some(m => m.id === (data as any).id)) return prev
          return [...prev, data as any]
        })
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'community_chat_messages',
        filter: 'community_id=eq.' + communityId,
      }, (payload) => {
        setChatMessages(prev => prev.filter(m => m.id !== (payload.old as any).id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [communityId, isMember, user?.id])

  useEffect(() => {
    if (activeTab === 'chat' && communityId && isMember) fetchChat(communityId)
  }, [activeTab, communityId, isMember])

  useEffect(() => {
    if (activeTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, activeTab])

  const fetchChat = async (id: string) => {
    const { data } = await supabase
      .from('community_chat_messages')
      .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .eq('community_id', id)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setChatMessages(data as any)
  }

  const fetchCommentCounts = async (postIds: string[]) => {
    if (postIds.length === 0) return
    const { data } = await supabase
      .from('community_post_comments')
      .select('post_id')
      .in('post_id', postIds)
    if (!data) return
    const counts: Record<string, number> = {}
    data.forEach((r: any) => { counts[r.post_id] = (counts[r.post_id] || 0) + 1 })
    setCommentCountMap(counts)
  }

  const fetchCommunity = async (id: string, userId: string) => {
    try {
    const { data: commData } = await supabase.from('communities').select('*').eq('id', id).single()
    if (!commData) { router.push('/communities'); return }
    setCommunity(commData)

    const [memberCheck, membersData, eventsData, postsData, likesData, postCountData] = await Promise.all([
      supabase.from('community_members').select('role').eq('community_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('community_members')
        .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
        .eq('community_id', id).neq('role', 'pending')
        .order('joined_at', { ascending: true }).limit(50),
      supabase.from('events').select('id, title, cover_url, start_datetime').eq('community_id', id).order('start_datetime', { ascending: true }).limit(10),
      supabase.from('community_posts').select('id, user_id, text, image_url, like_count, created_at, profiles(id, name, avatar_url)').eq('community_id', id).order('created_at', { ascending: false }).limit(30),
      supabase.from('community_post_likes').select('post_id').eq('user_id', userId),
      supabase.from('community_posts').select('*', { count: 'exact', head: true }).eq('community_id', id),
    ])

    const role = memberCheck.data?.role
    if (role === 'pending') {
      setIsPending(true)
      setIsMember(false)
      setMemberRole(null)
    } else if (role) {
      setIsMember(true)
      setMemberRole(role)

      // Fetch pending requests if owner/admin
      if (role === 'owner' || role === 'admin') {
        const { data: pending } = await supabase
          .from('community_members')
          .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
          .eq('community_id', id).eq('role', 'pending')
          .order('joined_at', { ascending: true })
        if (pending) setPendingRequests(pending)
      }
    }

    if (postCountData.count !== null) setPostCount(postCountData.count)
    if (membersData.data) setMembers(membersData.data)
    if (eventsData.data) setEvents(eventsData.data)

    if (postsData.data) {
      const likedIds = new Set((likesData.data || []).map((l: any) => l.post_id))
      setPosts(postsData.data.map((p: any) => ({ ...p, liked: likedIds.has(p.id) })))
      fetchCommentCounts(postsData.data.map((p: any) => p.id))
    }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    if (community?.is_private) {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId, user_id: user.id, role: 'pending',
      })
      if (!error) {
        setIsPending(true)
        track('community_join_requested', { community_id: communityId, private: true })
      }
    } else {
      const { error } = await supabase.from('community_members').insert({
        community_id: communityId, user_id: user.id, role: 'member',
      })
      if (!error) {
        setIsMember(true)
        setMemberRole('member')
        setCommunity((prev: any) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
        track('community_joined', { community_id: communityId, private: false })
      }
    }
    setActionLoading(false)
  }

  const handleCancelRequest = async () => {
    if (!user || actionLoading) return
    setActionLoading(true)
    const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
    if (!error) setIsPending(false)
    setActionLoading(false)
  }

  const handleLeave = async () => {
    if (!user || actionLoading || memberRole === 'owner') return
    setActionLoading(true)
    const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', user.id)
    if (!error) {
      setIsMember(false)
      setMemberRole(null)
      setCommunity((prev: any) => prev ? { ...prev, member_count: Math.max(0, (prev.member_count || 1) - 1) } : prev)
    }
    setActionLoading(false)
  }

  const handleAcceptMember = async (userId: string) => {
    if (acceptingIds.has(userId)) return
    setAcceptingIds(prev => new Set([...prev, userId]))
    await supabase.from('community_members').update({ role: 'member' })
      .eq('community_id', communityId).eq('user_id', userId)
    setPendingRequests(prev => prev.filter(r => r.user_id !== userId))
    const { data: newMember } = await supabase
      .from('community_members')
      .select('*, profile:profiles!community_members_user_id_fkey(id, name, bio_social, avatar_url)')
      .eq('community_id', communityId).eq('user_id', userId).single()
    if (newMember) setMembers(prev => [...prev, newMember])
    setCommunity((prev: any) => prev ? { ...prev, member_count: (prev.member_count || 0) + 1 } : prev)
    setAcceptingIds(prev => { const n = new Set(prev); n.delete(userId); return n })
  }

  const handleDeclineMember = async (userId: string) => {
    if (decliningIds.has(userId)) return
    setDecliningIds(prev => new Set([...prev, userId]))
    await supabase.from('community_members').delete()
      .eq('community_id', communityId).eq('user_id', userId)
    setPendingRequests(prev => prev.filter(r => r.user_id !== userId))
    setDecliningIds(prev => { const n = new Set(prev); n.delete(userId); return n })
  }

  const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const MAX_IMG_BYTES = 5 * 1024 * 1024

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !ALLOWED_IMG_TYPES.includes(file.type) || file.size > MAX_IMG_BYTES) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => { setImageFile(null); setImagePreview(null) }

  const handlePost = async () => {
    const trimmed = postText.trim()
    if ((!trimmed && !imageFile) || !user || posting) return
    setPosting(true)
    setPostText('')

    let uploadedUrl: string | null = null
    if (imageFile) {
      const ext = imageFile.type === 'image/jpeg' ? 'jpg' : imageFile.type.split('/')[1]
      const path = `${communityId}/${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('community-post-images')
        .upload(path, imageFile, { upsert: false })
      if (uploadErr) {
        setPosting(false)
        setPostText(trimmed)
        return
      }
      uploadedUrl = supabase.storage.from('community-post-images').getPublicUrl(path).data.publicUrl
      clearImage()
    }

    const optimisticId = 'optimistic-' + Date.now()
    const optimistic: Post = {
      id: optimisticId,
      user_id: user.id,
      text: trimmed || null,
      image_url: uploadedUrl,
      like_count: 0,
      created_at: new Date().toISOString(),
      profiles: { id: user.id, name: user.user_metadata?.name || user.email || '', avatar_url: user.user_metadata?.avatar_url || null },
      liked: false,
    }
    setPosts(prev => [optimistic, ...prev])
    setPostCount(prev => prev + 1)
    const { data, error } = await supabase
      .from('community_posts')
      .insert({ community_id: communityId, user_id: user.id, text: trimmed || null, image_url: uploadedUrl })
      .select('id, user_id, text, image_url, like_count, created_at, profiles(id, name, avatar_url)')
      .single()
    if (!error && data) {
      setPosts(prev => prev.map(p => p.id === optimisticId ? { ...(data as any), liked: false } : p))
    } else if (error) {
      setPosts(prev => prev.filter(p => p.id !== optimisticId))
      setPostCount(prev => Math.max(0, prev - 1))
      setPostText(trimmed)
      if (uploadedUrl) {
        const path = uploadedUrl.split('/storage/v1/object/public/community-post-images/')[1]
        if (path) await supabase.storage.from('community-post-images').remove([path])
      }
    }
    setPosting(false)
  }

  const handleLike = async (post: Post) => {
    if (!user) return
    const nowLiked = !post.liked
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: nowLiked, like_count: Math.max(0, p.like_count + (nowLiked ? 1 : -1)) } : p))
    const { error } = nowLiked
      ? await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: user.id })
      : await supabase.from('community_post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    if (error) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: !nowLiked, like_count: Math.max(0, p.like_count + (nowLiked ? -1 : 1)) } : p))
    }
  }

  const handleDeletePost = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post || (post.user_id !== user?.id && memberRole !== 'owner' && memberRole !== 'admin')) return
    if (post.image_url) {
      const path = post.image_url.split('/storage/v1/object/public/community-post-images/')[1]
      if (path) await supabase.storage.from('community-post-images').remove([decodeURIComponent(path)])
    }
    await supabase.from('community_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setPostCount(prev => Math.max(0, prev - 1))
  }

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from('community_post_comments')
      .select('id, post_id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) setCommentsMap(prev => ({ ...prev, [postId]: data as any }))
  }

  const handleExpandPost = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null)
    } else {
      setExpandedPostId(postId)
      if (!commentsMap[postId]) fetchComments(postId)
    }
  }

  const handleAddComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim()
    if (!text || !user || commentingId === postId) return
    setCommentingId(postId)
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    const optimisticId = 'optimistic-' + Date.now()
    const optimistic: Comment = {
      id: optimisticId, post_id: postId, user_id: user.id, text,
      created_at: new Date().toISOString(),
      profiles: { id: user.id, name: user.user_metadata?.name || user.email || '', avatar_url: user.user_metadata?.avatar_url || null },
    }
    setCommentsMap(prev => ({ ...prev, [postId]: [...(prev[postId] || []), optimistic] }))
    setCommentCountMap(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }))
    const { data, error } = await supabase
      .from('community_post_comments')
      .insert({ post_id: postId, user_id: user.id, text })
      .select('id, post_id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .single()
    if (!error && data) {
      setCommentsMap(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === optimisticId ? (data as any) : c),
      }))
    } else if (error) {
      setCommentsMap(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== optimisticId) }))
      setCommentCountMap(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }))
      setCommentInputs(prev => ({ ...prev, [postId]: text }))
    }
    setCommentingId(null)
  }

  const handleDeleteComment = async (commentId: string, postId: string) => {
    const comment = (commentsMap[postId] || []).find(c => c.id === commentId)
    if (!comment || (comment.user_id !== user?.id && memberRole !== 'owner' && memberRole !== 'admin')) return
    await supabase.from('community_post_comments').delete().eq('id', commentId)
    setCommentsMap(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== commentId) }))
    setCommentCountMap(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }))
  }

  const handleDeleteChatMessage = async (msgId: string) => {
    const msg = chatMessages.find(m => m.id === msgId)
    if (!msg || (msg.user_id !== user?.id && memberRole !== 'owner' && memberRole !== 'admin')) return
    await supabase.from('community_chat_messages').delete().eq('id', msgId)
    setChatMessages(prev => prev.filter(m => m.id !== msgId))
  }

  const handleSendChat = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || !user || chatSending) return
    setChatSending(true)
    setChatInput('')
    const optimisticId = 'optimistic-' + Date.now()
    const optimistic: ChatMessage = {
      id: optimisticId,
      user_id: user.id,
      text: trimmed,
      created_at: new Date().toISOString(),
      profiles: { id: user.id, name: user.user_metadata?.name || user.email || '', avatar_url: user.user_metadata?.avatar_url || null },
    }
    setChatMessages(prev => [...prev, optimistic])
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    const { data, error } = await supabase
      .from('community_chat_messages')
      .insert({ community_id: communityId, user_id: user.id, text: trimmed })
      .select('id, user_id, text, created_at, profiles(id, name, avatar_url)')
      .single()
    if (!error && data) {
      setChatMessages(prev => prev.map(m => m.id === optimisticId ? (data as any) : m))
    } else if (error) {
      setChatMessages(prev => prev.filter(m => m.id !== optimisticId))
      setChatInput(trimmed)
    }
    setChatSending(false)
  }

  const handleOpenAddEvent = async () => {
    if (!user) return
    const { data } = await supabase.from('events')
      .select('id, title, start_datetime, cover_url, community_id')
      .eq('host_id', user.id)
      .order('start_datetime', { ascending: false })
      .limit(30)
    const filtered = (data || []).filter((e: any) => e.community_id !== communityId)
    setMyEvents(filtered)
    setShowAddEventModal(true)
  }

  const handleAddEventToCommunity = async (eventId: string) => {
    setAddingEvent(true)
    await supabase.from('events').update({ community_id: communityId }).eq('id', eventId)
    const { data } = await supabase.from('events').select('*').eq('id', eventId).single()
    if (data) setEvents(prev => [...prev, data])
    setShowAddEventModal(false)
    setAddingEvent(false)
  }

  const handleShare = async () => {
    const url = window.location.href
    const shareData = { title: community?.name || 'Gathr Community', text: community?.description || 'Check out this community on Gathr!', url }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      } catch {}
    }
  }

  const loadMorePosts = async () => {
    if (!communityId || loadingMore) return
    const oldestPost = posts[posts.length - 1]
    if (!oldestPost) return
    setLoadingMore(true)
    const { data } = await supabase
      .from('community_posts')
      .select('id, user_id, text, image_url, like_count, created_at, profiles(id, name, avatar_url)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .lt('created_at', oldestPost.created_at)
      .limit(30)
    if (data && data.length > 0) {
      const { data: likesData } = user
        ? await supabase.from('community_post_likes').select('post_id').eq('user_id', user.id)
            .in('post_id', data.map((p: any) => p.id))
        : { data: [] }
      const likedIds = new Set((likesData || []).map((l: any) => l.post_id))
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        return [...prev, ...data.filter((p: any) => !existingIds.has(p.id)).map((p: any) => ({ ...p, liked: likedIds.has(p.id) }))]
      })
      fetchCommentCounts(data.map((p: any) => p.id))
    }
    setLoadingMore(false)
  }

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) return <CommunityDetailSkeleton />

  if (!community) return null

  const isOwnerOrAdmin = memberRole === 'owner' || memberRole === 'admin'

  return (
    <div className="min-h-screen bg-[#0D110D] pb-32">

      {/* Banner */}
      <div className="relative h-44 flex items-center justify-center text-5xl"
        style={{ background: community.banner_gradient || 'var(--gradient-community-banner)' }}>
        {optimizedImgSrc(community.banner_url, 900) ? (
          <img src={optimizedImgSrc(community.banner_url, 900)!} alt="" className="absolute inset-0 w-full h-full object-cover"  loading="lazy" />
        ) : community.icon
            ? <span className="relative z-10 text-5xl">{community.icon}</span>
            : <svg className="relative z-10" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.25" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D110D] via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button onClick={() => router.push('/communities')}
            className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-[#F0EDE6]">
            ←
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className={'w-9 h-9 bg-[#0D110D]/70 border rounded-xl flex items-center justify-center text-base transition-colors ' + (shareCopied ? 'border-[#E8B84B]/40 text-[#E8B84B]' : 'border-white/15 text-[#F0EDE6]')}>
              {shareCopied ? '✓' : '↑'}
            </button>
            {memberRole === 'owner' && (
              <button onClick={() => router.push('/communities/' + communityId + '/settings')}
                className="w-9 h-9 bg-[#0D110D]/70 border border-white/15 rounded-xl flex items-center justify-center text-base">⚙️</button>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: community.banner_gradient || 'var(--gradient-community-banner)' }}>
            {community.icon
              ? <span className="text-2xl">{community.icon}</span>
              : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-[#F0EDE6] text-lg leading-tight">{community.name}</h1>
              {community.is_private && (
                <span className="inline-flex items-center gap-1 text-[9px] bg-white/10 border border-white/10 text-white/40 px-1.5 py-0.5 rounded">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Private
                </span>
              )}
            </div>
            <div className="text-xs text-white/40 mt-0.5">{community.member_count} members · {community.category}</div>
          </div>
        </div>
        {community.description && (
          <p className="text-sm text-white/55 leading-relaxed font-light mt-2">{community.description}</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex border-t border-b border-white/10">
        <div className="flex-1 text-center py-3 border-r border-white/10">
          <div className="font-bold text-[#E8B84B] text-base">{community.member_count}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Members</div>
        </div>
        <div className="flex-1 text-center py-3 border-r border-white/10">
          <div className="font-bold text-[#E8B84B] text-base">{postCount}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Posts</div>
        </div>
        <div className="flex-1 text-center py-3">
          <div className="font-bold text-[#E8B84B] text-base">{events.length}</div>
          <div className="text-[9px] text-white/40 mt-0.5 uppercase tracking-wide">Events</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-4 gap-5">
        {(['feed', 'events', 'members', 'chat'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={'py-3 text-xs font-semibold capitalize border-b-2 transition-all ' +
              (activeTab === tab ? 'border-[#E8B84B] text-[#E8B84B]' : 'border-transparent text-white/35')}>
            {tab === 'feed'
              ? `Feed${postCount > 0 ? ' · ' + postCount : ''}`
              : tab === 'events'
              ? `Events${events.length > 0 ? ' · ' + events.length : ''}`
              : tab === 'members'
              ? `Members · ${members.length}${pendingRequests.length > 0 ? ' · ' + pendingRequests.length + ' pending' : ''}`
              : 'Chat'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">

        {/* FEED TAB */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {/* Private locked state for non-members */}
            {community.is_private && !isMember && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 bg-[#0D110D] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-[#F0EDE6] mb-1">Private Community</div>
                <div className="text-xs text-white/40">
                  {isPending ? 'Your request is being reviewed by the owner.' : 'Join to see posts and participate.'}
                </div>
              </div>
            )}

            {isMember && (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                {imagePreview && (
                  <div className="relative mb-3">
                    <img src={imagePreview} alt="" className="w-full max-h-52 object-cover rounded-xl" />
                    <button onClick={clearImage}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs active:scale-90">
                      ✕
                    </button>
                  </div>
                )}
                <textarea
                  ref={postInputRef}
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Share something with the community..."
                  maxLength={1000}
                  rows={3}
                  className="w-full bg-transparent text-sm text-[#F0EDE6] placeholder-white/20 outline-none resize-none"
                />
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => fileInputRef.current?.click()}
                      className={'text-base transition-colors ' + (imageFile ? 'text-[#E8B84B]' : 'text-white/25 active:text-white/50')}>
                      🖼
                    </button>
                    <span className="text-[10px] text-white/20">{postText.length}/1000</span>
                  </div>
                  <button onClick={handlePost} disabled={(!postText.trim() && !imageFile) || posting}
                    className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-4 py-1.5 rounded-xl disabled:opacity-30 active:scale-95 transition-transform">
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImagePick}
                />
              </div>
            )}

            {(!community.is_private || isMember) && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11v2a4 4 0 0 0 4 4h1l2 4h2l-1-4h1a10 10 0 0 0 9-9.95V11"/><path d="M3 11A10 10 0 0 1 21 11"/>
                  </svg>
                </div>
                <p className="text-white/40 text-sm text-center">No posts yet — start the conversation!</p>
              </div>
            )}

            {(!community.is_private || isMember) && posts.map(post => {
              const profile = (post as any).profiles
              const isOwn = post.user_id === user?.id
              return (
                <div key={post.id} className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
                  <div className="flex items-start gap-2.5 mb-3">
                    {optimizedImgSrc(profile?.avatar_url, 96) ? (
                      <img src={optimizedImgSrc(profile.avatar_url, 96)!} alt="" className="w-8 h-8 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
                    ) : (
                      <div className="w-8 h-8 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                        {profile?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/profile/' + profile?.id)}
                          className="text-sm font-semibold text-[#F0EDE6]">{profile?.name || 'Unknown'}</button>
                        <span className="text-[9px] text-white/25">{timeAgo(post.created_at)}</span>
                        {(isOwn || isOwnerOrAdmin) && (
                          <button onClick={() => handleDeletePost(post.id)} className="ml-auto text-[9px] text-white/20 active:text-[#E85B5B]">✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                  {post.text && <p className="text-sm text-white/70 leading-relaxed mb-3">{post.text}</p>}
                  {optimizedImgSrc(post.image_url, 700) && (
                    <button
                      onClick={() => setLightboxUrl(optimizedImgSrc(post.image_url, 900)!)}
                      className="mb-3 overflow-hidden rounded-xl w-full block active:opacity-80 transition-opacity">
                      <img src={optimizedImgSrc(post.image_url, 700)!} alt="" className="w-full max-h-64 object-cover" loading="lazy" />
                    </button>
                  )}
                  {isMember ? (
                    <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                      <button onClick={() => handleLike(post)}
                        className={'flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 ' + (post.liked ? 'text-[#E8B84B]' : 'text-white/30')}>
                        <span>{post.liked ? '♥' : '♡'}</span>
                        <span>{post.like_count > 0 ? post.like_count : ''}</span>
                      </button>
                      <button onClick={() => handleExpandPost(post.id)}
                        className={'flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 ' + (expandedPostId === post.id ? 'text-[#7EC87E]' : 'text-white/30')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span>{commentCountMap[post.id] ? commentCountMap[post.id] : 'Reply'}</span>
                      </button>
                    </div>
                  ) : (post.like_count > 0 || commentCountMap[post.id] > 0) ? (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                      {post.like_count > 0 && <span className="flex items-center gap-1 text-xs text-white/25"><span>♡</span><span>{post.like_count}</span></span>}
                      {commentCountMap[post.id] > 0 && (
                        <span className="flex items-center gap-1 text-xs text-white/25">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          <span>{commentCountMap[post.id]}</span>
                        </span>
                      )}
                    </div>
                  ) : null}
                  {isMember && expandedPostId === post.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.07]">
                      {(commentsMap[post.id] || []).length === 0 && (
                        <p className="text-[11px] text-white/25 mb-3 text-center">No replies yet</p>
                      )}
                      {(commentsMap[post.id] || []).map(comment => (
                        <div key={comment.id} className="flex items-start gap-2 mb-2.5">
                          {optimizedImgSrc(comment.profiles?.avatar_url, 96) ? (
                            <img src={optimizedImgSrc(comment.profiles.avatar_url, 96)!} alt="" className="w-6 h-6 rounded-lg object-cover flex-shrink-0 mt-0.5"  loading="lazy" />
                          ) : (
                            <div className="w-6 h-6 bg-[#2A4A2A] rounded-lg flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                              {comment.profiles?.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <button onClick={() => router.push('/profile/' + comment.profiles?.id)}
                                className="text-[11px] font-semibold text-[#F0EDE6]/80">{comment.profiles?.name || 'Unknown'}</button>
                              <span className="text-[9px] text-white/25">{timeAgo(comment.created_at)}</span>
                            </div>
                            <p className="text-xs text-white/60 leading-relaxed">{comment.text}</p>
                          </div>
                          {(comment.user_id === user?.id || isOwnerOrAdmin) && (
                            <button onClick={() => handleDeleteComment(comment.id, post.id)}
                              className="text-white/20 text-xs mt-0.5 flex-shrink-0 active:text-[#E85B5B]">✕</button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post.id) }}
                          placeholder="Add a reply..."
                          maxLength={500}
                          className="flex-1 bg-[#0D110D] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EDE6] placeholder-white/20 outline-none focus:border-white/20"
                        />
                        <button onClick={() => handleAddComment(post.id)}
                          disabled={!(commentInputs[post.id] || '').trim() || commentingId === post.id}
                          className="w-8 h-8 bg-[#E8B84B] rounded-xl flex items-center justify-center text-[#0D110D] font-bold text-sm flex-shrink-0 disabled:opacity-30 active:scale-95 transition-transform">
                          ↑
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {(!community.is_private || isMember) && posts.length > 0 && posts.length < postCount && (
              <button onClick={loadMorePosts} disabled={loadingMore}
                className="w-full py-3 text-xs text-white/40 font-medium active:text-white/60 transition-colors disabled:opacity-40">
                {loadingMore ? 'Loading...' : `Load more · ${postCount - posts.length} remaining`}
              </button>
            )}
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === 'events' && (
          <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium">Upcoming Events</div>
              {isOwnerOrAdmin && (
                <div className="flex gap-2">
                  <button onClick={handleOpenAddEvent}
                    className="bg-[#1C241C] border border-white/15 text-white/50 text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                    + Add Existing
                  </button>
                  <button onClick={() => router.push('/create?community=' + communityId)}
                    className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                    + New
                  </button>
                </div>
              )}
              {isMember && !isOwnerOrAdmin && (
                <button onClick={() => router.push('/create?community=' + communityId)}
                  className="bg-[#1E3A1E] border border-[#E8B84B]/20 text-[#E8B84B] text-[10px] font-semibold px-2.5 py-1 rounded-lg">
                  + Event
                </button>
              )}
            </div>
            {events.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <div className="w-12 h-12 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="text-sm text-white/40 text-center">No events yet</p>
                {(isMember) && (
                  <button onClick={() => router.push('/create?community=' + communityId)}
                    className="mt-1 bg-[#E8B84B] text-[#0D110D] px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                    Create an Event
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {events.map(event => (
                  <div key={event.id} onClick={() => router.push('/events/' + event.id)}
                    className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden relative"
                      style={{ background: 'var(--gradient-event-hero)' }}>
                      {optimizedImgSrc(event.cover_url, 96) && (
                        <img src={optimizedImgSrc(event.cover_url, 96)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">{formatDate(event.start_datetime, cityToTimezone(event.city))}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {/* Pending requests — owner/admin only */}
            {isOwnerOrAdmin && pendingRequests.length > 0 && (
              <div className="bg-[#1E2A1E] border border-[#7EC87E]/20 rounded-2xl p-3.5">
                <div className="text-[9px] uppercase tracking-widest text-[#7EC87E]/60 font-medium mb-3">
                  {pendingRequests.length} Join Request{pendingRequests.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.user_id} className="flex items-center gap-3">
                      {optimizedImgSrc(req.profile?.avatar_url, 96) ? (
                        <img src={optimizedImgSrc(req.profile.avatar_url, 96)!} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
                      ) : (
                        <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                          {req.profile?.name?.charAt(0) || '🧑'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#F0EDE6]">{req.profile?.name || 'Unknown'}</div>
                        <div className="text-xs text-white/40 truncate">{req.profile?.bio_social || 'Wants to join'}</div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => handleAcceptMember(req.user_id)}
                          disabled={acceptingIds.has(req.user_id)}
                          className="bg-[#E8B84B] text-[#0D110D] text-xs font-bold px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-50">
                          {acceptingIds.has(req.user_id) ? '...' : 'Accept'}
                        </button>
                        <button onClick={() => handleDeclineMember(req.user_id)}
                          disabled={decliningIds.has(req.user_id)}
                          className="bg-[#1C241C] border border-white/10 text-white/40 text-xs px-3 py-1.5 rounded-xl active:scale-95 transition-transform disabled:opacity-40">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-3.5">
              <div className="text-[9px] uppercase tracking-widest text-white/20 font-medium mb-3">
                Members · {members.length}
              </div>
              <div className="space-y-2">
                {members.map(member => (
                  <div key={member.id}
                    onClick={() => member.user_id !== user?.id && router.push('/profile/' + member.user_id)}
                    className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0 cursor-pointer">
                    {optimizedImgSrc(member.profile?.avatar_url, 96) ? (
                      <img src={optimizedImgSrc(member.profile.avatar_url, 96)!} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
                    ) : (
                      <div className="w-9 h-9 bg-[#2A4A2A] rounded-xl flex items-center justify-center text-base flex-shrink-0">
                        {member.profile?.name?.charAt(0) || '🧑'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6]">
                        {member.profile?.name || 'Unknown'}
                        {member.user_id === user?.id && <span className="text-white/30 text-xs ml-1.5">you</span>}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">{member.profile?.bio_social || member.role}</div>
                    </div>
                    {(member.role === 'owner' || member.role === 'admin') && (
                      <span className="bg-[#E8B84B]/10 border border-[#E8B84B]/20 text-[#E8B84B] text-[9px] px-2 py-0.5 rounded-md">
                        {member.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="pb-4">
            {!isMember ? (
              <div className="bg-[#1C241C] border border-white/10 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 bg-[#0D110D] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="text-sm font-semibold text-[#F0EDE6] mb-1">Members Only</div>
                <div className="text-xs text-white/40">Join the community to participate in the chat.</div>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-white/40 text-sm text-center">No messages yet — say hello!</p>
              </div>
            ) : (
              <div className="space-y-0.5 pb-4">
                {chatMessages.map((msg, i) => {
                  const isOwn = msg.user_id === user?.id
                  const profile = (msg as any).profiles
                  const showHeader = i === 0 || chatMessages[i - 1].user_id !== msg.user_id
                  const canDelete = isOwn || isOwnerOrAdmin
                  return (
                    <div key={msg.id} className={'flex items-end gap-2 ' + (isOwn ? 'justify-end' : 'justify-start') + (showHeader ? ' mt-4' : ' mt-0.5')}>
                      {!isOwn && (
                        <div className="w-7 h-7 flex-shrink-0 self-end">
                          {showHeader ? (
                            optimizedImgSrc(profile?.avatar_url, 96) ? (
                              <img src={optimizedImgSrc(profile.avatar_url, 96)!} alt="" className="w-7 h-7 rounded-lg object-cover"  loading="lazy" />
                            ) : (
                              <div className="w-7 h-7 bg-[#2A4A2A] rounded-lg flex items-center justify-center text-xs text-[#F0EDE6]">
                                {profile?.name?.charAt(0) || '?'}
                              </div>
                            )
                          ) : <div className="w-7" />}
                        </div>
                      )}
                      <div className="max-w-[72%]">
                        {showHeader && !isOwn && (
                          <button onClick={() => router.push('/profile/' + profile?.id)}
                            className="text-[10px] text-white/40 mb-1 ml-1 block">{profile?.name || 'Unknown'}</button>
                        )}
                        <div className={'px-3 py-2 text-sm leading-relaxed ' +
                          (isOwn
                            ? 'bg-[#E8B84B] text-[#0D110D] rounded-2xl rounded-br-sm'
                            : 'bg-[#1C241C] text-[#F0EDE6] rounded-2xl rounded-bl-sm border border-white/10')}>
                          {msg.text}
                        </div>
                      </div>
                      {canDelete && (
                        <button onClick={() => handleDeleteChatMessage(msg.id)}
                          className="text-white/20 text-xs self-center flex-shrink-0 active:text-[#E85B5B] transition-colors px-1">
                          ✕
                        </button>
                      )}
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* CTA bar */}
      <div className="fixed bottom-24 left-0 right-0 px-4 pb-4 pt-4 bg-gradient-to-t from-[#0D110D] via-[#0D110D]/95 to-transparent">
        {activeTab === 'chat' && isMember ? (
          <div className="flex items-end gap-2 bg-[#1C241C] border border-white/10 rounded-2xl px-3 pt-2.5 pb-2.5">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat() } }}
              placeholder="Message the community..."
              maxLength={500}
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#F0EDE6] placeholder-white/20 outline-none resize-none leading-5"
              style={{ minHeight: '20px' }}
            />
            <button onClick={handleSendChat} disabled={!chatInput.trim() || chatSending}
              className="w-8 h-8 bg-[#E8B84B] rounded-xl flex items-center justify-center text-[#0D110D] text-lg font-bold flex-shrink-0 disabled:opacity-30 active:scale-95 transition-transform">
              ↑
            </button>
          </div>
        ) : isMember ? (
          <div className="flex gap-3">
            <button onClick={handleLeave} disabled={memberRole === 'owner' || actionLoading}
              className="flex-1 py-3.5 rounded-2xl bg-[#1C241C] border border-white/10 text-white/50 text-sm font-medium text-center disabled:opacity-30">
              {memberRole === 'owner' ? 'Owner' : 'Leave'}
            </button>
            <button onClick={() => router.push('/create?community=' + communityId)}
              className="flex-[2] py-3.5 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold text-center active:scale-95 transition-transform"
              style={{ boxShadow: '0 4px 18px rgba(232,184,75,0.28)' }}>
              Create Event
            </button>
          </div>
        ) : isPending ? (
          <button onClick={handleCancelRequest} disabled={actionLoading}
            className="w-full py-4 rounded-2xl bg-[#1C241C] border border-[#E8B84B]/30 text-[#E8B84B] text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50">
            ⏳ Request Sent — Tap to Cancel
          </button>
        ) : (
          <button onClick={handleJoin} disabled={actionLoading}
            className="w-full py-4 rounded-2xl bg-[#E8B84B] text-[#0D110D] text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            style={{ boxShadow: '0 5px 22px rgba(232,184,75,0.3)' }}>
            {actionLoading ? 'Sending...' : community.is_private
              ? <span className="flex items-center justify-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Request to Join
                </span>
              : '+ Join Community'
            }
          </button>
        )}
      </div>

      {showAddEventModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center" onClick={() => setShowAddEventModal(false)}>
          <div className="w-full max-w-md bg-[#1C241C] rounded-t-3xl p-5 pb-10 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 flex-shrink-0" />
            <div className="text-sm font-bold text-[#F0EDE6] mb-1 flex-shrink-0">Add an Existing Event</div>
            <div className="text-xs text-white/40 mb-4 flex-shrink-0">Select one of your events to add to this community.</div>
            {myEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 flex-1">
                <div className="w-12 h-12 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <p className="text-xs text-white/40 text-center">No eligible events found.</p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-2">
                {myEvents.map(event => (
                  <div key={event.id}
                    onClick={() => !addingEvent && handleAddEventToCommunity(event.id)}
                    className="flex items-center gap-3 bg-[#0D110D] border border-white/10 rounded-2xl p-3 cursor-pointer active:opacity-70">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden relative"
                      style={{ background: 'var(--gradient-event-hero)' }}>
                      {optimizedImgSrc(event.cover_url, 96) && (
                        <img src={optimizedImgSrc(event.cover_url, 96)!} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#F0EDE6] truncate">{event.title}</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="text-[#E8B84B] text-lg flex-shrink-0">{addingEvent ? '...' : '+'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-12 right-4 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white/70 text-lg">
            ×
          </button>
        </div>
      )}
    </div>
  )
}
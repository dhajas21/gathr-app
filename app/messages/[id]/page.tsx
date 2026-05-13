'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { optimizedImgSrc, isValidUUID, formatTime } from '@/lib/utils'

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const THREAD_RE = new RegExp('^' + UUID + '_' + UUID + '$', 'i')

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [other, setOther] = useState<any>(null)
  const [fromEventName, setFromEventName] = useState<string | null>(null)
  const fromEventIdRef = useRef<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [threadId, setThreadId] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [isOtherTyping, setIsOtherTyping] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [longPressMsg, setLongPressMsg] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uploadErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const presenceChannelRef = useRef<any>(null)
  const userIdRef = useRef<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const from = searchParams?.get('from')
    if (from && isValidUUID(from)) {
      fromEventIdRef.current = from
      supabase.from('events').select('title').eq('id', from).maybeSingle()
        .then(({ data }) => { if (data) setFromEventName(data.title) })
    }
    params.then(({ id }) => {
      if (!THREAD_RE.test(id)) { router.push('/messages'); return }
      setThreadId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        userIdRef.current = session.user.id
        fetchMessages(id, session.user.id)
      })
    })
  }, [params, searchParams, router])

  useEffect(() => {
    if (!threadId || !user) return
    const userId = user.id
    const presence = supabase.channel('typing-' + threadId)
    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState<{ typing: boolean; userId: string }>()
        const others = Object.values(state)
          .flatMap(v => v)
          .filter(p => p.userId !== userId)
        setIsOtherTyping(others.some(p => p.typing))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presence.track({ typing: false, userId })
      })
    presenceChannelRef.current = presence
    return () => {
      supabase.removeChannel(presence)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      if (uploadErrorTimerRef.current) clearTimeout(uploadErrorTimerRef.current)
    }
  }, [threadId, user?.id])

  useEffect(() => {
    if (!threadId) return
    // Guard async setState calls after unmount (e.g. user navigating away
    // while a realtime INSERT is mid-flight).
    let mounted = true
    const channel = supabase
      .channel('thread-' + threadId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'thread_id=eq.' + threadId
      }, async (payload) => {
        if (!mounted) return
        const msg = payload.new as any
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        scrollToBottom()
        if (userIdRef.current && msg.recipient_id === userIdRef.current && !msg.read_at) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: 'thread_id=eq.' + threadId
      }, (payload) => {
        if (!mounted) return
        const deleted = payload.old as any
        if (deleted?.id) setMessages(prev => prev.filter(m => m.id !== deleted.id))
      })
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [threadId])

  const clearUploadError = (delay: number) => {
    if (uploadErrorTimerRef.current) clearTimeout(uploadErrorTimerRef.current)
    uploadErrorTimerRef.current = setTimeout(() => setUploadError(''), delay)
  }

  const fetchMessages = async (tId: string, userId: string) => {
    try {
    // Fetch newest 150 first (desc), then reverse for chronological display
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', tId)
      .order('sent_at', { ascending: false })
      .limit(150)

    if (error) { console.error('Fetch error:', error); setLoading(false); return }

    if (data && data.length > 0) {
      const ordered = [...data].reverse()
      setMessages(ordered)
      setHasMore(data.length === 150)
      const otherId = ordered[0].sender_id === userId ? ordered[0].recipient_id : ordered[0].sender_id
      const { data: otherProfile } = await supabase
        .from('profiles').select('id, name, avatar_url').eq('id', otherId).single()
      if (otherProfile) setOther(otherProfile)
      // If opened without a ?from= param, check if a prior message recorded the event context
      if (!fromEventIdRef.current) {
        const eventCtxId = ordered.find((m: any) => m.event_id)?.event_id
        if (eventCtxId) {
          fromEventIdRef.current = eventCtxId
          supabase.from('events').select('title').eq('id', eventCtxId).maybeSingle()
            .then(({ data: ev }) => { if (ev) setFromEventName(ev.title) })
        }
      }
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', tId).eq('recipient_id', userId).is('read_at', null)
    } else {
      setHasMore(false)
      // New thread — parse other user from thread_id (format: "id1_id2" sorted)
      const parts = tId.split('_')
      const otherId = parts.find(p => p !== userId) || null
      if (otherId) {
        const { data: otherProfile } = await supabase
          .from('profiles').select('id, name, avatar_url').eq('id', otherId).single()
        if (otherProfile) setOther(otherProfile)
      }
    }
    scrollToBottom()
    } finally {
      setLoading(false)
    }
  }

  const loadEarlier = async () => {
    if (!messages.length || loadingEarlier) return
    setLoadingEarlier(true)
    const oldest = messages[0].sent_at
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: false })
      .lt('sent_at', oldest)
      .limit(150)
    if (data && data.length > 0) {
      setMessages(prev => [...[...data].reverse(), ...prev])
      setHasMore(data.length === 150)
    } else {
      setHasMore(false)
    }
    setLoadingEarlier(false)
  }

  const handleUnsend = async () => {
    if (!longPressMsg || !user) return
    const msg = longPressMsg
    setLongPressMsg(null)
    setMessages(prev => prev.filter(m => m.id !== msg.id))
    const { error } = await supabase.from('messages').delete().eq('id', msg.id).eq('sender_id', user.id)
    if (error) {
      setMessages(prev => [...prev, msg].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()))
      return
    }
    // Clean up storage attachment if this was an image or file message
    const t = msg.text || ''
    const storagePrefix = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') + '/storage/v1/object/public/chat-attachments/'
    let attachmentPath: string | null = null
    if (t.startsWith('[image]')) {
      const url = t.slice(7)
      if (url.startsWith(storagePrefix)) attachmentPath = url.slice(storagePrefix.length)
    } else {
      const fileMatch = t.match(/^\[file:.+?\](.+)$/)
      if (fileMatch && fileMatch[1].startsWith(storagePrefix)) attachmentPath = fileMatch[1].slice(storagePrefix.length)
    }
    if (attachmentPath) {
      await supabase.storage.from('chat-attachments').remove([attachmentPath])
    }
  }

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  const getRecipientId = () => {
    if (!user) return null
    if (messages.length > 0) {
      return messages[0].sender_id === user.id ? messages[0].recipient_id : messages[0].sender_id
    }
    // New thread — parse from thread_id format "id1_id2" (sorted)
    const parts = threadId.split('_')
    return parts.find(p => p !== user.id) || null
  }

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return
    const trimmed = text.trim()
    if (trimmed.length > 2000) return
    const recipientId = getRecipientId()
    if (!recipientId) return

    setSending(true)
    setText('')
    const { data: sent, error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      text: trimmed,
      ...(fromEventIdRef.current ? { event_id: fromEventIdRef.current } : {}),
    }).select().single()
    if (!error && sent) {
      setMessages(prev => prev.some(m => m.id === sent.id) ? prev : [...prev, sent])
      scrollToBottom()
    } else if (error) {
      setText(trimmed)
      setUploadError(error.message?.includes('rate_limit') ? 'Slow down — you\'re sending too fast' : 'Message failed to send. Tap to retry.')
      clearUploadError(3500)
    }
    setSending(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    setUploadError('')

    const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'pdf', 'txt']
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'text/plain']
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTS.includes(fileExt) || !ALLOWED_MIME.includes(file.type)) {
      setUploadError('File type not supported — images and PDFs only')
      clearUploadError(3000)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large — max 10 MB')
      clearUploadError(3000)
      return
    }

    const recipientId = getRecipientId()
    if (!recipientId) return

    setUploading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const path = `${threadId}/${Date.now()}.${ext}`

    const { error: storageError } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, { upsert: false })

    if (storageError) {
      console.error('Upload error:', storageError)
      setUploadError('Upload failed — try again')
      clearUploadError(3000)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path)
    if (!urlData?.publicUrl) { setUploading(false); return }

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext) && file.type.startsWith('image/')
    const msgText = isImage
      ? `[image]${urlData.publicUrl}`
      : `[file:${file.name}]${urlData.publicUrl}`

    const { error: msgError } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      text: msgText,
      ...(fromEventIdRef.current ? { event_id: fromEventIdRef.current } : {}),
    })

    setUploading(false)
    if (msgError) {
      setUploadError('File sent but message failed — try again')
      clearUploadError(3500)
      return
    }
    scrollToBottom()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }


  const SUPABASE_STORAGE_ORIGIN = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') + '/storage/v1/object/public/'
  const isSafeUrl = (url: string) => url.startsWith(SUPABASE_STORAGE_ORIGIN)

  const renderContent = (msg: any) => {
    const t = msg.text || ''
    if (t.startsWith('[image]')) {
      const url = t.slice(7)
      if (!isSafeUrl(url)) return <span>{t}</span>
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Image"
            className="max-w-[220px] rounded-xl object-cover"
            style={{ maxHeight: 260 }}
          />
        </a>
      )
    }
    const fileMatch = t.match(/^\[file:(.+?)\](.+)$/)
    if (fileMatch) {
      const fileUrl = fileMatch[2]
      if (!isSafeUrl(fileUrl)) return <span>{t}</span>
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <span className="text-base flex-shrink-0">📎</span>
          <span className="underline underline-offset-2 break-all text-xs">{fileMatch[1]}</span>
        </a>
      )
    }
    return <span>{t}</span>
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div className="w-10 h-10 bg-white/[0.07] rounded-xl animate-pulse flex-shrink-0" />
        <div className="h-4 w-28 bg-white/[0.07] rounded-xl animate-pulse" />
      </div>
      <div className="flex-1 px-4 py-4 space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className={'flex ' + (i % 2 === 0 ? 'justify-end' : 'justify-start')}>
            <div className={`h-10 rounded-2xl animate-pulse bg-white/[0.07] ${i % 2 === 0 ? 'w-48' : 'w-56'}`} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-[#0D110D] flex flex-col">

      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.back()}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          {'←'}
        </button>
        {optimizedImgSrc(other?.avatar_url, 96) ? (
          <img src={optimizedImgSrc(other.avatar_url, 96)!} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0"  loading="lazy" />
        ) : (
          <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-semibold text-[#7EC87E]">
            {other?.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#F0EDE6]">{other?.name || 'Chat'}</div>
          <div className="text-[10px] text-white/40">
            {fromEventName ? 'You met at ' + fromEventName : 'Connected via Gathr'}
          </div>
        </div>
        <button onClick={() => other && router.push('/profile/' + other.id)}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {hasMore && (
          <div className="flex justify-center pt-1 pb-2">
            <button
              onClick={loadEarlier}
              disabled={loadingEarlier}
              className="text-[10px] text-white/35 bg-[#1C241C] border border-white/10 rounded-full px-4 py-1.5 active:scale-95 transition-transform disabled:opacity-40"
            >
              {loadingEarlier ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && !hasMore && other && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
            <div className="w-14 h-14 bg-[#1C241C] border border-white/10 rounded-2xl flex items-center justify-center mx-auto">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[#F0EDE6]">Say hi to {other.name?.split(' ')[0] || 'them'}</p>
              <p className="text-xs text-white/35 mt-1 max-w-[240px] leading-relaxed">
                {fromEventName
                  ? 'You both said you\'d be at ' + fromEventName + '. Start the conversation.'
                  : 'New thread, no pressure. A short opener works best.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-[300px]">
              {[
                'Hey 👋',
                fromEventName ? 'Excited for ' + fromEventName + '!' : 'How\'s your week going?',
                'Want to grab coffee?',
              ].map(opener => (
                <button
                  key={opener}
                  onClick={() => setText(opener)}
                  className="text-xs bg-[#1C241C] border border-white/10 rounded-full px-3 py-1.5 text-white/55 active:scale-95 transition-transform"
                >
                  {opener}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine = msg.sender_id === user?.id
          const showTime = i === 0 ||
            new Date(msg.sent_at).getTime() - new Date(messages[i - 1]?.sent_at).getTime() > 300000
          const isImageMsg = (msg.text || '').startsWith('[image]')

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center text-[9px] text-white/20 my-3">
                  {formatTime(msg.sent_at)}
                </div>
              )}
              <div className={'flex items-end gap-2 ' + (mine ? 'flex-row-reverse' : '')}>
                {!mine && (
                  optimizedImgSrc(other?.avatar_url, 96) ? (
                    <img src={optimizedImgSrc(other.avatar_url, 96)!} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0"  loading="lazy" />
                  ) : (
                    <div className="w-6 h-6 bg-[#2A4A2A] rounded-md flex items-center justify-center text-[9px] flex-shrink-0">
                      {other?.name?.charAt(0) || '?'}
                    </div>
                  )
                )}
                <div
                  className={
                    isImageMsg
                      ? 'max-w-[78%] overflow-hidden rounded-2xl ' + (mine ? 'rounded-br-sm' : 'rounded-bl-sm')
                      : 'max-w-[78%] px-3 py-2 text-sm leading-relaxed ' + (
                        mine
                          ? 'bg-[#E8B84B] text-[#0D110D] rounded-2xl rounded-br-sm font-medium'
                          : 'bg-[#1C241C] text-[#F0EDE6] rounded-2xl rounded-bl-sm'
                      )
                  }
                  onTouchStart={() => {
                    if (!mine) return
                    longPressTimer.current = setTimeout(() => setLongPressMsg(msg), 500)
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current)
                  }}
                  onTouchMove={() => {
                    if (longPressTimer.current) clearTimeout(longPressTimer.current)
                  }}
                  onContextMenu={(e) => {
                    if (!mine) return
                    e.preventDefault()
                    setLongPressMsg(msg)
                  }}
                >
                  {renderContent(msg)}
                </div>
              </div>
            </div>
          )
        })}

        {uploading && (
          <div className="flex justify-end">
            <div className="bg-[#1C241C] border border-white/10 rounded-2xl rounded-br-sm px-4 py-2.5 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-[#E8B84B] border-t-transparent animate-spin" />
              <span className="text-xs text-white/40">Uploading…</span>
            </div>
          </div>
        )}
      </div>

      {isOtherTyping && (
        <div className="px-4 pb-1 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#1C241C] border border-white/[0.07] rounded-2xl rounded-bl-sm px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mx-4 mb-2 bg-[#E85B5B]/10 border border-[#E85B5B]/25 rounded-xl px-3 py-2 text-xs text-[#E85B5B] text-center">
          {uploadError}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex items-center gap-2 px-4 py-3 pb-8 border-t border-white/10 flex-shrink-0 bg-[#0D110D]">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-8 h-8 bg-[#1C241C] border border-white/10 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <div className="flex-1 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5">
          <input
            type="text"
            value={text}
            onChange={e => {
              setText(e.target.value)
              presenceChannelRef.current?.track({ typing: true, userId: user.id })
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
              typingTimeoutRef.current = setTimeout(() => {
                presenceChannelRef.current?.track({ typing: false, userId: user.id })
              }, 2000)
            }}
            onKeyDown={handleKeyDown}
            placeholder={'Message ' + (other?.name || '') + '...'}
            maxLength={2000}
            style={{ fontSize: '16px' }}
            className="w-full bg-transparent text-[#F0EDE6] placeholder-white/30 outline-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-8 h-8 bg-[#E8B84B] rounded-lg flex items-center justify-center text-sm text-[#0D110D] flex-shrink-0 disabled:opacity-40 active:scale-95 transition-all"
          style={{
            boxShadow: text.trim() && !sending
              ? '0 0 18px rgba(232,184,75,0.45), 0 2px 8px rgba(232,184,75,0.25)'
              : 'none',
          }}
        >
          ↑
        </button>
      </div>

      {/* Unsend sheet */}
      {longPressMsg && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setLongPressMsg(null)}
        >
          <div
            className="w-full max-w-md bg-[#1C241C] rounded-t-3xl pb-10 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
            <div className="px-4 pb-2 text-[10px] text-white/30 truncate">
              {(longPressMsg.text || '').startsWith('[image]') ? '📷 Image'
                : (longPressMsg.text || '').startsWith('[file:') ? '📎 File'
                : longPressMsg.text}
            </div>
            <button
              onClick={handleUnsend}
              className="w-full px-4 py-4 text-left text-sm text-[#E85B5B] font-medium active:bg-white/[0.03] transition-colors"
            >
              Unsend
            </button>
            <button
              onClick={() => setLongPressMsg(null)}
              className="w-full px-4 py-4 text-left text-sm text-white/40 active:bg-white/[0.03] transition-colors border-t border-white/[0.06]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

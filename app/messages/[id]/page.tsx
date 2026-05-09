'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, setUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [other, setOther] = useState<any>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [threadId, setThreadId] = useState('')
  const [uploadError, setUploadError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    params.then(({ id }) => {
      setThreadId(id)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) { router.push('/auth'); return }
        setUser(session.user)
        fetchMessages(id, session.user.id)
      })
    })
  }, [])

  useEffect(() => {
    if (!threadId) return
    const channel = supabase
      .channel('thread-' + threadId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'thread_id=eq.' + threadId
      }, async (payload) => {
        const msg = payload.new as any
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        scrollToBottom()
        const { data: { session } } = await supabase.auth.getSession()
        if (session && msg.recipient_id === session.user.id && !msg.read_at) {
          await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [threadId])

  const fetchMessages = async (tId: string, userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', tId)
      .order('sent_at', { ascending: true })

    if (error) { console.error('Fetch error:', error); setLoading(false); return }

    if (data && data.length > 0) {
      setMessages(data)
      const otherId = data[0].sender_id === userId ? data[0].recipient_id : data[0].sender_id
      const { data: otherProfile } = await supabase
        .from('profiles').select('id, name, avatar_url').eq('id', otherId).single()
      if (otherProfile) setOther(otherProfile)
      await supabase.from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', tId).eq('recipient_id', userId).is('read_at', null)
    } else {
      // New thread — parse other user from thread_id (format: "id1_id2" sorted)
      const parts = tId.split('_')
      const otherId = parts.find(p => p !== userId) || null
      if (otherId) {
        const { data: otherProfile } = await supabase
          .from('profiles').select('id, name, avatar_url').eq('id', otherId).single()
        if (otherProfile) setOther(otherProfile)
      }
    }
    setLoading(false)
    scrollToBottom()
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
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
    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      text: trimmed,
    })
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: user.id,
        type: 'message',
        title: 'sent you a message',
        body: trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
        link: '/messages/' + threadId,
        read: false,
      })
    } else {
      console.error('Send error:', error)
    }
    setSending(false)
    scrollToBottom()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    setUploadError('')

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large — max 10 MB')
      setTimeout(() => setUploadError(''), 3000)
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
      setTimeout(() => setUploadError(''), 3000)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path)
    if (!urlData?.publicUrl) { setUploading(false); return }

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext)
    const msgText = isImage
      ? `[image]${urlData.publicUrl}`
      : `[file:${file.name}]${urlData.publicUrl}`

    await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      text: msgText,
    })

    setUploading(false)
    scrollToBottom()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dt: string) =>
    new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const renderContent = (msg: any) => {
    const t = msg.text || ''
    if (t.startsWith('[image]')) {
      const url = t.slice(7)
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
      return (
        <a
          href={fileMatch[2]}
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
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="h-screen bg-[#0D110D] flex flex-col">

      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.push('/messages')}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">🧑</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#F0EDE6]">{other?.name || 'Chat'}</div>
          <div className="text-[10px] text-white/40">Connected via Gathr</div>
        </div>
        <button onClick={() => other && router.push('/profile/' + other.id)}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-sm">
          👤
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                  other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 bg-[#2A4A2A] rounded-md flex items-center justify-center text-[9px] flex-shrink-0">
                      {other?.name?.charAt(0) || '?'}
                    </div>
                  )
                )}
                <div className={
                  isImageMsg
                    ? 'max-w-[78%] overflow-hidden rounded-2xl ' + (mine ? 'rounded-br-sm' : 'rounded-bl-sm')
                    : 'max-w-[78%] px-3 py-2 text-sm leading-relaxed ' + (
                      mine
                        ? 'bg-[#E8B84B] text-[#0D110D] rounded-2xl rounded-br-sm font-medium'
                        : 'bg-[#1C241C] text-[#F0EDE6] rounded-2xl rounded-bl-sm'
                    )
                }>
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

      {uploadError && (
        <div className="mx-4 mb-2 bg-[#E85B5B]/10 border border-[#E85B5B]/25 rounded-xl px-3 py-2 text-xs text-[#E85B5B] text-center">
          {uploadError}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex items-center gap-2 px-4 py-3 pb-8 border-t border-white/10 flex-shrink-0 bg-[#0D110D]">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-8 h-8 bg-[#1C241C] border border-white/10 rounded-lg flex items-center justify-center text-sm flex-shrink-0 active:scale-95 transition-transform disabled:opacity-40"
        >
          📎
        </button>
        <div className="flex-1 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Message ' + (other?.name || '') + '...'}
            maxLength={2000}
            className="w-full bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-8 h-8 bg-[#E8B84B] rounded-lg flex items-center justify-center text-sm text-[#0D110D] flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
        >
          ↑
        </button>
      </div>
    </div>
  )
}

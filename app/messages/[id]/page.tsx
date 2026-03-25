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
  const [loading, setLoading] = useState(true)
  const [threadId, setThreadId] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
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

  // Real-time subscription
  useEffect(() => {
    if (!threadId) return
    const channel = supabase
      .channel(`thread-${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        scrollToBottom()
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

    if (error) {
      console.error('Fetch error:', error)
      return
    }

    if (data && data.length > 0) {
      setMessages(data)

      // Get the other person's profile
      const otherId = data[0].sender_id === userId ? data[0].recipient_id : data[0].sender_id
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', otherId)
        .single()
      if (otherProfile) setOther(otherProfile)

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('thread_id', tId)
        .eq('recipient_id', userId)
        .is('read_at', null)
    }
    setLoading(false)
    scrollToBottom()
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return
    const trimmed = text.trim()
    if (trimmed.length > 2000) return

    setSending(true)
    setText('')

    // Get the recipient from existing messages
    const recipientId = messages[0]?.sender_id === user.id
      ? messages[0]?.recipient_id
      : messages[0]?.sender_id

    if (!recipientId) { setSending(false); return }

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      recipient_id: recipientId,
      text: trimmed,
    })

    if (error) console.error('Send error:', error)
    setSending(false)
    scrollToBottom()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dt: string) => {
    return new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0D110D] flex items-center justify-center">
      <div className="text-[#E8B84B] text-2xl font-bold">Gathr.</div>
    </div>
  )

  return (
    <div className="h-screen bg-[#0D110D] flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => router.push('/messages')}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-[#F0EDE6]">
          ←
        </button>
        <div className="w-9 h-9 bg-[#1E3A1E] rounded-xl flex items-center justify-center text-base flex-shrink-0">🧑</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#F0EDE6]">{other?.name || 'Chat'}</div>
          <div className="text-[10px] text-white/40">Connected via Gathr</div>
        </div>
        <button onClick={() => other && router.push(`/profile/${other.id}`)}
          className="w-9 h-9 bg-[#1C241C] border border-white/10 rounded-xl flex items-center justify-center text-sm">
          👤
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => {
          const mine = msg.sender_id === user?.id
          const showTime = i === 0 || 
            new Date(msg.sent_at).getTime() - new Date(messages[i-1]?.sent_at).getTime() > 300000

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center text-[9px] text-white/20 my-3">
                  {formatTime(msg.sent_at)}
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                {!mine && (
                  <div className="w-6 h-6 bg-[#2A4A2A] rounded-md flex items-center justify-center text-[9px] flex-shrink-0">
                    {other?.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className={`max-w-[78%] px-3 py-2 text-sm leading-relaxed ${
                  mine
                    ? 'bg-[#E8B84B] text-[#0D110D] rounded-2xl rounded-br-sm font-medium'
                    : 'bg-[#1C241C] text-[#F0EDE6] rounded-2xl rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-4 py-3 pb-8 border-t border-white/10 flex-shrink-0 bg-[#0D110D]">
        <button className="w-8 h-8 bg-[#1C241C] border border-white/10 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
          📎
        </button>
        <div className="flex-1 bg-[#1C241C] border border-white/10 rounded-2xl px-4 py-2.5">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${other?.name || ''}...`}
            maxLength={2000}
            className="w-full bg-transparent text-sm text-[#F0EDE6] placeholder-white/30 outline-none"
          />
        </div>
        <button onClick={handleSend} disabled={!text.trim() || sending}
          className="w-8 h-8 bg-[#E8B84B] rounded-lg flex items-center justify-center text-sm text-[#0D110D] flex-shrink-0 disabled:opacity-40 active:scale-95 transition-transform">
          ↑
        </button>
      </div>
    </div>
  )
}
import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { ChatMessage } from './ChatMessage'
import type { ChatChannel } from '@/types/game'

interface ChatPanelProps {
  /** Force a specific tab to be visible (e.g. only 'day' in lobby) */
  defaultChannel?: ChatChannel
  /** Restrict visible tabs (e.g. ['day'] for lobby) */
  visibleChannels?: ChatChannel[]
}

const CHANNEL_LABELS: Record<ChatChannel, string> = {
  day: '☀️ Town',
  wolf: '🐺 Pack',
  ghost: '👻 Spirits',
  system: '📜 System',  // kept for type-safety but never shown as a tab
}

export function ChatPanel({ defaultChannel = 'day', visibleChannels }: ChatPanelProps) {
  const [activeChannel, setActiveChannel] = useState<ChatChannel>(defaultChannel)
  const [text, setText] = useState('')
  const [atBottom, setAtBottom] = useState(true)
  const [newBadge, setNewBadge] = useState(false)
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    function onRateLimited(e: Event) {
      const { retryAfter } = (e as CustomEvent<{ channel: string; retryAfter: number }>).detail
      setRateLimitMsg(`Slow down — retry in ${retryAfter}s`)
      setTimeout(() => setRateLimitMsg(null), retryAfter * 1000)
    }
    window.addEventListener('chat:rate_limited', onRateLimited)
    return () => window.removeEventListener('chat:rate_limited', onRateLimited)
  }, [])

  const chatLogs = useGameStore((s) => s.chatLogs)
  const role = useGameStore((s) => s.role)
  const alive = useGameStore((s) => s.alive)
  const myId = useAuthStore((s) => s.playerId)

  const isDead = !alive.includes(myId ?? '')

  const tabs: ChatChannel[] = visibleChannels ?? (() => {
    const t: ChatChannel[] = ['day']
    if (role === 'werewolf') t.push('wolf')
    if (isDead) t.push('ghost')
    return t
  })()

  const messages = chatLogs[activeChannel] ?? []

  // Auto-scroll
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (atBottom) {
      el.scrollTop = el.scrollHeight
    } else {
      setNewBadge(true)
    }
  }, [messages.length])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    setAtBottom(bottom)
    if (bottom) setNewBadge(false)
  }

  function scrollToBottom() {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setAtBottom(true)
    setNewBadge(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function send() {
    const trimmed = text.trim()
    if (!trimmed) return
    socketEvents.sendChat(activeChannel, trimmed)
    setText('')
    inputRef.current?.focus()
  }

  const canSend = activeChannel === 'day' || activeChannel === 'wolf'
    ? !isDead
    : activeChannel === 'ghost'
    ? isDead
    : false

  return (
    <div className="relative flex flex-col h-full bg-navy-mid border border-cyan-game/20 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-cyan-game/15 bg-navy-surface overflow-x-auto">
        {tabs.map((ch) => (
          <button
            key={ch}
            onClick={() => { setActiveChannel(ch); setNewBadge(false) }}
            className={[
              'px-3 py-2 text-xs font-sans whitespace-nowrap flex-shrink-0 border-b-2 transition-colors',
              activeChannel === ch
                ? 'border-candle text-white/80 font-semibold'
                : 'border-transparent text-white/50 hover:text-white/60',
            ].join(' ')}
          >
            {CHANNEL_LABELS[ch]}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2 space-y-0.5 min-h-0"
      >
        {messages.length === 0 && (
          <p className="text-center text-white/40 text-xs font-sans py-8 italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.messageId} message={msg} />
        ))}
      </div>

      {/* New message badge */}
      {newBadge && !atBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-candle text-white text-xs rounded-full px-3 py-1 shadow"
        >
          ↓ New message
        </button>
      )}

      {/* Rate limit toast */}
      {rateLimitMsg && (
        <div className="px-3 py-1.5 bg-action-vote/10 border-t border-action-vote/30 text-xs text-action-vote font-sans text-center">
          ⚠ {rateLimitMsg}
        </div>
      )}

      {/* Input */}
      {canSend && (
        <div className="border-t border-cyan-game/15 p-2 flex gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none bg-navy-mid border border-cyan-game/20 rounded-lg px-3 py-2 text-sm font-sans text-white focus:outline-none focus:ring-1 focus:ring-candle"
            style={{ maxHeight: '80px', overflowY: 'auto' }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-3 py-2 bg-candle rounded-lg text-sm font-sans text-white disabled:opacity-40"
          >
            ↵
          </button>
        </div>
      )}

      {!canSend && (
        <div className="border-t border-cyan-game/15 p-2 text-center text-xs text-white/40 font-sans italic">
          You cannot send messages in this channel
        </div>
      )}
    </div>
  )
}

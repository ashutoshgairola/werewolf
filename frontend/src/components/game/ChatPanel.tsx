import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { socketEvents } from '@/socket/events'
import { getPlayerColor } from '@/utils/playerColor'
import type { ChatMessage } from '@/types/game'

interface ChatPanelProps {
  // Which channel to send to ('day' | 'wolf')
  sendChannel?: 'day' | 'wolf'
  // Whether the current user can send
  canSend?: boolean
}

function SystemBubble({ text }: { text: string }) {
  return (
    <div className="px-4 py-0.5 flex justify-center">
      <span className="text-xs italic text-white/45 text-center">{text}</span>
    </div>
  )
}

function MessageBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  const roomPlayers = useRoomStore((s) => s.players)
  const senderId = message.senderId ?? ''
  const color = getPlayerColor(senderId)

  // Find initials
  const player = roomPlayers.find((p) => p.playerId === senderId)
  const name = player?.displayName ?? message.senderName ?? '?'
  const inits = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  if (isMe) {
    return (
      <div className="flex flex-row-reverse items-end gap-1.5 px-3 py-0.5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: `${color}33`, color, border: `1.5px solid ${color}` }}
        >
          {inits}
        </div>
        <div
          className="max-w-[70%] rounded-2xl rounded-br-sm px-3 py-1.5 text-sm text-white break-words"
          style={{ background: `${color}55`, border: `1px solid ${color}66` }}
        >
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-1.5 px-3 py-0.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: `${color}33`, color, border: `1.5px solid ${color}` }}
      >
        {inits}
      </div>
      <div className="max-w-[70%] flex flex-col gap-0.5">
        <span className="text-[10px] pl-1" style={{ color }}>{name}</span>
        <div className="bg-navy-surface/80 border border-white/10 rounded-2xl rounded-bl-sm px-3 py-1.5 text-sm text-white break-words">
          {message.text}
        </div>
      </div>
    </div>
  )
}

export function ChatPanel({ sendChannel = 'day', canSend = true }: ChatPanelProps) {
  const [text, setText] = useState('')
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null)
  const [atBottom, setAtBottom] = useState(true)
  const [newBadge, setNewBadge] = useState(false)
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
  const alive = useGameStore((s) => s.alive)
  const myId = useAuthStore((s) => s.playerId) ?? ''
  const isDead = !alive.includes(myId)

  // Merge day + system messages, sorted by order they were added (they arrive in order)
  const dayMessages = chatLogs[sendChannel] ?? []
  const systemMessages = chatLogs.system ?? []

  // Interleave: system messages that have a messageId in order with day messages
  // Since we can't rely on timestamps, just concat and let server ordering handle it
  // The server sends system messages on 'day' channel in the new design
  const messages = dayMessages

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (atBottom) {
      el.scrollTop = el.scrollHeight
    } else {
      setNewBadge(true)
    }
  }, [messages.length, systemMessages.length])

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
    socketEvents.sendChat(sendChannel, trimmed)
    setText('')
    inputRef.current?.focus()
  }

  const actualCanSend = canSend && !isDead

  return (
    <div className="relative flex flex-col h-full">
      {/* Messages feed — no background box */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-2 space-y-0.5 min-h-0"
      >
        {messages.length === 0 && systemMessages.length === 0 && (
          <p className="text-center text-white/30 text-xs py-6 italic">No messages yet</p>
        )}
        {/* System messages shown above */}
        {systemMessages.map((msg) => (
          <SystemBubble key={msg.messageId} text={msg.text} />
        ))}
        {messages.map((msg) => {
          if (msg.senderId === null) {
            return <SystemBubble key={msg.messageId} text={msg.text} />
          }
          return (
            <MessageBubble
              key={msg.messageId}
              message={msg}
              isMe={msg.senderId === myId}
            />
          )
        })}
      </div>

      {newBadge && !atBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-cyan-game/90 text-white text-xs rounded-full px-3 py-1 shadow z-10"
        >
          ↓ New message
        </button>
      )}

      {rateLimitMsg && (
        <div className="px-3 py-1.5 bg-action-vote/10 border-t border-action-vote/30 text-xs text-action-vote text-center">
          ⚠ {rateLimitMsg}
        </div>
      )}

      {actualCanSend && (
        <div className="flex-shrink-0 px-3 pb-2 pt-1 flex gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none bg-navy-light/60 border border-white/15 rounded-2xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-game/50"
            style={{ maxHeight: '80px', overflowY: 'auto' }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="px-3 py-2 bg-cyan-game/80 rounded-2xl text-sm text-white disabled:opacity-30"
          >
            ↵
          </button>
        </div>
      )}
    </div>
  )
}

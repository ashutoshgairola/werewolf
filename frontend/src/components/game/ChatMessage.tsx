import type { ChatMessage as ChatMessageType } from '@/types/game'
import { useAuthStore } from '@/stores/authStore'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const myId = useAuthStore((s) => s.playerId)
  const isSystem = message.senderId === null
  const isMe = message.senderId === myId

  if (isSystem) {
    return (
      <div className="px-3 py-1 text-center">
        <span className="text-xs italic text-wood/50 font-body">{message.text}</span>
      </div>
    )
  }

  return (
    <div className={`flex gap-2 px-3 py-1 ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-wood text-parchment flex items-center justify-center text-xs font-tavern flex-shrink-0 mt-0.5">
        {message.senderName.slice(0, 2).toUpperCase()}
      </div>
      <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isMe && (
          <span className="text-xs text-wood/60 font-body">{message.senderName}</span>
        )}
        <div
          className={`rounded-xl px-3 py-1.5 text-sm font-body break-words ${
            isMe
              ? 'bg-candle/80 text-ink rounded-tr-sm'
              : 'bg-parchment-light border border-wood/30 text-ink rounded-tl-sm'
          }`}
        >
          {message.text}
        </div>
      </div>
    </div>
  )
}

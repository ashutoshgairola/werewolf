import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'

export function SkipVoteBar() {
  const [clicked, setClicked] = useState(false)
  const skipVote = useGameStore((s) => s.skipVote)
  const alive = useGameStore((s) => s.alive)
  const myId = useAuthStore((s) => s.playerId)
  const isAlive = alive.includes(myId ?? '')

  if (!isAlive) return null

  // PRD §9: ALL living players must skip to end discussion early
  const needed = skipVote?.aliveCount || alive.length
  const count = skipVote?.skipCount ?? 0

  function handleSkip() {
    if (clicked) return
    setClicked(true)
    socketEvents.skipToVote()
  }

  return (
    <div className="flex items-center gap-3 bg-parchment-light border border-wood/30 rounded-lg px-4 py-2">
      <button
        onClick={handleSkip}
        disabled={clicked}
        className="text-sm font-body text-candle hover:text-candle-dim disabled:opacity-50 disabled:cursor-default underline"
      >
        Skip to Vote
      </button>
      <span className="text-xs text-wood/50 font-body">
        {count}/{needed} needed
      </span>
      {count > 0 && (
        <div className="flex-1 h-1 bg-wood/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-candle rounded-full transition-all"
            style={{ width: `${Math.min(100, (count / needed) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

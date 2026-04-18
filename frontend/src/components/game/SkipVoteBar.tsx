import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'

export function SkipVoteBar() {
  const skipVote = useGameStore((s) => s.skipVote)
  const daySkipVotes = useGameStore((s) => s.daySkipVotes)
  const addDaySkipVote = useGameStore((s) => s.addDaySkipVote)
  const alive = useGameStore((s) => s.alive)
  const myId = useAuthStore((s) => s.playerId)
  const isAlive = alive.includes(myId ?? '')
  // Derive from store so reconnecting players see their prior skip vote
  const clicked = daySkipVotes.includes(myId ?? '')

  if (!isAlive) return null

  // PRD §9: ALL living players must skip to end discussion early
  const needed = skipVote?.aliveCount || alive.length
  const count = skipVote?.skipCount ?? 0

  function handleSkip() {
    if (clicked || !myId) return
    addDaySkipVote(myId)
    socketEvents.skipToVote()
  }

  return (
    <div className="flex items-center gap-3 bg-navy-light/50 border border-cyan-game/20 rounded-xl px-4 py-2 mx-2 flex-shrink-0">
      <button
        onClick={handleSkip}
        disabled={clicked}
        className="text-sm font-sans text-cyan-game hover:text-cyan-glow disabled:opacity-40 disabled:cursor-default underline"
      >
        {clicked ? 'Voted to skip' : 'Skip to Vote'}
      </button>
      <span className="text-xs text-white/40 font-sans">
        {count}/{needed}
      </span>
      {count > 0 && (
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-game rounded-full transition-all"
            style={{ width: `${Math.min(100, (count / needed) * 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

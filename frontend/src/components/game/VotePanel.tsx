import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { socketEvents } from '@/socket/events'
import { PlayerCard } from './PlayerCard'
import type { Role } from '@/types/game'

export function VotePanel() {
  const alive = useGameStore((s) => s.alive)
  const dayVotes = useGameStore((s) => s.dayVotes)
  const dayVoteTallies = useGameStore((s) => s.dayVoteTallies)
  const roles = useGameStore((s) => s.roles)
  const players = useRoomStore((s) => s.players)
  const myId = useAuthStore((s) => s.playerId)!

  // Initialize from store so reconnecting players see their prior vote highlighted
  const [myVote, setMyVote] = useState<string | null>(() => dayVotes[myId] ?? null)

  const isAlive = alive.includes(myId)

  function handleVote(targetId: string) {
    if (!isAlive) return
    if (myVote === targetId) {
      // Retract
      setMyVote(null)
      socketEvents.dayVote(null)
    } else {
      setMyVote(targetId)
      socketEvents.dayVote(targetId)
    }
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <p className="text-xs sm:text-sm font-body text-wood/60 text-center">
        {isAlive
          ? myVote
            ? 'Tap again to retract'
            : 'Tap a player to vote for elimination'
          : 'You are eliminated — watching the vote'}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
        {players
          .map((p) => {
            const isPlayerAlive = alive.includes(p.playerId)
            const role = roles[p.playerId] as Role | undefined
            const voteCount = dayVoteTallies[p.playerId] ?? 0

            return (
              <PlayerCard
                key={p.playerId}
                playerId={p.playerId}
                displayName={p.displayName}
                isAlive={isPlayerAlive}
                role={role}
                greyDead={true}
                voteCount={voteCount > 0 ? voteCount : undefined}
                selected={myVote === p.playerId}
                disabled={!isAlive || p.playerId === myId}
                onClick={() => handleVote(p.playerId)}
              />
            )
          })}
      </div>

      {myVote && (
        <button
          onClick={() => { setMyVote(null); socketEvents.dayVote(null) }}
          className="w-full text-sm font-body text-ember hover:underline py-1"
        >
          Retract vote
        </button>
      )}
    </div>
  )
}

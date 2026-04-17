import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { PlayerCard } from './PlayerCard'
import type { Role } from '@/types/game'

interface PlayerGridProps {
  /** Only include players passing this filter */
  filter?: (playerId: string) => boolean
  /** Currently selected player */
  selectedId?: string | null
  /** Disabled player ids */
  disabledIds?: string[]
  /** Badge overlay per player */
  badge?: (playerId: string) => React.ReactNode
  onSelect?: (playerId: string) => void
  /** Show dead players (greyed out, non-clickable) */
  showDead?: boolean
  /** Whether to disable the current player's own card (default true) */
  excludeSelf?: boolean
}

export function PlayerGrid({
  filter,
  selectedId,
  disabledIds = [],
  badge,
  onSelect,
  showDead = false,
  excludeSelf = true,
}: PlayerGridProps) {
  const players = useRoomStore((s) => s.players)
  const alive = useGameStore((s) => s.alive)
  const roles = useGameStore((s) => s.roles)
  const dayVoteTallies = useGameStore((s) => s.dayVoteTallies)
  const myId = useAuthStore((s) => s.playerId)

  const displayed = players.filter((p) => {
    const isAlive = alive.includes(p.playerId)
    if (!showDead && !isAlive) return false
    if (filter && !filter(p.playerId)) return false
    return true
  })

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
      {displayed.map((p) => {
        const isAlive = alive.includes(p.playerId)
        const role = roles[p.playerId] as Role | undefined

        const voteCount = dayVoteTallies[p.playerId] ?? 0

        return (
          <PlayerCard
            key={p.playerId}
            playerId={p.playerId}
            displayName={p.displayName}
            isAlive={isAlive}
            role={role}
            voteCount={voteCount > 0 ? voteCount : undefined}
            selected={selectedId === p.playerId}
            disabled={disabledIds.includes(p.playerId) || (excludeSelf && p.playerId === myId)}
            badge={badge?.(p.playerId)}
            onClick={() => isAlive && onSelect?.(p.playerId)}
          />
        )
      })}
    </div>
  )
}

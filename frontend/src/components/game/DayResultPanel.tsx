import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'
import { ROLE_INFO } from '@/types/game'
import type { Role } from '@/types/game'

export function DayResultPanel() {
  const lynchedPlayerId = useGameStore((s) => s.lynchedPlayerId)
  const roles = useGameStore((s) => s.roles)
  const players = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const done = usePhaseAutoAdvance(phaseEndsAt)

  const lynchedPlayer = lynchedPlayerId
    ? players.find((p) => p.playerId === lynchedPlayerId)
    : null
  const lynchedRole = lynchedPlayerId ? (roles[lynchedPlayerId] as Role | undefined) : undefined

  return (
    <div
      className={[
        'min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-parchment transition-opacity duration-1000',
        done ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
    >
      <span className="text-6xl">⚖️</span>

      {lynchedPlayer ? (
        <div className="space-y-3">
          <p className="font-tavern text-wood-dark text-2xl">The village has decided</p>
          <div className="bg-ember/10 border border-ember/40 rounded-2xl px-8 py-5">
            <p className="text-wood/60 font-body text-sm mb-1">Eliminated by vote:</p>
            <p className="font-tavern text-3xl text-ink">{lynchedPlayer.displayName}</p>
            {lynchedRole && (
              <p className="text-wood/60 font-body text-sm mt-2">
                {ROLE_INFO[lynchedRole].icon} {ROLE_INFO[lynchedRole].name}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-parchment-light border border-wood/30 rounded-2xl px-8 py-5">
          <p className="font-tavern text-wood-dark text-2xl">No consensus</p>
          <p className="text-wood/60 font-body text-sm mt-2">The vote ended in a tie — no one was eliminated</p>
        </div>
      )}

      <p className="text-wood/40 text-xs font-body">Continuing shortly…</p>
    </div>
  )
}

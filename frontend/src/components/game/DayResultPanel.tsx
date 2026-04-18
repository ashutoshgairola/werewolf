import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { ROLE_INFO } from '@/types/game'
import type { Role } from '@/types/game'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'

function SeatCircle({ num }: { num: number | string }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full
      bg-seat-num text-black text-[9px] font-black mx-0.5 align-middle">
      {num}
    </span>
  )
}

export function DayResultPanel() {
  const lynchedId = useGameStore((s) => s.lynchedPlayerId)
  const dayVotes = useGameStore((s) => s.dayVotes)
  const roles = useGameStore((s) => s.roles)
  const players = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  usePhaseAutoAdvance(phaseEndsAt)

  const seatOf = (id: string): number =>
    players.findIndex(p => p.playerId === id) + 1

  const lynchedPlayer = lynchedId
    ? players.find(p => p.playerId === lynchedId)
    : null

  const lynchedRole = lynchedId ? (roles[lynchedId] as Role | undefined) : undefined
  const lynchedSeat = lynchedId ? seatOf(lynchedId) : null

  const votesForLynched = Object.entries(dayVotes)
    .filter(([, targetId]) => targetId === lynchedId)
    .map(([voterId]) => voterId)

  const abstainers = players
    .filter(p => !dayVotes[p.playerId] && p.playerId !== lynchedId)
    .map(p => p.playerId)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
      <div className="bg-navy-mid/85 border border-cyan-game/30 rounded-2xl
        px-6 py-5 backdrop-blur-sm w-full max-w-sm sm:max-w-md">
        <h3 className="text-cyan-game text-sm font-black uppercase tracking-widest text-center mb-4">
          Vote Result
        </h3>

        {lynchedPlayer ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-seat-num text-black
                font-black text-sm flex items-center justify-center flex-shrink-0">
                {lynchedSeat}
              </div>
              <span className="text-white text-sm">
                No.{lynchedSeat} has died by vote —{' '}
                <span className="text-action-vote font-bold">
                  {lynchedRole ? (ROLE_INFO[lynchedRole]?.name ?? lynchedRole) : 'Unknown'}
                </span>
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-white/60">
              {votesForLynched.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <SeatCircle num={lynchedSeat ?? '?'} />
                  <span className="text-white/40">◀</span>
                  {votesForLynched.map(id => (
                    <SeatCircle key={id} num={seatOf(id)} />
                  ))}
                </div>
              )}
              {abstainers.map(id => (
                <div key={id} className="flex items-center gap-1">
                  <span>✋</span>
                  <span className="text-white/40">◀</span>
                  <SeatCircle num={seatOf(id)} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-white/60 text-sm text-center py-2">
            🤝 Tie — no one was eliminated
          </p>
        )}

        <p className="text-white/30 text-xs text-center mt-4">
          Please wait for other players' actions
        </p>
      </div>
    </div>
  )
}

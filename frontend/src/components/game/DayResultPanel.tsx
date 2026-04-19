import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { ROLE_INFO } from '@/types/game'
import type { Role } from '@/types/game'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'
import { getPlayerColor } from '@/utils/playerColor'

function PlayerAvatar({ playerId, displayName }: { playerId: string; displayName: string }) {
  const color = getPlayerColor(playerId)
  const inits = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0"
      style={{ background: `${color}33`, color, border: `1.5px solid ${color}` }}
      title={displayName}
    >
      {inits}
    </span>
  )
}

export function DayResultPanel() {
  const lynchedId = useGameStore((s) => s.lynchedPlayerId)
  const dayVotes = useGameStore((s) => s.dayVotes)
  const roles = useGameStore((s) => s.roles)
  const alive = useGameStore((s) => s.alive)
  const gamePlayers = useGameStore((s) => s.players)
  const roomPlayers = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  usePhaseAutoAdvance(phaseEndsAt)

  const playerOf = (id: string) =>
    gamePlayers.find(p => p.playerId === id) ?? roomPlayers.find(p => p.playerId === id)

  const lynchedPlayer = lynchedId ? playerOf(lynchedId) : null
  const lynchedRole = lynchedId ? (roles[lynchedId] as Role | undefined) : undefined

  const votesForLynched = Object.entries(dayVotes)
    .filter(([, targetId]) => targetId === lynchedId)
    .map(([voterId]) => voterId)

  const abstainers = roomPlayers
    .filter(p => alive.includes(p.playerId) && !dayVotes[p.playerId] && p.playerId !== lynchedId)

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
              <PlayerAvatar playerId={lynchedPlayer.playerId} displayName={lynchedPlayer.displayName} />
              <span className="text-white text-sm">
                <span className="font-bold">{lynchedPlayer.displayName}</span> was voted out —{' '}
                <span className="text-action-vote font-bold">
                  {lynchedRole ? (ROLE_INFO[lynchedRole]?.name ?? lynchedRole) : 'Unknown'}
                </span>
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-white/60">
              {votesForLynched.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <PlayerAvatar playerId={lynchedPlayer.playerId} displayName={lynchedPlayer.displayName} />
                  <span className="text-white/40">◀</span>
                  {votesForLynched.map(id => {
                    const p = playerOf(id)
                    return p ? <PlayerAvatar key={id} playerId={p.playerId} displayName={p.displayName} /> : null
                  })}
                </div>
              )}
              {abstainers.map(p => (
                <div key={p.playerId} className="flex items-center gap-1.5">
                  <span>✋</span>
                  <PlayerAvatar playerId={p.playerId} displayName={p.displayName} />
                  <span className="text-white/40 text-[10px]">{p.displayName} abstained</span>
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

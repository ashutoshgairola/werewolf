import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'

export function DawnPanel() {
  const dawnInfo = useGameStore((s) => s.dawnInfo)
  const players = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  usePhaseAutoAdvance(phaseEndsAt)

  const killedName = dawnInfo?.killedPlayerId
    ? players.find(p => p.playerId === dawnInfo.killedPlayerId)?.displayName ?? 'Someone'
    : null

  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center px-4 py-6">
      <div className="text-5xl sm:text-6xl">☀️</div>
      <div className="bg-navy-mid/85 border border-cyan-game/25 rounded-2xl
        px-8 py-6 sm:px-10 sm:py-8 backdrop-blur-sm max-w-sm w-full">
        <h2 className="text-white text-lg sm:text-xl font-bold mb-3">Dawn breaks...</h2>
        {killedName ? (
          <p className="text-white/70 text-sm leading-relaxed">
            A body is found —{' '}
            <strong className="text-action-vote">{killedName}</strong>{' '}
            was killed by the Werewolves during the night.
            {dawnInfo?.doctorSaved && (
              <span className="block mt-2 text-green-400/80">
                🩺 The doctor saved someone else tonight.
              </span>
            )}
          </p>
        ) : (
          <p className="text-white/70 text-sm leading-relaxed">
            🌿 Peaceful night — the Werewolves killed no one.
          </p>
        )}
      </div>
      <p className="text-white/30 text-xs">Advancing shortly...</p>
    </div>
  )
}

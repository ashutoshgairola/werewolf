import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'
import { ROLE_INFO } from '@/types/game'

export function DawnPanel() {
  const dawnInfo = useGameStore((s) => s.dawnInfo)
  const players = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const done = usePhaseAutoAdvance(phaseEndsAt)

  const killedName = dawnInfo?.killedPlayerId
    ? players.find((p) => p.playerId === dawnInfo.killedPlayerId)?.displayName ?? 'Someone'
    : null

  return (
    <div
      className={[
        'flex-1 min-h-0 flex flex-col items-center justify-center gap-5 px-6 py-8 text-center transition-opacity duration-1000',
        done ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(to bottom, #1E1B4B 0%, #F59E0B 60%, #F5E6C8 100%)',
        animation: 'dawn-rise 5s ease-out forwards',
      }}
    >
      <span className="text-6xl sm:text-7xl">🌅</span>

      {killedName ? (
        <div className="space-y-2 w-full max-w-xs">
          <p className="font-tavern text-white text-xl sm:text-2xl drop-shadow">Dawn breaks…</p>
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-white/70 font-body text-sm mb-1">Found dead at sunrise:</p>
            <p className="font-tavern text-white text-2xl sm:text-3xl">{killedName}</p>
            {dawnInfo?.role && (
              <p className="text-white/70 font-body text-sm mt-2">
                {ROLE_INFO[dawnInfo.role].icon} {ROLE_INFO[dawnInfo.role].name}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4 max-w-xs w-full">
          <p className="font-tavern text-white text-xl sm:text-2xl">A peaceful night</p>
          <p className="text-white/70 font-body text-sm mt-2">Nobody was harmed</p>
        </div>
      )}

      {phaseEndsAt && (
        <div className="w-40 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-candle rounded-full"
            style={{
              width: `${Math.max(0, ((phaseEndsAt - Date.now()) / 5000) * 100)}%`,
              transition: 'width 0.5s linear',
            }}
          />
        </div>
      )}
    </div>
  )
}

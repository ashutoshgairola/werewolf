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
        'min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center transition-opacity duration-1000',
        done ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{
        background: 'linear-gradient(to bottom, #1E1B4B 0%, #F59E0B 60%, #F5E6C8 100%)',
        animation: 'dawn-rise 5s ease-out forwards',
      }}
    >
      <span className="text-7xl">🌅</span>

      {killedName ? (
        <div className="space-y-2">
          <p className="font-tavern text-white text-2xl drop-shadow">Dawn breaks…</p>
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-8 py-5">
            <p className="text-white/70 font-body text-sm mb-1">Found dead at sunrise:</p>
            <p className="font-tavern text-white text-3xl">{killedName}</p>
            {dawnInfo?.role && (
              <p className="text-white/70 font-body text-sm mt-2">
                {ROLE_INFO[dawnInfo.role].icon} {ROLE_INFO[dawnInfo.role].name}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-8 py-5">
          <p className="font-tavern text-white text-2xl">A peaceful night</p>
          <p className="text-white/70 font-body text-sm mt-2">Nobody was harmed</p>
        </div>
      )}

      {phaseEndsAt && (
        <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden mt-4">
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

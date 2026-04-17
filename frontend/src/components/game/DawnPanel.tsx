import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { usePhaseAutoAdvance } from '@/hooks/usePhaseAutoAdvance'
import { ROLE_INFO } from '@/types/game'

export function DawnPanel() {
  const dawnInfo = useGameStore((s) => s.dawnInfo)
  const youWereKilledBy = useGameStore((s) => s.youWereKilledBy)
  const players = useRoomStore((s) => s.players)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const myId = useAuthStore((s) => s.playerId)
  const done = usePhaseAutoAdvance(phaseEndsAt)

  const killedName = dawnInfo?.killedPlayerId
    ? players.find((p) => p.playerId === dawnInfo.killedPlayerId)?.displayName ?? 'Someone'
    : null

  const iWasKilled = dawnInfo?.killedPlayerId === myId

  return (
    <div
      className={[
        'flex-1 min-h-0 flex flex-col items-center justify-center gap-4 sm:gap-5 px-6 py-6 sm:py-8 text-center transition-opacity duration-1000',
        done ? 'opacity-0' : 'opacity-100',
      ].join(' ')}
      style={{
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(to bottom, #1E1B4B 0%, #F59E0B 60%, #F5E6C8 100%)',
        animation: 'dawn-rise 5s ease-out forwards',
      }}
    >
      <span className="text-5xl sm:text-7xl">🌅</span>

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
          {/* Private message to the killed player */}
          {iWasKilled && youWereKilledBy && youWereKilledBy.length > 0 && (
            <div className="bg-red-900/40 border border-red-400/30 backdrop-blur-sm rounded-xl px-4 py-3 mt-1">
              <p className="text-red-200 font-body text-sm">
                🐺 You were killed by: <span className="font-semibold">{youWereKilledBy.join(', ')}</span>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 w-full max-w-xs">
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="font-tavern text-white text-xl sm:text-2xl">A peaceful night</p>
            <p className="text-white/70 font-body text-sm mt-2">Nobody was harmed</p>
          </div>
          {/* Doctor saved banner — visible to everyone */}
          {dawnInfo?.doctorSaved && (
            <div className="bg-green-900/40 border border-green-400/30 backdrop-blur-sm rounded-xl px-4 py-3">
              <p className="font-tavern text-green-300 text-base">💊 The doctor saved someone!</p>
              <p className="text-green-200/70 font-body text-xs mt-1">An attack was made but foiled</p>
            </div>
          )}
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

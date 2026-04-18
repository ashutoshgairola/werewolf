// frontend/src/components/game/TopBar.tsx
import { useGameStore } from '@/stores/gameStore'
import { useCountdown } from '@/hooks/useCountdown'
import { socketEvents } from '@/socket/events'

const PHASE_DISPLAY: Record<string, { day: string; name: string }> = {
  ROLE_ASSIGNMENT: { day: '',       name: 'YOUR ROLE' },
  NIGHT:           { day: 'NIGHT',  name: 'Night Action' },
  DAWN:            { day: '',       name: 'DAWN' },
  DAY_DISCUSSION:  { day: 'DAY',    name: 'DISCUSSION' },
  DAY_VOTING:      { day: 'DAY',    name: 'VOTE' },
  DAY_RESULT:      { day: 'DAY',    name: 'RESULTS' },
  GAME_OVER:       { day: '',       name: 'GAME OVER' },
}

export function TopBar() {
  const phase = useGameStore((s) => s.phase)
  const round = useGameStore((s) => s.round)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const secondsLeft = useCountdown(phaseEndsAt)

  if (!phase) return null

  const display = PHASE_DISPLAY[phase] ?? { day: '', name: phase }
  const dayLabel = display.day ? `${display.day} ${round}` : ''

  return (
    <div className="relative z-20 flex items-center justify-between px-4 py-2.5 flex-shrink-0">
      <button
        onClick={() => socketEvents.leaveRoom()}
        className="w-10 h-10 rounded-xl bg-navy-light/80 border border-cyan-game/20
          text-white text-lg flex items-center justify-center
          hover:bg-navy-light transition-colors backdrop-blur-sm"
        aria-label="Leave game"
      >
        🚪
      </button>

      <div className="flex items-center gap-2
        bg-gradient-to-r from-cyan-game to-cyan-glow
        rounded-full px-4 py-1.5 shadow-lg
        font-bold text-sm tracking-wide text-white uppercase
        [box-shadow:0_2px_16px_rgba(62,193,243,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]">
        {dayLabel && <span className="text-xs opacity-80 font-semibold">{dayLabel}</span>}
        <span>{display.name}</span>
        {phaseEndsAt && secondsLeft > 0 && (
          <span className="bg-black/25 rounded-full px-2 py-0.5 text-xs font-black min-w-[28px] text-center">
            {secondsLeft}
          </span>
        )}
      </div>

      <button
        className="w-10 h-10 rounded-xl bg-navy-light/80 border border-cyan-game/20
          text-white text-lg flex items-center justify-center
          hover:bg-navy-light transition-colors backdrop-blur-sm"
        aria-label="Help"
      >
        ❓
      </button>
    </div>
  )
}

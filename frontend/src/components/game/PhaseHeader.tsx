import { useGameStore } from '@/stores/gameStore'
import { PHASE_INFO } from '@/types/game'
import { CountdownTimer } from '@/components/shared/CountdownTimer'

interface PhaseHeaderProps {
  totalSeconds?: number
}

export function PhaseHeader({ totalSeconds }: PhaseHeaderProps) {
  const phase = useGameStore((s) => s.phase)
  const round = useGameStore((s) => s.round)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)

  if (!phase) return null

  const info = PHASE_INFO[phase]

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-parchment-light border-b border-wood/30">
      <div className="flex items-center gap-2">
        <span className="text-xl">{info?.icon}</span>
        <div>
          <p className="font-tavern text-wood-dark text-sm leading-tight">{info?.label}</p>
          <p className="text-xs text-wood/50 font-body">Round {round}</p>
        </div>
      </div>

      {phaseEndsAt && (
        <CountdownTimer
          endsAt={phaseEndsAt}
          showRing={!!totalSeconds}
          totalSeconds={totalSeconds}
        />
      )}
    </div>
  )
}

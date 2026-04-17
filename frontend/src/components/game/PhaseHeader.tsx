// frontend/src/components/game/PhaseHeader.tsx
import { useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { PHASE_INFO } from '@/types/game'
import { CountdownTimer } from '@/components/shared/CountdownTimer'
import { useCountdown } from '@/hooks/useCountdown'
import { playSound } from '@/hooks/useSoundManager'

interface PhaseHeaderProps {
  totalSeconds?: number
}

export function PhaseHeader({ totalSeconds }: PhaseHeaderProps) {
  const phase = useGameStore((s) => s.phase)
  const round = useGameStore((s) => s.round)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const secondsLeft = useCountdown(phaseEndsAt)
  const lastTickRef = useRef<number | null>(null)

  useEffect(() => {
    if (secondsLeft <= 0) return
    if (secondsLeft > 10) {
      lastTickRef.current = null
      return
    }
    // Only play once per integer-second change
    if (lastTickRef.current === secondsLeft) return
    lastTickRef.current = secondsLeft

    playSound('timer_tick')

    // At <= 5s, schedule a second tick mid-second to double the rate
    if (secondsLeft <= 5) {
      const mid = setTimeout(() => playSound('timer_tick'), 500)
      return () => clearTimeout(mid)
    }
  }, [secondsLeft])

  if (!phase) return null
  const info = PHASE_INFO[phase]

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-3 bg-parchment-light border-b border-wood/30">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="text-sm sm:text-xl">{info?.icon}</span>
        <div>
          {/* Mobile: single compact line to save vertical space */}
          <p className="font-tavern text-wood-dark text-xs sm:text-sm leading-tight">
            {info?.label}<span className="sm:hidden font-body font-normal text-wood/50"> · R{round}</span>
          </p>
          <p className="hidden sm:block text-xs text-wood/50 font-body">Round {round}</p>
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

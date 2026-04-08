import { useState, useEffect } from 'react'
import { useCountdown } from './useCountdown'

/**
 * For auto-advancing phases (DAWN, DAY_RESULT — 5s).
 * Returns true when local countdown hits 0, allowing the component
 * to start a fade-out while the server's game:phase_change is in transit.
 */
export function usePhaseAutoAdvance(endsAt: number | null): boolean {
  const secondsLeft = useCountdown(endsAt)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (secondsLeft === 0 && endsAt !== null) {
      setDone(true)
    }
  }, [secondsLeft, endsAt])

  // Reset when endsAt changes (new phase)
  useEffect(() => {
    setDone(false)
  }, [endsAt])

  return done
}

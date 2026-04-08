import { useState, useEffect } from 'react'

export function useCountdown(endsAt: number | null): number {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0
  )

  useEffect(() => {
    if (endsAt === null) {
      setSecondsLeft(0)
      return
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }

    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [endsAt])

  return secondsLeft
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

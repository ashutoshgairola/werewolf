import { useCountdown, formatCountdown } from '@/hooks/useCountdown'

interface CountdownTimerProps {
  endsAt: number | null
  showRing?: boolean
  totalSeconds?: number   // used for ring fill calculation
  className?: string
}

export function CountdownTimer({ endsAt, showRing = false, totalSeconds, className = '' }: CountdownTimerProps) {
  const secondsLeft = useCountdown(endsAt)
  const display = formatCountdown(secondsLeft)

  const colorClass =
    secondsLeft <= 10
      ? 'text-red-500'
      : secondsLeft <= 30
      ? 'text-amber-500'
      : 'text-ink'

  if (showRing && totalSeconds) {
    const radius = 28
    const circumference = 2 * Math.PI * radius
    const progress = Math.max(0, secondsLeft / totalSeconds)
    const offset = circumference * (1 - progress)

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={radius} stroke="#E8D5A8" strokeWidth="4" fill="none" />
          <circle
            cx="36" cy="36" r={radius}
            stroke={secondsLeft <= 10 ? '#DC2626' : secondsLeft <= 30 ? '#F59E0B' : '#5C3A1E'}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
          />
        </svg>
        <span className={`absolute font-tavern text-sm font-bold ${colorClass}`}>{display}</span>
      </div>
    )
  }

  return (
    <span className={`font-tavern font-bold tabular-nums ${colorClass} ${className}`}>
      {display}
    </span>
  )
}

import type { Role } from '@/types/game'
import { ROLE_INFO } from '@/types/game'

interface PlayerCardProps {
  playerId: string
  displayName: string
  isAlive: boolean
  role?: Role
  voteCount?: number
  voterInitials?: string[]
  selected?: boolean
  disabled?: boolean
  badge?: React.ReactNode
  onClick?: () => void
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PlayerCard({
  displayName,
  isAlive,
  role,
  voteCount,
  voterInitials,
  selected,
  disabled,
  badge,
  onClick,
}: PlayerCardProps) {
  const dead = !isAlive

  return (
    <button
      onClick={onClick}
      disabled={disabled || dead}
      className={[
        'relative flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl border-2 transition-all',
        dead
          ? 'bg-ink/10 border-ink/20 opacity-50 cursor-default'
          : selected
          ? 'bg-candle/20 border-candle shadow-md scale-105'
          : disabled
          ? 'bg-parchment border-wood/30 opacity-60 cursor-not-allowed'
          : 'bg-parchment border-wood/40 hover:border-candle hover:bg-candle/10 cursor-pointer',
      ].join(' ')}
    >
      {/* Avatar */}
      <div
        className={[
          'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-tavern flex-shrink-0',
          dead ? 'bg-ink/20 text-ink/40' : 'bg-wood text-parchment',
        ].join(' ')}
      >
        {dead && role ? ROLE_INFO[role].icon : initials(displayName)}
      </div>

      {/* Name */}
      <span
        className={[
          'text-xs font-body text-center leading-tight max-w-full truncate',
          dead ? 'line-through text-ink/40' : 'text-ink',
        ].join(' ')}
      >
        {displayName}
      </span>

      {/* Role (dead only) */}
      {dead && role && (
        <span className="text-xs text-ink/50 font-body">{ROLE_INFO[role].name}</span>
      )}

      {/* Vote count badge */}
      {voteCount !== undefined && voteCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-ember text-parchment text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {voteCount}
        </div>
      )}

      {/* Voter initials */}
      {voterInitials && voterInitials.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
          {voterInitials.slice(0, 3).map((init, i) => (
            <span key={i} className="text-[9px] bg-ember/20 text-ember rounded px-0.5">
              {init}
            </span>
          ))}
          {voterInitials.length > 3 && (
            <span className="text-[9px] text-wood/50">+{voterInitials.length - 3}</span>
          )}
        </div>
      )}

      {/* Custom badge (e.g. seer result) */}
      {badge}
    </button>
  )
}

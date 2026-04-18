// frontend/src/components/game/SeatCard.tsx
import type { Role } from '@/types/game'
import { getPlayerColor } from '@/utils/playerColor'

export type SeatAction = 'vote' | 'kill' | 'check' | 'protect' | 'cancel' | null

interface SeatCardProps {
  playerId: string
  displayName: string
  role?: Role
  seerResult?: 'wolf' | 'innocent' | null
  isAlive: boolean
  isWolfAlly?: boolean
  action?: SeatAction
  disabled?: boolean
  selected?: boolean
  onAction?: () => void
}

const ACTION_LABEL: Record<NonNullable<SeatAction>, string> = {
  vote:    'VOTE',
  kill:    'KILL',
  check:   'CHECK',
  protect: 'PROTECT',
  cancel:  '✕ CANCEL',
}

const ACTION_STYLE: Record<NonNullable<SeatAction>, string> = {
  vote:    'bg-action-vote text-white',
  kill:    'bg-action-vote text-white',
  check:   'bg-action-check text-black',
  protect: 'bg-action-check text-black',
  cancel:  'bg-white/15 text-white/70 border border-white/30',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function SeatCard({
  playerId,
  displayName,
  role,
  seerResult,
  isAlive,
  isWolfAlly = false,
  action = null,
  disabled = false,
  selected = false,
  onAction,
}: SeatCardProps) {
  const color = getPlayerColor(playerId)

  const ringColor = !isAlive
    ? 'rgba(255,255,255,0.15)'
    : isWolfAlly
    ? '#ef4444'
    : selected
    ? '#ffffff'
    : color

  const avatarOpacity = isAlive ? 1 : 0.35
  const showAction = action !== null && isAlive && !disabled

  const roleBadge = role
    ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
    : seerResult === 'wolf'
    ? '🐺 Wolf'
    : seerResult === 'innocent'
    ? '😇 Innocent'
    : null

  const roleBadgeColor = role === 'werewolf' || seerResult === 'wolf'
    ? 'from-red-500 to-red-700 text-white border-red-800'
    : 'from-yellow-300 to-yellow-600 text-black border-yellow-700'

  const buttonLabel =
    selected && action === 'kill' ? '✓ KILL' :
    selected && action === 'check' ? '✓ CHECK' :
    ACTION_LABEL[action!]

  return (
    <div className="flex flex-col items-center gap-1 pt-2" style={{ width: 72 }}>
      <div className="relative">
        {roleBadge && (
          <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-10
            bg-gradient-to-br ${roleBadgeColor}
            text-[8px] font-bold px-1.5 py-0.5 rounded-full
            whitespace-nowrap border shadow`}>
            {roleBadge}
          </div>
        )}

        <div
          className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 flex-shrink-0"
          style={{
            background: selected ? `${color}44` : `${color}22`,
            border: `${selected ? 3 : 2.5}px solid ${ringColor}`,
            opacity: avatarOpacity,
            filter: isAlive ? 'none' : 'grayscale(100%)',
            boxShadow: selected ? `0 0 12px 3px ${color}88` : undefined,
          }}
        >
          <span className="font-bold text-base select-none" style={{ color }}>
            {initials(displayName)}
          </span>
        </div>
      </div>

      {showAction ? (
        <button
          onClick={onAction}
          className={`text-[10px] font-black uppercase tracking-wide
            px-2.5 py-0.5 rounded-full transition-opacity active:scale-95 w-full text-center
            ${ACTION_STYLE[action!]} ${selected ? 'ring-1 ring-white/40' : ''}`}
        >
          {buttonLabel}
        </button>
      ) : (
        <div
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-center w-full truncate"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}
          title={displayName}
        >
          {displayName}
        </div>
      )}
    </div>
  )
}

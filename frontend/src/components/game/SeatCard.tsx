// frontend/src/components/game/SeatCard.tsx
import type { Role } from '@/types/game'

export type SeatAction = 'vote' | 'kill' | 'check' | 'protect' | null

interface SeatCardProps {
  seatNumber: number
  displayName: string
  role?: Role
  isAlive: boolean
  isWolfAlly?: boolean
  action?: SeatAction
  disabled?: boolean
  onAction?: () => void
}

const ACTION_LABEL: Record<NonNullable<SeatAction>, string> = {
  vote:    'VOTE',
  kill:    'KILL',
  check:   'CHECK',
  protect: 'PROTECT',
}

const ACTION_STYLE: Record<NonNullable<SeatAction>, string> = {
  vote:    'bg-action-vote text-white',
  kill:    'bg-action-vote text-white',
  check:   'bg-action-check text-black',
  protect: 'bg-action-check text-black',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function SeatCard({
  seatNumber,
  displayName,
  role,
  isAlive,
  isWolfAlly = false,
  action = null,
  disabled = false,
  onAction,
}: SeatCardProps) {
  const borderColor = !isAlive
    ? 'border-white/20'
    : isWolfAlly
    ? 'border-seat-ally'
    : 'border-seat-border'

  const avatarFilter = isAlive ? '' : 'grayscale(100%) brightness(0.45)'
  const showAction = action !== null && isAlive && !disabled

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {role && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10
            bg-gradient-to-br from-yellow-300 to-yellow-600
            text-black text-[9px] font-bold px-2 py-0.5 rounded-full
            whitespace-nowrap border border-yellow-700 shadow">
            {role.charAt(0) + role.slice(1).toLowerCase()}
          </div>
        )}
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[2.5px] ${borderColor}
            bg-navy-mid flex items-center justify-center
            overflow-hidden transition-all duration-300`}
          style={{ filter: avatarFilter }}
        >
          <span className="font-bold text-white/70 text-base sm:text-lg">{initials(displayName)}</span>
        </div>
        <div className="absolute -top-1 -left-1 z-10
          w-[20px] h-[20px] rounded-full bg-seat-num
          border border-black text-black text-[10px] font-black
          flex items-center justify-center shadow">
          {seatNumber}
        </div>
      </div>

      {showAction ? (
        <button
          onClick={onAction}
          className={`text-[10px] font-black uppercase tracking-wide
            px-2.5 py-0.5 rounded-full transition-opacity active:scale-95
            ${ACTION_STYLE[action!]}`}
        >
          {ACTION_LABEL[action!]}
        </button>
      ) : (
        <div className="bg-navy-light/80 text-white text-[10px] font-semibold
          px-2 py-0.5 rounded-full max-w-[72px] truncate text-center">
          {displayName}
        </div>
      )}
    </div>
  )
}

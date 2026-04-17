import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { ROLE_INFO } from '@/types/game'
import type { Role } from '@/types/game'

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function InGamePlayerList() {
  const players = useGameStore((s) => s.players)
  const roles = useGameStore((s) => s.roles)
  const myId = useAuthStore((s) => s.playerId)

  const alive = players.filter((p) => p.isAlive)
  const dead = players.filter((p) => !p.isAlive)

  return (
    <div>
      <h3 className="font-tavern text-wood-dark text-xs uppercase tracking-widest mb-2">
        Players ({alive.length} alive · {dead.length} dead)
      </h3>
      <ul className="space-y-1.5">
        {/* Alive players first */}
        {alive.map((p) => (
          <li
            key={p.playerId}
            className="flex items-center gap-2 bg-parchment border border-wood/40 rounded-lg px-2.5 py-1.5"
          >
            <div className="w-7 h-7 rounded-full bg-wood text-parchment flex items-center justify-center text-xs font-tavern flex-shrink-0">
              {initials(p.displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-body text-ink text-sm truncate">{p.displayName}</span>
                {p.playerId === myId && (
                  <span className="text-xs text-wood/60 font-body flex-shrink-0">(you)</span>
                )}
              </div>
            </div>
            <span className="text-green-600 text-xs flex-shrink-0">✓</span>
          </li>
        ))}

        {/* Dead players — greyed with role reveal */}
        {dead.map((p) => {
          const role = roles[p.playerId] as Role | undefined
          const roleInfo = role ? ROLE_INFO[role] : null
          const causeIcon = p.outcome === 'lynched' ? '⚖️' : '🌙'

          return (
            <li
              key={p.playerId}
              className="flex items-center gap-2 bg-ink/5 border border-ink/15 rounded-lg px-2.5 py-1.5 opacity-60"
            >
              <div className="w-7 h-7 rounded-full bg-ink/20 text-ink/40 flex items-center justify-center text-xs font-tavern flex-shrink-0">
                {roleInfo ? roleInfo.icon : '💀'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-body text-ink/50 text-sm line-through truncate block">
                  {p.displayName}
                </span>
                {roleInfo && (
                  <span className="text-xs text-ink/40 font-body">{roleInfo.name}</span>
                )}
              </div>
              <span className="text-xs flex-shrink-0" title={p.outcome ?? ''}>{causeIcon}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

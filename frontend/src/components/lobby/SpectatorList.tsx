import type { RoomPlayer } from '@/types/game'

interface SpectatorListProps {
  spectators: RoomPlayer[]
}

export function SpectatorList({ spectators }: SpectatorListProps) {
  if (spectators.length === 0) return null

  return (
    <div>
      <h3 className="font-tavern text-wood-dark text-sm uppercase tracking-widest mb-2">
        Spectators ({spectators.length})
      </h3>
      <ul className="space-y-1.5">
        {spectators.map((s) => (
          <li
            key={s.playerId}
            className="flex items-center gap-2 bg-parchment border border-wood/30 rounded-lg px-3 py-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-wood/40 flex-shrink-0" />
            <span className="font-body text-ink/70 text-sm truncate">{s.displayName}</span>
            {s.connectionStatus === 'disconnected' && (
              <span className="text-xs text-ember ml-auto">⚠</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

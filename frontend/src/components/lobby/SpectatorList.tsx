import type { RoomPlayer } from '@/types/game'

interface SpectatorListProps {
  spectators: RoomPlayer[]
}

export function SpectatorList({ spectators }: SpectatorListProps) {
  if (spectators.length === 0) return null

  return (
    <div>
      <h3 className="font-tavern text-white text-sm uppercase tracking-widest mb-2">
        Spectators ({spectators.length})
      </h3>
      <ul className="space-y-1.5">
        {spectators.map((s) => (
          <li
            key={s.playerId}
            className="flex items-center gap-2 bg-navy border border-cyan-game/20 rounded-lg px-3 py-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-navy-light/20 flex-shrink-0" />
            <span className="font-sans text-white/50 text-sm truncate">{s.displayName}</span>
            {s.connectionStatus === 'disconnected' && (
              <span className="text-xs text-action-vote ml-auto">⚠</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

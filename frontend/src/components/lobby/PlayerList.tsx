import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import type { RoomPlayer } from '@/types/game'

interface PlayerListProps {
  players: RoomPlayer[]
  hostId: string
  isHost: boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-navy-light text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
      {initials(name)}
    </div>
  )
}

export function PlayerList({ players, hostId, isHost }: PlayerListProps) {
  const myId = useAuthStore((s) => s.playerId)

  return (
    <div>
      <h3 className="font-tavern text-white text-sm uppercase tracking-widest mb-2">
        Players ({players.length}/10)
      </h3>
      <ul className="space-y-2">
        {players.map((player) => (
          <li
            key={player.playerId}
            className="flex items-center gap-3 bg-navy border border-cyan-game/25 rounded-lg px-3 py-2"
          >
            <Avatar name={player.displayName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-white truncate">{player.displayName}</span>
                {player.playerId === hostId && (
                  <span title="Host" className="text-candle text-sm">👑</span>
                )}
                {player.playerId === myId && (
                  <span className="text-xs text-white/60 font-sans">(you)</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {player.connectionStatus === 'disconnected' && (
                  <span className="text-xs text-action-vote">⚠ Disconnected</span>
                )}
                {player.isReady && player.connectionStatus === 'connected' && (
                  <span className="text-xs text-green-600">✓ Ready</span>
                )}
                {!player.isReady && player.connectionStatus === 'connected' && (
                  <span className="text-xs text-white/50">Not ready</span>
                )}
              </div>
            </div>
            {isHost && player.playerId !== myId && (
              <button
                onClick={() => socketEvents.kickPlayer(player.playerId)}
                className="text-xs text-action-vote hover:underline flex-shrink-0"
              >
                Kick
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

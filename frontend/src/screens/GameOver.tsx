import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { ROLE_INFO } from '@/types/game'
import type { Role } from '@/types/game'
import { ChatMessage } from '@/components/game/ChatMessage'

export default function GameOver() {
  const winner = useGameStore((s) => s.winner)
  const roles = useGameStore((s) => s.roles)
  const players = useRoomStore((s) => s.players)
  const alive = useGameStore((s) => s.alive)
  const hostId = useRoomStore((s) => s.hostId)
  const myId = useAuthStore((s) => s.playerId)
  const ghostLog = useGameStore((s) => s.chatLogs.ghost)
  const [ghostOpen, setGhostOpen] = useState(false)

  const isHost = myId === hostId
  const isWolvesWin = winner === 'wolves'

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 py-4 sm:py-6 gap-4 sm:gap-5"
      style={{
        background: isWolvesWin
          ? 'linear-gradient(135deg, #1E1B4B, #4C1D95)'
          : 'linear-gradient(135deg, #78350F, #F59E0B)',
      }}
    >
      {/* Winner banner */}
      <div className="text-center">
        <div className="text-4xl sm:text-7xl mb-1 sm:mb-2">{isWolvesWin ? '🐺' : '🏘️'}</div>
        <h1 className="font-tavern text-2xl sm:text-5xl text-white drop-shadow-lg">
          {isWolvesWin ? 'Werewolves Win!' : 'Village Wins!'}
        </h1>
        <p className="text-white/60 font-body text-sm sm:text-base mt-1">
          {isWolvesWin ? 'Darkness has consumed the village…' : 'Peace returns to the village!'}
        </p>
      </div>

      {/* Role reveal grid */}
      <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 w-full max-w-lg">
        <h2 className="font-tavern text-white/80 text-xs uppercase tracking-widest mb-3 text-center">
          Final Roles
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map((p) => {
            const role = roles[p.playerId] as Role | undefined
            const survived = alive.includes(p.playerId)
            const info = role ? ROLE_INFO[role] : null

            return (
              <div
                key={p.playerId}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  survived ? 'bg-white/15' : 'bg-black/20 opacity-60'
                }`}
              >
                <span className="text-lg flex-shrink-0">{info?.icon ?? '?'}</span>
                <div className="min-w-0">
                  <p className={`text-xs font-body truncate ${survived ? 'text-white' : 'text-white/50 line-through'}`}>
                    {p.displayName}
                  </p>
                  <p className="text-xs text-white/50 font-body">{info?.name ?? 'Unknown'}</p>
                </div>
                {survived && <span className="ml-auto text-xs text-green-300">✓</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Ghost chat log (collapsible) */}
      {ghostLog.length > 0 && (
        <div className="w-full max-w-lg">
          <button
            onClick={() => setGhostOpen((o) => !o)}
            className="w-full text-left text-white/60 text-sm font-body flex items-center gap-2 mb-2"
          >
            <span>👻 Spirit Chat ({ghostLog.length} messages)</span>
            <span>{ghostOpen ? '▲' : '▼'}</span>
          </button>
          {ghostOpen && (
            <div className="bg-black/20 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
              {ghostLog.map((msg) => (
                <ChatMessage key={msg.messageId} message={msg} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {isHost && (
          <button
            onClick={() => socketEvents.returnToLobby()}
            className="w-full bg-white/20 hover:bg-white/30 text-white font-tavern py-3 rounded-xl transition-colors"
          >
            🏠 Return to Lobby
          </button>
        )}
        <button
          onClick={() => socketEvents.leaveRoom()}
          className="w-full bg-black/20 hover:bg-black/30 text-white/70 font-body py-2 rounded-xl transition-colors text-sm"
        >
          Leave Game
        </button>
      </div>
    </div>
  )
}

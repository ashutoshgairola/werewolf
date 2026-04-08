import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { Button } from '@/components/shared/Button'
import { RoomCodeDisplay } from '@/components/lobby/RoomCodeDisplay'
import { PlayerList } from '@/components/lobby/PlayerList'
import { SpectatorList } from '@/components/lobby/SpectatorList'
import { ReadyButton } from '@/components/lobby/ReadyButton'
import { SettingsPanel } from '@/components/lobby/SettingsPanel'
import { ChatPanel } from '@/components/game/ChatPanel'

export default function Lobby() {
  const roomCode = useRoomStore((s) => s.roomCode)!
  const hostId = useRoomStore((s) => s.hostId)!
  const players = useRoomStore((s) => s.players)
  const spectators = useRoomStore((s) => s.spectators)
  const settings = useRoomStore((s) => s.settings)
  const myId = useAuthStore((s) => s.playerId)

  const isHost = myId === hostId
  const allReady = players.length >= 4 && players.every((p) => p.isReady || p.playerId === hostId)
  const connectedCount = players.filter((p) => p.connectionStatus === 'connected').length

  return (
    <div className="min-h-screen bg-parchment p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <h1 className="font-tavern text-3xl text-wood-dark mb-1">Werewolf</h1>
          <p className="text-wood/60 text-sm font-body">Waiting for players…</p>
        </div>

        {/* Room code */}
        <RoomCodeDisplay roomCode={roomCode} />

        {/* Players */}
        <PlayerList players={players} hostId={hostId} isHost={isHost} />

        {/* Spectators */}
        <SpectatorList spectators={spectators} />

        {/* Settings */}
        <SettingsPanel settings={settings} isHost={isHost} />

        {/* Lobby chat */}
        <div style={{ height: '280px' }}>
          <ChatPanel visibleChannels={['day', 'system']} defaultChannel="day" />
        </div>

        {/* Action area */}
        <div className="flex flex-col gap-3 pb-6">
          {isHost ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!allReady || connectedCount < 4}
              onClick={() => socketEvents.startGame()}
            >
              {connectedCount < 4
                ? `Need ${4 - connectedCount} more player${4 - connectedCount !== 1 ? 's' : ''}`
                : allReady
                ? '🐺 Start Game'
                : 'Waiting for players to ready up…'}
            </Button>
          ) : (
            <ReadyButton />
          )}

          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={() => socketEvents.leaveRoom()}
          >
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { Button } from '@/components/shared/Button'
import { RoomCodeDisplay } from '@/components/lobby/RoomCodeDisplay'
import { PlayerList } from '@/components/lobby/PlayerList'
import { SpectatorList } from '@/components/lobby/SpectatorList'
import { ReadyButton } from '@/components/lobby/ReadyButton'
import { SettingsPanel } from '@/components/lobby/SettingsPanel'
import { GameRules } from '@/components/lobby/GameRules'
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
    // Mobile: fixed-height chat at bottom, scrollable content above. Desktop: side-by-side.
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-parchment overflow-hidden">

      {/* ── Left panel: config + players (scrollable, fills remaining space above chat on mobile) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-4 lg:max-w-lg">
        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="font-tavern text-3xl text-wood-dark mb-0.5">Werewolf</h1>
          <p className="text-wood/60 text-sm font-body">Waiting for players…</p>
        </div>

        {/* Room code + share */}
        <RoomCodeDisplay roomCode={roomCode} />

        {/* Players */}
        <PlayerList players={players} hostId={hostId} isHost={isHost} />

        {/* Spectators */}
        <SpectatorList spectators={spectators} />

        {/* Settings */}
        <SettingsPanel settings={settings} isHost={isHost} />

        {/* How to play */}
        <GameRules />

        {/* Actions */}
        <div className="flex flex-col gap-3 pb-4">
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

      {/* ── Right panel: lobby chat ── */}
      {/* Mobile: fixed 44vh strip at bottom so it's usable on any phone height */}
      {/* Desktop (lg): full-height right column */}
      <div className="h-[44vh] lg:h-auto lg:w-80 lg:border-l border-t lg:border-t-0 border-wood/20 flex-shrink-0 lg:flex-shrink lg:flex-1 min-h-0">
        <ChatPanel visibleChannels={['day']} defaultChannel="day" />
      </div>
    </div>
  )
}

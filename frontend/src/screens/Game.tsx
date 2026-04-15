// frontend/src/screens/Game.tsx
import { useGameStore } from '@/stores/gameStore'
import { RoleCard } from '@/components/game/RoleCard'
import { NightPanel } from '@/components/game/NightPanel'
import { DawnPanel } from '@/components/game/DawnPanel'
import { DayResultPanel } from '@/components/game/DayResultPanel'
import { PhaseHeader } from '@/components/game/PhaseHeader'
import { VotePanel } from '@/components/game/VotePanel'
import { SkipVoteBar } from '@/components/game/SkipVoteBar'
import { ChatPanel } from '@/components/game/ChatPanel'
import { PlayerList } from '@/components/lobby/PlayerList'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { RoleAtmosphere } from '@/theme/RoleAtmosphere'
import { useSoundManager } from '@/hooks/useSoundManager'

function MuteButton() {
  const { muted, toggleMute } = useSoundManager()
  return (
    // Mobile: fixed top-left, hidden on sm+ (desktop has DesktopMuteButton)
    <button
      onClick={toggleMute}
      className="fixed top-3 left-3 z-50 sm:hidden w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-lg border border-white/10"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

function DesktopMuteButton() {
  const { muted, toggleMute } = useSoundManager()
  return (
    <button
      onClick={toggleMute}
      className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-base border border-white/10 transition-colors flex-shrink-0"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

function DayDiscussionView() {
  const players = useRoomStore((s) => s.players)
  const hostId = useRoomStore((s) => s.hostId)!
  const myId = useAuthStore((s) => s.playerId)!
  const roles = useGameStore((s) => s.roles)
  const alive = useGameStore((s) => s.alive)
  const dawnInfo = useGameStore((s) => s.dawnInfo)

  const isDead = !alive.includes(myId)

  const enrichedPlayers = players.map((p) => ({
    ...p,
    role: roles[p.playerId],
  }))

  const killedLastNight = dawnInfo?.killedPlayerId
    ? players.find((p) => p.playerId === dawnInfo.killedPlayerId)?.displayName ?? null
    : null

  return (
    <div className="h-full flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <div className="flex items-center justify-between pr-2 flex-shrink-0">
        <PhaseHeader />
        <DesktopMuteButton />
      </div>
      {killedLastNight && (
        <div className="flex-shrink-0 mx-4 mb-1 bg-black/30 border border-ember/40 rounded-lg px-3 py-2 text-sm text-ember/90 font-body text-center">
          ☠️ <strong>{killedLastNight}</strong> was found dead this morning
        </div>
      )}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto w-full min-h-0">
        <div className="md:w-56 flex-shrink-0 space-y-3 overflow-y-auto">
          <PlayerList
            players={enrichedPlayers as typeof players}
            hostId={hostId}
            isHost={myId === hostId}
          />
          <SkipVoteBar />
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>
        {isDead && (
          <div className="md:w-64 min-h-0 h-48 md:h-auto">
            <ChatPanel visibleChannels={['ghost']} defaultChannel="ghost" />
          </div>
        )}
      </div>
    </div>
  )
}

function DayVotingView() {
  return (
    <div className="h-full flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <div className="flex items-center justify-between pr-2 flex-shrink-0">
        <PhaseHeader />
        <DesktopMuteButton />
      </div>
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto w-full min-h-0">
        <div className="flex-1 overflow-y-auto">
          <VotePanel />
        </div>
        <div className="md:w-64 min-h-0 h-48 md:h-auto">
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>
      </div>
    </div>
  )
}

export default function Game() {
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      <RoleAtmosphere />
      <MuteButton />
      {(() => {
        switch (phase) {
          case 'ROLE_ASSIGNMENT': return <RoleCard />
          case 'NIGHT':           return <NightPanel />
          case 'DAWN':            return <DawnPanel />
          case 'DAY_DISCUSSION':  return <DayDiscussionView />
          case 'DAY_VOTING':      return <DayVotingView />
          case 'DAY_RESULT':      return <DayResultPanel />
          default:                return null
        }
      })()}
    </>
  )
}

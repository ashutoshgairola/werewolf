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

function DayDiscussionView() {
  const players = useRoomStore((s) => s.players)
  const hostId = useRoomStore((s) => s.hostId)!
  const myId = useAuthStore((s) => s.playerId)!
  const roles = useGameStore((s) => s.roles)
  const alive = useGameStore((s) => s.alive)

  const isDead = !alive.includes(myId)

  // Enrich players with role for dead player display
  const enrichedPlayers = players.map((p) => ({
    ...p,
    role: roles[p.playerId],
  }))

  return (
    <div className="min-h-screen bg-sky flex flex-col">
      <PhaseHeader />
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto w-full">
        {/* Left: player list + skip */}
        <div className="md:w-56 flex-shrink-0 space-y-3">
          <PlayerList
            players={enrichedPlayers as typeof players}
            hostId={hostId}
            isHost={myId === hostId}
          />
          <SkipVoteBar />
        </div>

        {/* Center: day chat */}
        <div className="flex-1 min-h-64 md:min-h-0" style={{ height: 'calc(100vh - 120px)' }}>
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>

        {/* Right: ghost chat for dead players only */}
        {isDead && (
          <div className="md:w-64 min-h-48" style={{ height: 'calc(100vh - 120px)' }}>
            <ChatPanel visibleChannels={['ghost']} defaultChannel="ghost" />
          </div>
        )}
      </div>
    </div>
  )
}

function DayVotingView() {
  return (
    <div className="min-h-screen bg-sky flex flex-col">
      <PhaseHeader />
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto w-full">
        <div className="flex-1">
          <VotePanel />
        </div>
        <div className="md:w-64 min-h-48" style={{ height: 'calc(100vh - 120px)' }}>
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>
      </div>
    </div>
  )
}

export default function Game() {
  const phase = useGameStore((s) => s.phase)

  switch (phase) {
    case 'ROLE_ASSIGNMENT': return <RoleCard />
    case 'NIGHT':           return <NightPanel />
    case 'DAWN':            return <DawnPanel />
    case 'DAY_DISCUSSION':  return <DayDiscussionView />
    case 'DAY_VOTING':      return <DayVotingView />
    case 'DAY_RESULT':      return <DayResultPanel />
    default:                return null
  }
}

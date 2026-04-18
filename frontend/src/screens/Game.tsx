// frontend/src/screens/Game.tsx
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { SceneBackground } from '@/theme/SceneBackground'
import { TopBar } from '@/components/game/TopBar'
import { TeamStrengthBar } from '@/components/game/TeamStrengthBar'
import { SeatCard } from '@/components/game/SeatCard'
import type { SeatAction } from '@/components/game/SeatCard'
import { RoleCard } from '@/components/game/RoleCard'
import { NightPanel } from '@/components/game/NightPanel'
import { DawnPanel } from '@/components/game/DawnPanel'
import { DayResultPanel } from '@/components/game/DayResultPanel'
import { ChatPanel } from '@/components/game/ChatPanel'
import { SkipVoteBar } from '@/components/game/SkipVoteBar'
import { socketEvents } from '@/socket/events'
import { playSound } from '@/hooks/useSoundManager'
import type { Role, GamePhase } from '@/types/game'

function sceneVariant(phase: GamePhase | null): 'night' | 'day' | 'wolf' {
  if (phase === 'NIGHT') return 'night'
  if (phase === 'DAY_DISCUSSION' || phase === 'DAY_VOTING' || phase === 'DAY_RESULT' || phase === 'DAWN') return 'day'
  return 'night'
}

function seatAction(
  phase: GamePhase | null,
  myRole: Role | null,
  isMe: boolean,
  amAlive: boolean,
  targetIsAlive: boolean,
): SeatAction {
  if (isMe || !amAlive || !targetIsAlive) return null
  if (phase === 'DAY_VOTING') return 'vote'
  if (phase === 'NIGHT') {
    if (myRole === 'werewolf') return 'kill'
    if (myRole === 'seer') return 'check'
    if (myRole === 'doctor') return 'protect'
  }
  return null
}

function SeatColumn({ side }: { side: 'left' | 'right' }) {
  const phase = useGameStore((s) => s.phase)
  const myRole = useGameStore((s) => s.role)
  const myId = useAuthStore((s) => s.playerId)!
  const alive = useGameStore((s) => s.alive)
  const roles = useGameStore((s) => s.roles)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const roomPlayers = useRoomStore((s) => s.players)

  const amAlive = alive.includes(myId)
  const half = Math.ceil(roomPlayers.length / 2)
  const seatPlayers = side === 'left'
    ? roomPlayers.slice(0, half)
    : roomPlayers.slice(half)

  function handleAction(playerId: string, action: SeatAction) {
    if (!action) return
    playSound('wolf_action')
    if (action === 'vote') socketEvents.dayVote(playerId)
    if (action === 'kill') socketEvents.wolfVote(playerId)
    if (action === 'check') socketEvents.seerInspect(playerId)
    if (action === 'protect') socketEvents.doctorProtect(playerId)
  }

  return (
    <div
      className={`flex flex-col justify-center gap-2 sm:gap-3 py-4 flex-shrink-0 ${
        side === 'left' ? 'items-start pl-2 sm:pl-3' : 'items-end pr-2 sm:pr-3'
      }`}
      style={{ width: '88px' }}
    >
      {seatPlayers.map((p) => {
        const seatNum = roomPlayers.indexOf(p) + 1
        const isMe = p.playerId === myId
        const isPlayerAlive = alive.includes(p.playerId)
        const role = roles[p.playerId] as Role | undefined
        const isWolfAlly = knownAllies.includes(p.playerId)
        const action = seatAction(phase, myRole, isMe, amAlive, isPlayerAlive)

        const showRole =
          isMe ||
          !isPlayerAlive ||
          (phase === 'NIGHT' && myRole === 'werewolf' && isWolfAlly)

        return (
          <SeatCard
            key={p.playerId}
            seatNumber={seatNum}
            displayName={p.displayName}
            role={showRole ? role : undefined}
            isAlive={isPlayerAlive}
            isWolfAlly={phase === 'NIGHT' && myRole === 'werewolf' && isWolfAlly}
            action={action}
            disabled={isMe || !amAlive}
            onAction={() => handleAction(p.playerId, action)}
          />
        )
      })}
    </div>
  )
}

function CenterContent() {
  const phase = useGameStore((s) => s.phase)
  const alive = useGameStore((s) => s.alive)
  const myId = useAuthStore((s) => s.playerId)!
  const isDead = !alive.includes(myId)

  switch (phase) {
    case 'ROLE_ASSIGNMENT':
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <RoleCard />
        </div>
      )
    case 'NIGHT':
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center px-2">
          <NightPanel />
        </div>
      )
    case 'DAWN':
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <DawnPanel />
        </div>
      )
    case 'DAY_DISCUSSION':
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-2 pt-2 pb-2 px-2">
          <SkipVoteBar />
          <div className="flex-1 min-h-0">
            <ChatPanel
              visibleChannels={isDead ? ['ghost'] : ['day']}
              defaultChannel={isDead ? 'ghost' : 'day'}
            />
          </div>
          {isDead && (
            <div className="h-[26vh] sm:h-40 flex-shrink-0">
              <ChatPanel visibleChannels={['day']} />
            </div>
          )}
        </div>
      )
    case 'DAY_VOTING':
      return (
        <div className="flex-1 min-h-0 flex flex-col gap-2 pt-2 pb-2 px-2">
          <div className="h-[28vh] sm:h-48 flex-shrink-0">
            <ChatPanel visibleChannels={['day']} />
          </div>
          <p className="text-white/40 text-xs text-center flex-shrink-0">
            Tap a VOTE button on a player seat to cast your vote
          </p>
        </div>
      )
    case 'DAY_RESULT':
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <DayResultPanel />
        </div>
      )
    default:
      return null
  }
}

export default function Game() {
  const phase = useGameStore((s) => s.phase)
  const variant = sceneVariant(phase)
  const isNight = phase === 'NIGHT'

  return (
    <>
      <SceneBackground variant={variant} showBats={isNight} />
      <div
        className="relative z-10 w-full flex flex-col"
        style={{ minHeight: '100dvh' }}
      >
        <TopBar />
        {isNight && (
          <div className="flex-shrink-0 flex justify-center py-1">
            <TeamStrengthBar />
          </div>
        )}
        <div className="flex-1 min-h-0 flex">
          <SeatColumn side="left" />
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CenterContent />
          </div>
          <SeatColumn side="right" />
        </div>
      </div>
    </>
  )
}

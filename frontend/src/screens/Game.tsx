// frontend/src/screens/Game.tsx
import { useState, useEffect } from 'react'
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
  round: number,
  seerCanActRound1: boolean,
): SeatAction {
  if (isMe || !amAlive || !targetIsAlive) return null
  if (phase === 'DAY_VOTING') return 'vote'
  if (phase === 'NIGHT') {
    if (myRole === 'werewolf') return 'kill'
    if (myRole === 'seer' && !(round === 1 && !seerCanActRound1)) return 'check'
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
  const round = useGameStore((s) => s.round)
  const seerResults = useGameStore((s) => s.seerResults)
  const seerInspectedTargets = useGameStore((s) => s.seerInspectedTargets)
  const dayVotes = useGameStore((s) => s.dayVotes)
  const roomPlayers = useRoomStore((s) => s.players)
  const seerCanActRound1 = useRoomStore((s) => s.settings.seerCanActRound1)

  // Optimistic night action: track which player the current user acted on this night
  const [optimisticTarget, setOptimisticTarget] = useState<string | null>(null)
  useEffect(() => { setOptimisticTarget(null) }, [phase, round])

  const amAlive = alive.includes(myId)
  const half = Math.ceil(roomPlayers.length / 2)
  const seatPlayers = side === 'left'
    ? roomPlayers.slice(0, half)
    : roomPlayers.slice(half)

  function handleAction(playerId: string, action: SeatAction) {
    if (!action) return
    if (action === 'cancel') {
      playSound('vote_thud')
      socketEvents.dayVote(null)
      return
    }
    if (action === 'vote') { playSound('vote_thud'); socketEvents.dayVote(playerId); return }
    if (action === 'kill') {
      // Toggle off if clicking the already-selected kill target
      if (optimisticTarget === playerId) { setOptimisticTarget(null); return }
      playSound('wolf_action'); setOptimisticTarget(playerId); socketEvents.wolfVote(playerId)
      return
    }
    if (action === 'check') { playSound('seer_action'); setOptimisticTarget(playerId); socketEvents.seerInspect(playerId) }
    if (action === 'protect') { playSound('doctor_action'); setOptimisticTarget(playerId); socketEvents.doctorProtect(playerId) }
  }

  return (
    <div
      className={`flex flex-col justify-center gap-5 py-4 flex-shrink-0 ${
        side === 'left' ? 'items-start pl-2 sm:pl-3' : 'items-end pr-2 sm:pr-3'
      }`}
      style={{ width: 80 }}
    >
      {seatPlayers.map((p) => {
        const isMe = p.playerId === myId
        const isPlayerAlive = alive.includes(p.playerId)
        const role = roles[p.playerId] as Role | undefined
        const isWolfAlly = knownAllies.includes(p.playerId)

        const showRole =
          isMe ||
          !isPlayerAlive ||
          (phase === 'NIGHT' && myRole === 'werewolf' && isWolfAlly)

        const alreadyInspected = seerInspectedTargets.includes(p.playerId)
        const seerResult = myRole === 'seer'
          ? seerResults.find((r) => r.targetId === p.playerId)
          : undefined

        const action = seatAction(phase, myRole, isMe, amAlive, isPlayerAlive, round, seerCanActRound1)

        // Vote cancel state (server-confirmed via dayVotes)
        const myVoteTarget = dayVotes[myId]
        const iVotedForThis = myVoteTarget === p.playerId
        const dayVoteLocked = phase === 'DAY_VOTING' && !!myVoteTarget && !iVotedForThis
        const effectiveAction: SeatAction =
          phase === 'DAY_VOTING' && iVotedForThis ? 'cancel' : action

        const nightActionDone = phase === 'NIGHT' && optimisticTarget !== null
        const isDisabled =
          isMe ||
          !amAlive ||
          (myRole === 'seer' && phase === 'NIGHT' && alreadyInspected) ||
          (nightActionDone && p.playerId !== optimisticTarget) ||
          dayVoteLocked

        const isSelected = phase === 'NIGHT' && optimisticTarget === p.playerId

        return (
          <SeatCard
            key={p.playerId}
            playerId={p.playerId}
            displayName={p.displayName}
            role={showRole ? role : undefined}
            seerResult={seerResult ? (seerResult.isWolf ? 'wolf' : 'innocent') : null}
            isAlive={isPlayerAlive}
            isWolfAlly={phase === 'NIGHT' && myRole === 'werewolf' && isWolfAlly}
            action={effectiveAction}
            disabled={isDisabled}
            selected={isSelected}
            onAction={() => handleAction(p.playerId, effectiveAction)}
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
        <div className="flex-1 min-h-0 flex flex-col pt-1 pb-2">
          <SkipVoteBar />
          <div className="flex-1 min-h-0">
            <ChatPanel
              sendChannel={isDead ? undefined : 'day'}
              canSend={!isDead}
            />
          </div>
        </div>
      )
    case 'DAY_VOTING':
      return (
        <div className="flex-1 min-h-0 flex flex-col pb-2">
          <div className="flex-1 min-h-0">
            <ChatPanel sendChannel="day" canSend={!isDead} />
          </div>
          <p className="text-white/35 text-xs text-center flex-shrink-0 pb-1">
            Tap VOTE on a seat to cast your vote
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

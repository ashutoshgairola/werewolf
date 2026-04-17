// frontend/src/screens/Game.tsx
import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { RoleCard } from '@/components/game/RoleCard'
import { NightPanel } from '@/components/game/NightPanel'
import { DawnPanel } from '@/components/game/DawnPanel'
import { DayResultPanel } from '@/components/game/DayResultPanel'
import { PhaseHeader } from '@/components/game/PhaseHeader'
import { VotePanel } from '@/components/game/VotePanel'
import { SkipVoteBar } from '@/components/game/SkipVoteBar'
import { ChatPanel } from '@/components/game/ChatPanel'
import { InGamePlayerList } from '@/components/game/InGamePlayerList'
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
      className="fixed top-3 left-3 z-50 sm:hidden w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-base border border-white/10"
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
      className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-sm border border-white/10 transition-colors flex-shrink-0"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}

// ── Day Discussion ────────────────────────────────────────────────────────────
// Mobile: phase header → killed banner → [Players toggle] → Chat fills rest
// Desktop: header → 3-col (players sidebar | chat | ghost chat)

function DayDiscussionView() {
  const players = useRoomStore((s) => s.players)
  const alive = useGameStore((s) => s.alive)
  const dawnInfo = useGameStore((s) => s.dawnInfo)
  const myId = useAuthStore((s) => s.playerId)!
  const [showPlayers, setShowPlayers] = useState(false)

  const isDead = !alive.includes(myId)

  const killedLastNight = dawnInfo?.killedPlayerId
    ? players.find((p) => p.playerId === dawnInfo.killedPlayerId)?.displayName ?? null
    : null

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0 border-b border-wood/20">
        <PhaseHeader />
        <DesktopMuteButton />
      </div>

      {/* Kill banner */}
      {killedLastNight && (
        <div className="flex-shrink-0 mx-3 mt-2 bg-black/30 border border-ember/40 rounded-lg px-3 py-1.5 text-sm text-ember/90 font-body text-center">
          ☠️ <strong>{killedLastNight}</strong> was found dead this morning
        </div>
      )}

      {/* Mobile: player list toggle button */}
      <div className="sm:hidden flex-shrink-0 px-3 pt-2">
        <button
          onClick={() => setShowPlayers((v) => !v)}
          className="w-full flex items-center justify-between bg-parchment-light border border-wood/30 rounded-lg px-3 py-2 text-sm font-body text-wood-dark"
        >
          <span>👥 Players ({alive.length} alive)</span>
          <span className="text-wood/50">{showPlayers ? '▲' : '▼'}</span>
        </button>
        {showPlayers && (
          <div className="mt-2 max-h-48 overflow-y-auto bg-parchment border border-wood/20 rounded-lg p-2">
            <InGamePlayerList />
            <div className="mt-2">
              <SkipVoteBar />
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-3 p-3">
        {/* Desktop sidebar: players + skip */}
        <div className="hidden sm:flex sm:w-52 lg:w-60 flex-shrink-0 flex-col gap-3 overflow-y-auto">
          <InGamePlayerList />
          <SkipVoteBar />
        </div>

        {/* Chat — fills remaining space */}
        <div className="flex-1 min-h-0">
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>

        {/* Ghost chat for dead players — right rail on desktop, strip below on mobile */}
        {isDead && (
          <div className="sm:w-56 lg:w-64 flex-shrink-0 h-[28vh] sm:h-auto min-h-0">
            <ChatPanel visibleChannels={['ghost']} defaultChannel="ghost" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Day Voting ────────────────────────────────────────────────────────────────
// Mobile: header → vote grid (scrollable) → chat strip (fixed height)
// Desktop: header → vote panel left | chat right

function DayVotingView() {
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <div className="flex items-center justify-between flex-shrink-0 border-b border-wood/20">
        <PhaseHeader />
        <DesktopMuteButton />
      </div>

      {/* Mobile: vote grid top, compact chat strip bottom — gap/padding tightened */}
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-2 sm:gap-3 p-2 sm:p-3">
        {/* Vote panel — scrollable on mobile if many players */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <VotePanel />
        </div>

        {/* Chat — 26vh on mobile so the vote grid has breathing room; full column on desktop */}
        <div className="h-[26vh] sm:h-auto sm:w-64 lg:w-72 flex-shrink-0 min-h-0">
          <ChatPanel visibleChannels={['day', 'system']} />
        </div>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

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

import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { PlayerGrid } from './PlayerGrid'
import { playSound } from '@/hooks/useSoundManager'

export function WolfNightPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const wolfTally = useGameStore((s) => s.wolfTally)
  const round = useGameStore((s) => s.round)
  const myId = useAuthStore((s) => s.playerId)!
  const players = useRoomStore((s) => s.players)
  const wolvesCanKillRound1 = useRoomStore((s) => s.settings.wolvesCanKillRound1)

  function nameOf(id: string): string {
    return players.find((p) => p.playerId === id)?.displayName ?? id.slice(0, 6)
  }

  const allWolfIds = [myId, ...knownAllies]

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
    socketEvents.wolfVote(id)
    playSound('wolf_action')
  }

  // Pack section — always shown so wolves always know who their allies are
  const packSection = (
    <div className="bg-ember/10 border border-ember/20 rounded-lg px-3 py-2">
      <p className="text-ember/60 text-xs font-body uppercase tracking-widest mb-1.5">Your pack</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="bg-ember/20 text-ember text-xs font-body px-2 py-0.5 rounded-full">
          🐺 {nameOf(myId)} (you)
        </span>
        {knownAllies.map((id) => (
          <span key={id} className="bg-ember/20 text-ember text-xs font-body px-2 py-0.5 rounded-full">
            🐺 {nameOf(id)}
          </span>
        ))}
      </div>
    </div>
  )

  if (round === 1 && !wolvesCanKillRound1) {
    return (
      <div className="space-y-4">
        {packSection}
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <span className="text-5xl">🌙</span>
          <p className="font-tavern text-parchment text-xl">Peaceful First Night</p>
          <p className="text-parchment/50 font-body text-sm max-w-xs">
            No kill on the first night. Use this time to plan with your pack.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {packSection}

      <div className="text-center">
        <p className="font-tavern text-parchment text-lg">Choose your prey</p>
        <p className="text-parchment/50 text-sm font-body">Vote with your pack to eliminate a villager</p>
      </div>

      {/* Live vote tally */}
      {Object.keys(wolfTally).length > 0 && (
        <div className="bg-ember/10 border border-ember/30 rounded-lg px-3 py-2 text-sm text-ember font-body">
          Pack vote: {Object.entries(wolfTally)
            .map(([id, count]) => `${nameOf(id)} ×${count}`)
            .join(', ')}
        </div>
      )}

      <PlayerGrid
        filter={(id) => !allWolfIds.includes(id)}
        selectedId={selectedId}
        showDead={true}
        onSelect={handleSelect}
      />
    </div>
  )
}

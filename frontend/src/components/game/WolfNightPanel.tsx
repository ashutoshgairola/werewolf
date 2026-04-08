import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { PlayerGrid } from './PlayerGrid'

export function WolfNightPanel() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const wolfTally = useGameStore((s) => s.wolfTally)
  const round = useGameStore((s) => s.round)
  const myId = useAuthStore((s) => s.playerId)!

  const allWolfIds = [myId, ...knownAllies]

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
    socketEvents.wolfVote(id)
  }

  if (round === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <span className="text-5xl">🌙</span>
        <p className="font-tavern text-parchment text-xl">Peaceful First Night</p>
        <p className="text-parchment/50 font-body text-sm max-w-xs">
          No kill on the first night. Use this time to plan with your pack.
        </p>
        {knownAllies.length > 0 && (
          <p className="text-ember/80 text-sm font-body mt-2">
            Your allies: {knownAllies.join(', ')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-tavern text-parchment text-lg">Choose your prey</p>
        <p className="text-parchment/50 text-sm font-body">Vote with your pack to eliminate a villager</p>
      </div>

      {/* Tally from other wolves */}
      {Object.keys(wolfTally).length > 0 && (
        <div className="bg-ember/10 border border-ember/30 rounded-lg px-3 py-2 text-sm text-ember font-body">
          Pack vote: {Object.entries(wolfTally)
            .map(([id, count]) => `${id.slice(0, 6)} ×${count}`)
            .join(', ')}
        </div>
      )}

      <PlayerGrid
        filter={(id) => !allWolfIds.includes(id)}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
    </div>
  )
}

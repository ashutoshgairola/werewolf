import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { socketEvents } from '@/socket/events'
import { PlayerGrid } from './PlayerGrid'
import { playSound } from '@/hooks/useSoundManager'

export function SeerNightPanel() {
  // Track which round the inspection was made — resets automatically when round increments
  const [inspectedRound, setInspectedRound] = useState<number | null>(null)
  const round = useGameStore((s) => s.round)
  const seerCanActRound1 = useRoomStore((s) => s.settings.seerCanActRound1)
  const blocked = round === 1 && !seerCanActRound1
  const inspected = inspectedRound === round
  const seerResults = useGameStore((s) => s.seerResults)
  const seerInspectedTargets = useGameStore((s) => s.seerInspectedTargets)

  function handleSelect(id: string) {
    if (inspected) return
    setInspectedRound(round)
    socketEvents.seerInspect(id)
    playSound('seer_action')
  }

  const resultEntry = seerResults[seerResults.length - 1]

  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <span className="text-5xl">🔮</span>
        <p className="font-tavern text-parchment text-xl">Vision Clouded</p>
        <p className="text-parchment/50 font-body text-sm max-w-xs">
          Your sight is not yet clear. The spirits have blocked your vision on the first night.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-tavern text-parchment text-lg">Inspect a player</p>
        <p className="text-parchment/50 text-sm font-body">
          {inspected ? 'You have used your vision for tonight' : 'Choose one player to learn their alignment'}
        </p>
      </div>

      {/* Latest result */}
      {inspected && resultEntry && (
        <div className={`border rounded-lg px-4 py-3 text-center font-body ${
          resultEntry.isWolf
            ? 'bg-ember/20 border-ember text-ember'
            : 'bg-green-100 border-green-500 text-green-700'
        }`}>
          <span className="text-2xl">{resultEntry.isWolf ? '🐺' : '👤'}</span>
          <p className="font-semibold mt-1">
            {resultEntry.isWolf ? 'This player is a Werewolf!' : 'This player is innocent.'}
          </p>
        </div>
      )}

      {/* Previously inspected */}
      {seerInspectedTargets.length > 0 && (
        <div className="text-xs text-parchment/40 font-body text-center">
          Already inspected: {seerInspectedTargets.length} player{seerInspectedTargets.length !== 1 ? 's' : ''}
        </div>
      )}

      <PlayerGrid
        filter={(id) => !seerInspectedTargets.includes(id)}
        selectedId={inspected ? (resultEntry?.targetId ?? null) : null}
        disabledIds={inspected ? [] : []}
        onSelect={inspected ? undefined : handleSelect}
      />
    </div>
  )
}

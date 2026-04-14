import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { PlayerGrid } from './PlayerGrid'
import { playSound } from '@/hooks/useSoundManager'

export function DoctorNightPanel() {
  const [protected_, setProtected] = useState(false)
  const lastProtected = useGameStore((s) => s.doctorLastProtected)
  const myId = useAuthStore((s) => s.playerId)!

  function handleSelect(id: string) {
    if (protected_) return
    setProtected(true)
    socketEvents.doctorProtect(id)
    playSound('doctor_action')
  }

  const disabledIds = [
    ...(lastProtected ? [lastProtected] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="font-tavern text-parchment text-lg">Protect a player</p>
        <p className="text-parchment/50 text-sm font-body">
          {protected_
            ? 'You have chosen who to protect tonight'
            : 'Choose one player to shield from harm'}
        </p>
        {lastProtected && (
          <p className="text-parchment/30 text-xs font-body mt-1">
            Cannot protect the same player twice in a row
          </p>
        )}
      </div>

      <PlayerGrid
        filter={(id) => id !== myId}
        disabledIds={disabledIds}
        onSelect={protected_ ? undefined : handleSelect}
        showDead={false}
      />
    </div>
  )
}

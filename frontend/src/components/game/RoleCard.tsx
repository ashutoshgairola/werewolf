import { useState, useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { ROLE_INFO } from '@/types/game'

export function RoleCard() {
  const role = useGameStore((s) => s.role)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const players = useRoomStore((s) => s.players)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 600)
    return () => clearTimeout(t)
  }, [])

  if (!role) return null

  const info = ROLE_INFO[role]
  const allyNames = knownAllies
    .map((id) => players.find((p) => p.playerId === id)?.displayName ?? id)
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-moon flex flex-col items-center justify-center p-6">
      <p className="font-tavern text-parchment/60 text-sm uppercase tracking-widest mb-8">
        Your role has been assigned
      </p>

      {/* Card flip container */}
      <div
        className="w-64 h-96 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-2xl bg-wood-dark border-2 border-candle/40 flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-6xl">🃏</span>
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-2xl bg-parchment-light border-2 border-wood flex flex-col items-center justify-center gap-4 p-6"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-7xl">{info.icon}</span>
            <h2 className="font-tavern text-2xl text-wood-dark">{info.name}</h2>
            <p className="font-body text-ink/70 text-sm text-center leading-relaxed">{info.desc}</p>

            {allyNames.length > 0 && (
              <div className="mt-2 border-t border-wood/30 pt-3 w-full text-center">
                <p className="text-xs font-body text-ember font-semibold mb-1">Your pack:</p>
                {allyNames.map((name) => (
                  <p key={name} className="text-sm font-body text-ink">{name}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-parchment/40 text-xs mt-8 font-body">
        {flipped ? 'Click to flip back' : 'Flip to reveal'}
      </p>
    </div>
  )
}

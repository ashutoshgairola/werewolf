// frontend/src/components/game/RoleCard.tsx
import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { ROLE_INFO } from '@/types/game'
import { ROLE_THEMES, SOUND_URLS } from '@/theme/roleThemes'
import type { SoundKey } from '@/theme/roleThemes'
import { preloadSounds, playSound } from '@/hooks/useSoundManager'

export function RoleCard() {
  const role = useGameStore((s) => s.role)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const players = useRoomStore((s) => s.players)
  const [flipped, setFlipped] = useState(false)
  const soundPlayedRef = useRef(false)

  // Preload all sounds eagerly when the role card mounts — user is about to interact
  useEffect(() => {
    const keys = Object.keys(SOUND_URLS) as SoundKey[]
    preloadSounds(keys)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 600)
    return () => clearTimeout(t)
  }, [])

  // Play reveal sound once when card flips to the role face
  useEffect(() => {
    if (flipped && role && !soundPlayedRef.current) {
      soundPlayedRef.current = true
      const theme = ROLE_THEMES[role]
      // Small delay so sound lands when the card face is fully visible
      const t = setTimeout(() => playSound(theme.sounds.reveal), 350)
      return () => clearTimeout(t)
    }
  }, [flipped, role])

  if (!role) return null

  const info = ROLE_INFO[role]
  const theme = ROLE_THEMES[role]
  const allyNames = knownAllies
    .map((id) => players.find((p) => p.playerId === id)?.displayName ?? id)
    .filter(Boolean)

  return (
    <div
      className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-4 gap-4"
      style={{ position: 'relative', zIndex: 1 }}
    >
      <p className="font-tavern text-parchment/60 text-sm uppercase tracking-widest">
        Your role has been assigned
      </p>

      <div
        className="w-56 h-80 sm:w-64 sm:h-96 cursor-pointer"
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

          {/* Back face — role reveal with theme colours */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-4 p-6"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: `linear-gradient(145deg, ${theme.bgFrom}, ${theme.bgTo})`,
              border: `2px solid ${theme.borderColor}`,
              boxShadow: `0 0 30px ${theme.glowColor}`,
            }}
          >
            <span
              className="text-7xl"
              style={{ filter: `drop-shadow(0 0 12px ${theme.accentColor})` }}
            >
              {info.icon}
            </span>
            <h2 className="font-tavern text-2xl" style={{ color: theme.accentColor }}>
              {info.name}
            </h2>
            <p
              className="font-body text-sm text-center leading-relaxed"
              style={{ color: theme.accentColor + 'aa' }}
            >
              {info.desc}
            </p>

            {allyNames.length > 0 && (
              <div
                className="mt-2 pt-3 w-full text-center"
                style={{ borderTop: `1px solid ${theme.borderColor}` }}
              >
                <p className="text-xs font-body font-semibold mb-1" style={{ color: theme.accentColor }}>
                  Your pack:
                </p>
                {allyNames.map((name) => (
                  <p key={name} className="text-sm font-body" style={{ color: theme.accentColor }}>
                    {name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-parchment/40 text-xs font-body">
        {flipped ? 'Click to flip back' : 'Flip to reveal'}
      </p>
    </div>
  )
}

// frontend/src/theme/RoleAtmosphere.tsx
import { useMemo } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useRoleTheme } from '@/hooks/useRoleTheme'

// Seeded random positions for particles — deterministic per role to avoid re-layout
function getParticlePositions(seed: string, count: number) {
  const positions: Array<{ left: string; top: string; delay: string; duration: string; size: string }> = []
  // Simple deterministic pseudo-random from string seed
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  const rand = (n: number) => { h = (Math.imul(1664525, h) + 1013904223) | 0; return ((h >>> 0) % n) }
  for (let i = 0; i < count; i++) {
    positions.push({
      left: `${5 + rand(90)}%`,
      top: `${10 + rand(80)}%`,
      delay: `${rand(4000)}ms`,
      duration: `${3000 + rand(3000)}ms`,
      size: `${2 + rand(3)}px`,
    })
  }
  return positions
}

export function RoleAtmosphere() {
  const role = useGameStore((s) => s.role)
  const phase = useGameStore((s) => s.phase)
  const theme = useRoleTheme()

  // Don't render before role is revealed or after game over fades
  const visible = role !== null && phase !== null && phase !== 'LOBBY'

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const particleCount = isMobile ? 8 : 16

  const particles = useMemo(
    () => theme ? getParticlePositions(role ?? '', particleCount) : [],
    [role, particleCount, theme]
  )

  // Pick particle animation based on role
  const particleAnimation = role === 'seer'
    ? 'particle-twinkle'
    : 'particle-float'

  if (!visible || !theme) return null

  const fadeOut = phase === 'GAME_OVER'

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, opacity: fadeOut ? 0 : 1, transition: 'opacity 2s ease-out' }}
      aria-hidden="true"
    >
      {/* Background gradient — two layers for crossfade on role change */}
      <div
        className="absolute inset-0 animate-atmosphere-fade-in"
        style={{
          background: `linear-gradient(145deg, ${theme.bgFrom} 0%, ${theme.bgTo} 50%, ${theme.bgFrom} 100%)`,
        }}
      />

      {/* Radial glow orb — top-right */}
      <div
        className="absolute animate-glow-pulse"
        style={{
          top: '-80px',
          right: '-80px',
          width: isMobile ? '200px' : '320px',
          height: isMobile ? '200px' : '320px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.glowColor}, transparent 70%)`,
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute rounded-full animate-${particleAnimation}`}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: theme.particleColor,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      {/* Flavour text — desktop: top banner below PhaseHeader; mobile: bottom-fixed */}
      <div
        className={[
          'absolute left-0 right-0 px-4 py-3 animate-flavour-slide-up',
          'sm:top-[52px] sm:bottom-auto',  // desktop: below the ~52px PhaseHeader
          'bottom-0 sm:top-auto',          // mobile: pinned to bottom
          'bg-black/40 backdrop-blur-sm',
        ].join(' ')}
      >
        <p
          className="font-body italic text-center text-sm sm:text-base"
          style={{ color: theme.accentColor }}
        >
          {theme.flavourText}
        </p>
      </div>
    </div>
  )
}

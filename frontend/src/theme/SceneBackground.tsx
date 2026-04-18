// frontend/src/theme/SceneBackground.tsx
interface SceneBackgroundProps {
  variant: 'night' | 'day' | 'wolf'
  showBats?: boolean
}

export function SceneBackground({ variant, showBats = false }: SceneBackgroundProps) {
  const bgClass =
    variant === 'night' ? 'bg-scene-night' :
    variant === 'wolf'  ? 'bg-scene-wolf'  :
    'bg-scene-day'

  const moonDim = variant === 'wolf'

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {/* Gradient layer */}
      <div className={`absolute inset-0 transition-all duration-700 ${bgClass}`} />

      {/* Left foliage */}
      <svg className="absolute top-0 left-0 opacity-55" width="220" height="200" viewBox="0 0 220 200" fill="none">
        <ellipse cx="20"  cy="90"  rx="70"  ry="115" fill="#0a2010" opacity="0.9" />
        <ellipse cx="70"  cy="45"  rx="60"  ry="95"  fill="#0d2814" opacity="0.85" />
        <ellipse cx="120" cy="20"  rx="85"  ry="65"  fill="#0a2010" opacity="0.8" />
        <ellipse cx="10"  cy="140" rx="45"  ry="90"  fill="#081808" opacity="0.95" />
        <ellipse cx="165" cy="10"  rx="95"  ry="45"  fill="#0d2814" opacity="0.7" />
      </svg>

      {/* Right foliage (mirror) */}
      <svg className="absolute top-0 right-0 opacity-55" style={{ transform: 'scaleX(-1)' }} width="220" height="200" viewBox="0 0 220 200" fill="none">
        <ellipse cx="20"  cy="90"  rx="70"  ry="115" fill="#0a2010" opacity="0.9" />
        <ellipse cx="70"  cy="45"  rx="60"  ry="95"  fill="#0d2814" opacity="0.85" />
        <ellipse cx="120" cy="20"  rx="85"  ry="65"  fill="#0a2010" opacity="0.8" />
        <ellipse cx="10"  cy="140" rx="45"  ry="90"  fill="#081808" opacity="0.95" />
        <ellipse cx="165" cy="10"  rx="95"  ry="45"  fill="#0d2814" opacity="0.7" />
      </svg>

      {/* Cityscape silhouette */}
      <div className="absolute bottom-0 left-0 right-0 h-20" style={{ background: 'linear-gradient(to top, #0a0d18 0%, transparent 100%)' }}>
        <svg className="absolute bottom-0 left-0 w-full" height="70" viewBox="0 0 1200 70" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0"    y="25" width="40"  height="45" fill="#0d1020" />
          <rect x="35"   y="10" width="25"  height="60" fill="#0a0e1c" />
          <rect x="70"   y="30" width="55"  height="40" fill="#0d1020" />
          <rect x="120"  y="15" width="20"  height="55" fill="#0a0e1c" />
          <rect x="150"  y="35" width="60"  height="35" fill="#0d1020" />
          <rect x="205"  y="20" width="30"  height="50" fill="#0a0e1c" />
          <rect x="245"  y="5"  width="25"  height="65" fill="#0d1020" />
          <rect x="280"  y="32" width="55"  height="38" fill="#0a0e1c" />
          <rect x="340"  y="18" width="22"  height="52" fill="#0d1020" />
          <rect x="370"  y="28" width="48"  height="42" fill="#0a0e1c" />
          <rect x="425"  y="12" width="28"  height="58" fill="#0d1020" />
          <rect x="460"  y="22" width="65"  height="48" fill="#0a0e1c" />
          <rect x="535"  y="10" width="25"  height="60" fill="#0d1020" />
          <rect x="570"  y="28" width="52"  height="42" fill="#0a0e1c" />
          <rect x="630"  y="18" width="30"  height="52" fill="#0d1020" />
          <rect x="670"  y="34" width="70"  height="36" fill="#0a0e1c" />
          <rect x="750"  y="8"  width="22"  height="62" fill="#0d1020" />
          <rect x="782"  y="26" width="58"  height="44" fill="#0a0e1c" />
          <rect x="850"  y="16" width="28"  height="54" fill="#0d1020" />
          <rect x="890"  y="30" width="50"  height="40" fill="#0a0e1c" />
          <rect x="950"  y="12" width="24"  height="58" fill="#0d1020" />
          <rect x="984"  y="22" width="80"  height="48" fill="#0a0e1c" />
          <rect x="1070" y="6"  width="26"  height="64" fill="#0d1020" />
          <rect x="1106" y="20" width="94"  height="50" fill="#0a0e1c" />
        </svg>
      </div>

      {/* Moon */}
      <div
        className="absolute animate-moon-glow"
        style={{
          top: '16px', left: '50%', transform: 'translateX(-50%)',
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #e8f4ff, #c0d8f0)',
          filter: moonDim ? 'brightness(0.4)' : 'brightness(1)',
          transition: 'filter 0.8s',
        }}
      />

      {/* Bats */}
      {showBats && (
        <>
          <div className="absolute animate-bat-fly opacity-40 text-lg" style={{ top: '18%', left: '15%', animationDelay: '0ms' }}>🦇</div>
          <div className="absolute animate-bat-fly opacity-30 text-lg" style={{ top: '12%', left: '55%', animationDelay: '1200ms' }}>🦇</div>
          <div className="absolute animate-bat-fly opacity-35 text-lg" style={{ top: '22%', right: '20%', animationDelay: '600ms' }}>🦇</div>
        </>
      )}
    </div>
  )
}

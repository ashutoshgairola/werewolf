import { useEffect, useState } from 'react'

export function VillagerNightPanel() {
  const [zOffset, setZOffset] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setZOffset((n) => (n + 1) % 3), 1200)
    return () => clearInterval(id)
  }, [])

  const zz = ['z', 'zz', 'zzz'][zOffset]

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <span className="text-6xl">😴</span>
      <div>
        <p className="font-tavern text-parchment text-2xl mb-1">You are sleeping…</p>
        <p className="text-parchment/50 font-body text-sm">
          The night forces are at work. Rest and wait for dawn.
        </p>
      </div>
      <p
        className="text-parchment/30 font-tavern text-4xl select-none transition-all duration-500"
        style={{ letterSpacing: '0.2em', opacity: 0.4 + zOffset * 0.2 }}
      >
        {zz}
      </p>
    </div>
  )
}

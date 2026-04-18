import { useGameStore } from '@/stores/gameStore'

export function SeerNightPanel() {
  const seerResults = useGameStore((s) => s.seerResults)

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-5xl sm:text-6xl
        bg-gradient-to-br from-blue-900 to-blue-950
        shadow-[0_0_50px_rgba(62,193,243,0.5),0_0_100px_rgba(62,193,243,0.18)] animate-pulse">
        👁️
      </div>
      <p className="text-white text-lg sm:text-xl font-bold">Choose a player to check</p>
      <p className="text-cyan-game/70 text-sm">You'll learn if they are a Werewolf</p>
      {seerResults.length > 0 && (
        <div className="text-xs text-white/40 space-y-0.5">
          <p className="uppercase tracking-widest text-[9px] text-white/30 mb-1">Past inspections</p>
          {seerResults.map(r => (
            <p key={r.targetId}>{r.isWolf ? '🐺 Wolf' : '😇 Innocent'}</p>
          ))}
        </div>
      )}
      <p className="text-white/40 text-sm">Use the CHECK button on a player seat</p>
    </div>
  )
}

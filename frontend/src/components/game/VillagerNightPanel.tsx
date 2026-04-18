export function VillagerNightPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center text-4xl sm:text-5xl
        bg-gradient-to-br from-navy-mid to-navy
        shadow-[0_0_20px_rgba(100,100,200,0.25)] animate-pulse">
        🌙
      </div>
      <p className="text-white text-base sm:text-lg font-bold">Night falls...</p>
      <div className="w-10 h-10 border-[3px] border-cyan-game/20 border-t-cyan-game rounded-full animate-spin" />
      <p className="text-white/50 text-sm">Waiting for night actions to complete</p>
    </div>
  )
}

export function DoctorNightPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-5xl sm:text-6xl
        bg-gradient-to-br from-green-900 to-green-950
        shadow-[0_0_50px_rgba(76,217,100,0.5),0_0_100px_rgba(76,217,100,0.18)] animate-pulse">
        💉
      </div>
      <p className="text-white text-lg sm:text-xl font-bold">Choose a player to protect</p>
      <p className="text-green-400/70 text-sm">They'll survive the wolf attack tonight</p>
      <p className="text-white/40 text-sm">Use the PROTECT button on a player seat</p>
    </div>
  )
}

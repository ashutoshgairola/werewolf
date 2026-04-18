import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'

export function WolfNightPanel() {
  const round = useGameStore((s) => s.round)
  const knownAllies = useGameStore((s) => s.knownAllies)
  const wolvesCanKillRound1 = useRoomStore((s) => s.settings.wolvesCanKillRound1)
  const myId = useAuthStore((s) => s.playerId)!
  const players = useRoomStore((s) => s.players)

  function nameOf(id: string) {
    return players.find(p => p.playerId === id)?.displayName ?? id.slice(0, 6)
  }

  const packNames = [myId, ...knownAllies].map(nameOf).join(', ')

  if (round === 1 && !wolvesCanKillRound1) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-32 h-32 rounded-full flex items-center justify-center text-5xl
          bg-gradient-to-br from-red-900 to-red-950
          shadow-[0_0_50px_rgba(200,0,0,0.45)] animate-pulse">
          🌙
        </div>
        <p className="text-white text-lg font-bold">Peaceful First Night</p>
        <p className="text-white/50 text-sm max-w-xs">No kill on the first night. Plan with your pack.</p>
        <p className="text-red-400/70 text-xs">Your pack: {packNames}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center text-5xl sm:text-6xl
        bg-gradient-to-br from-red-900 to-red-950
        shadow-[0_0_50px_rgba(200,0,0,0.5),0_0_100px_rgba(200,0,0,0.18)] animate-pulse">
        🐾
      </div>
      <p className="text-white text-lg sm:text-xl font-bold">Choose a player to kill</p>
      <p className="text-red-400/70 text-xs">Your pack: {packNames}</p>
      <p className="text-white/40 text-sm">Use the KILL button on a player seat</p>
    </div>
  )
}

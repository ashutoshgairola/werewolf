import { useGameStore } from '@/stores/gameStore'
import { useRoomStore } from '@/stores/roomStore'
import { getPlayerColor } from '@/utils/playerColor'

export function SeerNightPanel() {
  const seerResults = useGameStore((s) => s.seerResults)
  const players = useGameStore((s) => s.players)
  const roomPlayers = useRoomStore((s) => s.players)

  function nameFor(targetId: string) {
    const gp = players.find((p) => p.playerId === targetId)
    if (gp) return gp.displayName
    const rp = roomPlayers.find((p) => p.playerId === targetId)
    return rp?.displayName ?? '?'
  }

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
        <div className="text-xs space-y-1.5 w-full max-w-[180px]">
          <p className="uppercase tracking-widest text-[9px] text-white/30 mb-1">Inspected</p>
          {seerResults.map((r) => {
            const name = nameFor(r.targetId)
            const color = getPlayerColor(r.targetId)
            return (
              <div key={r.targetId} className="flex items-center gap-2 justify-center">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ background: `${color}33`, color, border: `1.5px solid ${color}` }}
                >
                  {name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-white/70 truncate">{name}</span>
                <span>{r.isWolf ? '🐺' : '😇'}</span>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-white/40 text-sm">Use the CHECK button on a player seat</p>
    </div>
  )
}

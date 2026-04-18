// frontend/src/components/game/TeamStrengthBar.tsx
import { useGameStore } from '@/stores/gameStore'

export function TeamStrengthBar() {
  const players = useGameStore((s) => s.players)
  const roles = useGameStore((s) => s.roles)
  const alive = useGameStore((s) => s.alive)

  const allWithRole = players.filter(p => roles[p.playerId])
  const totalGood = allWithRole.filter(p => roles[p.playerId] !== 'werewolf').length
  const totalEvil = allWithRole.filter(p => roles[p.playerId] === 'werewolf').length
  const aliveGood = alive.filter(id => roles[id] && roles[id] !== 'werewolf').length
  const aliveEvil = alive.filter(id => roles[id] === 'werewolf').length

  if (totalGood === 0 && totalEvil === 0) return null

  return (
    <div className="flex items-center gap-3 mx-auto w-fit
      bg-navy-mid/65 backdrop-blur-sm border border-cyan-game/15
      rounded-full px-4 py-1.5 text-xs font-bold flex-shrink-0">
      <div className="flex items-center gap-1.5 text-green-400">
        <span>😇</span>
        <span className="hidden sm:inline">GOOD</span>
        <div className="flex gap-0.5">
          {Array.from({ length: totalGood }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < aliveGood ? 'bg-green-400' : 'bg-white/15'}`} />
          ))}
        </div>
      </div>
      <span className="text-white/40 text-[10px]">VS</span>
      <div className="flex items-center gap-1.5 text-action-vote">
        <div className="flex gap-0.5">
          {Array.from({ length: totalEvil }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < aliveEvil ? 'bg-action-vote' : 'bg-white/15'}`} />
          ))}
        </div>
        <span className="hidden sm:inline">EVIL</span>
        <span>😈</span>
      </div>
    </div>
  )
}

import { useState } from 'react'

const ROLES = [
  { icon: '👤', name: 'Villager', desc: 'No special power. Use your instincts to find and vote out the wolves.' },
  { icon: '🐺', name: 'Werewolf', desc: 'Each night, secretly vote with your pack to eliminate a villager.' },
  { icon: '🔮', name: 'Seer', desc: 'Each night, secretly learn if one player is a Werewolf or innocent.' },
  { icon: '💊', name: 'Doctor', desc: 'Each night, protect one player from the wolves. Cannot protect the same person twice in a row.' },
]

const PHASES = [
  { icon: '🌙', name: 'Night', desc: 'Wolves pick a victim. Seer inspects a player. Doctor protects someone.' },
  { icon: '🌅', name: 'Dawn', desc: 'The night\'s result is revealed — who died (or was saved).' },
  { icon: '☀️', name: 'Day Discussion', desc: 'Everyone talks and debates. Dead players can watch but not vote.' },
  { icon: '⚖️', name: 'Day Voting', desc: 'Vote to eliminate a suspect. Majority wins; ties mean no elimination.' },
]

export function GameRules() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-navy-mid border border-cyan-game/25 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-tavern text-white text-sm uppercase tracking-widest">📜 How to Play</span>
        <span className="text-white/50 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-cyan-game/15 pt-3">
          {/* Goal */}
          <div className="text-center bg-navy border border-cyan-game/15 rounded-lg px-3 py-2">
            <p className="font-tavern text-white text-sm">The Goal</p>
            <p className="text-white/60 text-xs font-sans mt-0.5">
              🏘️ <strong>Villagers</strong> win by eliminating all Werewolves.<br />
              🐺 <strong>Werewolves</strong> win when they equal or outnumber the Villagers.
            </p>
          </div>

          {/* Roles */}
          <div>
            <p className="text-xs font-sans text-white/60 uppercase tracking-widest mb-2">Roles</p>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <div key={r.name} className="flex gap-2.5 items-start">
                  <span className="text-lg flex-shrink-0 mt-0.5">{r.icon}</span>
                  <div>
                    <span className="font-sans text-white text-sm font-semibold">{r.name} — </span>
                    <span className="font-sans text-white/60 text-sm">{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div>
            <p className="text-xs font-sans text-white/60 uppercase tracking-widest mb-2">Each Round</p>
            <div className="space-y-2">
              {PHASES.map((p) => (
                <div key={p.name} className="flex gap-2.5 items-start">
                  <span className="text-lg flex-shrink-0 mt-0.5">{p.icon}</span>
                  <div>
                    <span className="font-sans text-white text-sm font-semibold">{p.name} — </span>
                    <span className="font-sans text-white/60 text-sm">{p.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-action-vote/10 border border-action-vote rounded-lg px-3 py-2 text-xs font-sans text-white/60 space-y-1">
            <p className="font-semibold text-white">💡 Tips</p>
            <p>• Wolves should bluff convincingly during the day.</p>
            <p>• The Seer should share info carefully — wolves will try to silence them.</p>
            <p>• Dead players join the ghost chat and can watch but not influence the game.</p>
          </div>
        </div>
      )}
    </div>
  )
}

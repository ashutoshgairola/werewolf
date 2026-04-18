// frontend/src/components/game/TopBar.tsx
import { useState } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useCountdown } from '@/hooks/useCountdown'
import { socketEvents } from '@/socket/events'

const ROLES_INFO = [
  { icon: '👤', name: 'Villager', desc: 'No special power. Find and vote out the wolves.' },
  { icon: '🐺', name: 'Werewolf', desc: 'Each night, secretly vote with your pack to eliminate a villager.' },
  { icon: '🔮', name: 'Seer', desc: 'Each night, learn if one player is a Werewolf or innocent.' },
  { icon: '💊', name: 'Doctor', desc: 'Each night, protect one player from the wolves.' },
]

const PHASES_INFO = [
  { icon: '🌙', name: 'Night', desc: 'Wolves pick a victim. Seer inspects. Doctor protects.' },
  { icon: '🌅', name: 'Dawn', desc: "The night's result is revealed." },
  { icon: '☀️', name: 'Day', desc: 'Everyone discusses who the wolf might be.' },
  { icon: '⚖️', name: 'Vote', desc: 'Vote to eliminate a suspect. Majority wins.' },
]

const PHASE_DISPLAY: Record<string, { day: string; name: string }> = {
  ROLE_ASSIGNMENT: { day: '',       name: 'YOUR ROLE' },
  NIGHT:           { day: 'NIGHT',  name: 'Night Action' },
  DAWN:            { day: '',       name: 'DAWN' },
  DAY_DISCUSSION:  { day: 'DAY',    name: 'DISCUSSION' },
  DAY_VOTING:      { day: 'DAY',    name: 'VOTE' },
  DAY_RESULT:      { day: 'DAY',    name: 'RESULTS' },
  GAME_OVER:       { day: '',       name: 'GAME OVER' },
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-navy-mid border border-cyan-game/30 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-lg">How to Play</h2>
          <button onClick={onClose} className="text-white/50 text-xl leading-none">✕</button>
        </div>

        <div className="bg-navy border border-cyan-game/15 rounded-xl px-3 py-2 text-center">
          <p className="text-white/60 text-xs">
            🏘️ <strong className="text-white">Villagers</strong> win by eliminating all Werewolves.<br />
            🐺 <strong className="text-white">Werewolves</strong> win when they match or outnumber Villagers.
          </p>
        </div>

        <div>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Roles</p>
          <div className="space-y-2">
            {ROLES_INFO.map((r) => (
              <div key={r.name} className="flex gap-2 items-start">
                <span className="text-lg flex-shrink-0">{r.icon}</span>
                <p className="text-sm text-white/70"><strong className="text-white">{r.name}</strong> — {r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-2">Each Round</p>
          <div className="space-y-2">
            {PHASES_INFO.map((p) => (
              <div key={p.name} className="flex gap-2 items-start">
                <span className="text-lg flex-shrink-0">{p.icon}</span>
                <p className="text-sm text-white/70"><strong className="text-white">{p.name}</strong> — {p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      onClick={onCancel}
    >
      <div
        className="bg-navy-mid border border-cyan-game/30 rounded-2xl w-full max-w-xs p-6 space-y-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white font-bold text-lg">Leave game?</p>
        <p className="text-white/50 text-sm">You'll be removed from the current game.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-cyan-game/30 text-white/70 text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-action-vote text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  )
}

export function TopBar() {
  const [showRules, setShowRules] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const phase = useGameStore((s) => s.phase)
  const round = useGameStore((s) => s.round)
  const phaseEndsAt = useGameStore((s) => s.phaseEndsAt)
  const secondsLeft = useCountdown(phaseEndsAt)

  if (!phase) return null

  const display = PHASE_DISPLAY[phase] ?? { day: '', name: phase }
  const dayLabel = display.day ? `${display.day} ${round}` : ''

  return (
    <>
      <div className="relative z-20 flex items-center justify-between px-4 py-2.5 flex-shrink-0">
        <button
          onClick={() => setShowLeave(true)}
          className="w-10 h-10 rounded-xl bg-navy-light/80 border border-cyan-game/20
            text-white text-lg flex items-center justify-center
            hover:bg-navy-light transition-colors backdrop-blur-sm"
          aria-label="Leave game"
        >
          🚪
        </button>

        <div className="flex items-center gap-2
          bg-gradient-to-r from-cyan-game to-cyan-glow
          rounded-full px-4 py-1.5 shadow-lg
          font-bold text-sm tracking-wide text-white uppercase
          [box-shadow:0_2px_16px_rgba(62,193,243,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]">
          {dayLabel && <span className="text-xs opacity-80 font-semibold">{dayLabel}</span>}
          <span>{display.name}</span>
          {phaseEndsAt && secondsLeft > 0 && (
            <span className="bg-black/25 rounded-full px-2 py-0.5 text-xs font-black min-w-[28px] text-center">
              {secondsLeft}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="w-10 h-10 rounded-xl bg-navy-light/80 border border-cyan-game/20
            text-white text-lg flex items-center justify-center
            hover:bg-navy-light transition-colors backdrop-blur-sm"
          aria-label="Help"
        >
          ❓
        </button>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showLeave && (
        <LeaveModal
          onConfirm={() => { socketEvents.leaveRoom(); setShowLeave(false) }}
          onCancel={() => setShowLeave(false)}
        />
      )}
    </>
  )
}

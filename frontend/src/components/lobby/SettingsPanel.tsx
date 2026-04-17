import { useState } from 'react'
import { socketEvents } from '@/socket/events'
import type { GameSettings } from '@/types/game'

interface SettingsPanelProps {
  settings: GameSettings
  isHost: boolean
}

function fmtMs(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  editing: boolean
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, editing, onChange }: SliderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-sm font-body text-wood-dark">{label}</span>
        <span className="text-sm font-mono text-ink font-semibold">{fmtMs(value)}</span>
      </div>
      {editing ? (
        <>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-candle"
          />
          <div className="flex justify-between text-xs text-wood/50">
            <span>{fmtMs(min)}</span>
            <span>{fmtMs(max)}</span>
          </div>
        </>
      ) : (
        <div className="h-1.5 bg-wood/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-candle/60 rounded-full"
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function SettingsPanel({ settings, isHost }: SettingsPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<GameSettings>(settings)

  // When server pushes a new settings update while NOT editing, sync draft
  // (editing mode intentionally keeps local draft isolated)
  const displayedSettings = editing ? draft : settings

  function startEdit() {
    setDraft(settings)  // always start from latest server value
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function saveEdit() {
    socketEvents.updateSettings(draft)
    setEditing(false)
  }

  function patch(p: Partial<GameSettings>) {
    setDraft((prev) => ({ ...prev, ...p }))
  }

  return (
    <div className="bg-parchment-light border border-wood/40 rounded-xl p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-tavern text-wood-dark text-sm uppercase tracking-widest">
          Game Settings
          {!isHost && <span className="text-wood/50 normal-case font-body text-xs ml-1">(host only)</span>}
        </h3>
        {isHost && !editing && (
          <button
            onClick={startEdit}
            className="text-xs font-body text-candle hover:text-candle/80 border border-candle/40 rounded px-2 py-0.5 transition-colors"
          >
            ✏ Edit
          </button>
        )}
      </div>

      <SliderRow
        label="Night Duration"
        value={displayedSettings.nightDuration}
        min={30_000} max={180_000} step={15_000}
        editing={editing}
        onChange={(v) => patch({ nightDuration: v })}
      />
      <SliderRow
        label="Day Discussion"
        value={displayedSettings.dayDiscussionDuration}
        min={60_000} max={600_000} step={30_000}
        editing={editing}
        onChange={(v) => patch({ dayDiscussionDuration: v })}
      />
      <SliderRow
        label="Day Voting"
        value={displayedSettings.dayVotingDuration}
        min={15_000} max={120_000} step={15_000}
        editing={editing}
        onChange={(v) => patch({ dayVotingDuration: v })}
      />

      <div className="border-t border-wood/20 pt-3 space-y-3">
        <p className="text-xs font-body text-wood/60 uppercase tracking-widest">Round 1 Rules</p>

        <label className={`flex items-center justify-between gap-3 ${editing ? 'cursor-pointer' : ''}`}>
          <span className="text-sm font-body text-wood-dark">Seer can inspect Night 1</span>
          <input
            type="checkbox"
            checked={displayedSettings.seerCanActRound1}
            disabled={!editing}
            onChange={(e) => patch({ seerCanActRound1: e.target.checked })}
            className="w-4 h-4 accent-candle disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>

        <label className={`flex items-center justify-between gap-3 ${editing ? 'cursor-pointer' : ''}`}>
          <span className="text-sm font-body text-wood-dark">Wolves can kill Night 1</span>
          <input
            type="checkbox"
            checked={displayedSettings.wolvesCanKillRound1}
            disabled={!editing}
            onChange={(e) => patch({ wolvesCanKillRound1: e.target.checked })}
            className="w-4 h-4 accent-candle disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      {/* Edit mode action buttons */}
      {editing && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={saveEdit}
            className="flex-1 bg-candle text-ink text-sm font-body font-semibold py-2 rounded-lg hover:bg-candle/80 transition-colors"
          >
            ✓ Save
          </button>
          <button
            onClick={cancelEdit}
            className="flex-1 bg-wood/10 text-wood-dark text-sm font-body py-2 rounded-lg hover:bg-wood/20 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

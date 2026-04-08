import { socketEvents } from '@/socket/events'
import type { GameSettings } from '@/types/game'

interface SettingsPanelProps {
  settings: GameSettings
  isHost: boolean
}

interface SliderProps {
  label: string
  value: number   // ms
  min: number     // ms
  max: number     // ms
  step: number    // ms
  disabled: boolean
  onCommit: (v: number) => void
}

function fmtMs(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`
}

function Slider({ label, value, min, max, step, disabled, onCommit }: SliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="text-sm font-body text-wood-dark">{label}</label>
        <span className="text-sm font-mono text-ink font-semibold">{fmtMs(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={value}
        disabled={disabled}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-candle disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <div className="flex justify-between text-xs text-wood/50">
        <span>{fmtMs(min)}</span>
        <span>{fmtMs(max)}</span>
      </div>
    </div>
  )
}

export function SettingsPanel({ settings, isHost }: SettingsPanelProps) {
  function emit(patch: Partial<GameSettings>) {
    socketEvents.updateSettings({ ...settings, ...patch })
  }

  return (
    <div className="bg-parchment-light border border-wood/40 rounded-xl p-4 space-y-4">
      <h3 className="font-tavern text-wood-dark text-sm uppercase tracking-widest">
        Game Settings {!isHost && <span className="text-wood/50 normal-case font-body text-xs">(host only)</span>}
      </h3>

      <Slider
        label="Night Duration"
        value={settings.nightDuration}
        min={30_000}
        max={180_000}
        step={15_000}
        disabled={!isHost}
        onCommit={(v) => emit({ nightDuration: v })}
      />

      <Slider
        label="Day Discussion"
        value={settings.dayDiscussionDuration}
        min={60_000}
        max={600_000}
        step={30_000}
        disabled={!isHost}
        onCommit={(v) => emit({ dayDiscussionDuration: v })}
      />

      <Slider
        label="Day Voting"
        value={settings.dayVotingDuration}
        min={15_000}
        max={120_000}
        step={15_000}
        disabled={!isHost}
        onCommit={(v) => emit({ dayVotingDuration: v })}
      />
    </div>
  )
}

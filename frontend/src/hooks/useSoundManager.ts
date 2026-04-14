// frontend/src/hooks/useSoundManager.ts
import { useCallback, useEffect, useState } from 'react'
import { SOUND_URLS, type SoundKey } from '@/theme/roleThemes'

// Module-level singleton state — shared across all hook instances
let _muted: boolean = (() => {
  try { return localStorage.getItem('werewolf-muted') === 'true' } catch { return false }
})()
let _listeners: Array<() => void> = []
const _audio: Partial<Record<SoundKey, HTMLAudioElement>> = {}
let _userInteracted = false

function notifyListeners() {
  // Snapshot to avoid mutation-during-iteration if a listener causes unmount
  ;[..._listeners].forEach(fn => fn())
}

function setMuted(value: boolean) {
  _muted = value
  try { localStorage.setItem('werewolf-muted', String(value)) } catch { /* ignore */ }
  // Apply to all loaded audio elements
  Object.values(_audio).forEach(el => { if (el) el.muted = value })
  notifyListeners()
}

// Unlock audio context on first user interaction (mobile autoplay gate)
function handleFirstInteraction() {
  _userInteracted = true
  document.removeEventListener('click', handleFirstInteraction)
  document.removeEventListener('touchstart', handleFirstInteraction)
  document.removeEventListener('keydown', handleFirstInteraction)
}
// Guard against non-browser environments (tests, SSR)
if (typeof document !== 'undefined') {
  document.addEventListener('click', handleFirstInteraction)
  document.addEventListener('touchstart', handleFirstInteraction)
  document.addEventListener('keydown', handleFirstInteraction)
}

export function preloadSounds(keys: SoundKey[]) {
  keys.forEach(key => {
    if (_audio[key]) return
    const el = new Audio()
    el.preload = 'auto'
    el.muted = _muted
    el.src = SOUND_URLS[key]
    el.load()
    _audio[key] = el
  })
}

export function playSound(key: SoundKey) {
  if (_muted) return
  if (!_userInteracted) return  // Don't attempt before user gesture on mobile
  const el = _audio[key]
  if (!el) {
    // Lazy-load if not preloaded — wait for canplaythrough to avoid silent mobile failures
    const lazy = new Audio(SOUND_URLS[key])
    lazy.muted = _muted
    lazy.preload = 'auto'
    _audio[key] = lazy
    lazy.addEventListener('canplaythrough', () => { if (!_muted) lazy.play().catch(() => {}) }, { once: true })
    lazy.load()
    return
  }
  // Rewind and play — allows rapid re-triggering (e.g. vote_thud)
  el.currentTime = 0
  el.play().catch(() => { /* silent fail */ })
}

export function useSoundManager() {
  const [muted, setMutedState] = useState(_muted)

  useEffect(() => {
    // Create listener inside useEffect so it reads _muted at call time, not at mount time
    const listener = () => setMutedState(_muted)
    _listeners.push(listener)
    return () => {
      _listeners = _listeners.filter(fn => fn !== listener)
    }
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(!_muted) // reads module-level truth, not React state — intentional
  }, [])

  const play = useCallback((key: SoundKey) => {
    playSound(key)
  }, [])

  return { play, muted, toggleMute }
}

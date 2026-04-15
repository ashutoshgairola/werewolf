// frontend/src/theme/roleThemes.ts
import type { Role, Faction } from '@/types/game'

export type SoundKey =
  | 'wolf_reveal'
  | 'seer_reveal'
  | 'doctor_reveal'
  | 'villager_reveal'
  | 'night_falls'
  | 'wolf_action'
  | 'seer_action'
  | 'doctor_action'
  | 'dawn_bell'
  | 'death_toll'
  | 'gavel'
  | 'vote_thud'
  | 'timer_tick'
  | 'elimination'
  | 'wolves_win'
  | 'villagers_win'

export interface RoleTheme {
  bgFrom: string
  bgTo: string
  glowColor: string
  accentColor: string
  borderColor: string
  flavourText: string
  particleColor: string
  sounds: {
    reveal: SoundKey
    nightAction: SoundKey
  }
  cssVars: {
    '--theme-bg-from': string
    '--theme-bg-to': string
    '--theme-glow': string
    '--theme-accent': string
    '--theme-border': string
  }
}

export const ROLE_THEMES: Record<Role, RoleTheme> = {
  werewolf: {
    bgFrom: '#1a0505',
    bgTo: '#2d0808',
    glowColor: 'rgba(180,0,0,0.3)',
    accentColor: '#ff4444',
    borderColor: '#8b0000',
    flavourText: 'The village sleeps. You hunt. Trust no one — not even your pack.',
    particleColor: '#ff4444',
    sounds: { reveal: 'wolf_reveal', nightAction: 'wolf_action' },
    cssVars: {
      '--theme-bg-from': '#1a0505',
      '--theme-bg-to': '#2d0808',
      '--theme-glow': 'rgba(180,0,0,0.3)',
      '--theme-accent': '#ff4444',
      '--theme-border': '#8b0000',
    },
  },
  seer: {
    bgFrom: '#050519',
    bgTo: '#0a0a2d',
    glowColor: 'rgba(50,100,255,0.3)',
    accentColor: '#7eb8f7',
    borderColor: '#2244aa',
    flavourText: 'The veil grows thin. Peer beyond. You see what others cannot.',
    particleColor: '#7eb8f7',
    sounds: { reveal: 'seer_reveal', nightAction: 'seer_action' },
    cssVars: {
      '--theme-bg-from': '#050519',
      '--theme-bg-to': '#0a0a2d',
      '--theme-glow': 'rgba(50,100,255,0.3)',
      '--theme-accent': '#7eb8f7',
      '--theme-border': '#2244aa',
    },
  },
  doctor: {
    bgFrom: '#031a0a',
    bgTo: '#062d12',
    glowColor: 'rgba(40,160,80,0.3)',
    accentColor: '#55cc77',
    borderColor: '#1a6635',
    flavourText: 'Your hands carry life and death. One soul to save each night — choose wisely.',
    particleColor: '#55cc77',
    sounds: { reveal: 'doctor_reveal', nightAction: 'doctor_action' },
    cssVars: {
      '--theme-bg-from': '#031a0a',
      '--theme-bg-to': '#062d12',
      '--theme-glow': 'rgba(40,160,80,0.3)',
      '--theme-accent': '#55cc77',
      '--theme-border': '#1a6635',
    },
  },
  villager: {
    bgFrom: '#1a1400',
    bgTo: '#2d2200',
    glowColor: 'rgba(180,130,0,0.25)',
    accentColor: '#e8b84b',
    borderColor: '#7a5c00',
    flavourText: 'Something stalks the night. Your voice is your only weapon — use it.',
    particleColor: '#e8b84b',
    sounds: { reveal: 'villager_reveal', nightAction: 'villager_reveal' }, // villager has no night action — nightAction is never called
    cssVars: {
      '--theme-bg-from': '#1a1400',
      '--theme-bg-to': '#2d2200',
      '--theme-glow': 'rgba(180,130,0,0.25)',
      '--theme-accent': '#e8b84b',
      '--theme-border': '#7a5c00',
    },
  },
}

export const PHASE_SOUNDS: Record<string, SoundKey> = {
  NIGHT: 'night_falls',
  DAY_VOTING: 'gavel',
}

export const GAME_OVER_SOUNDS: Record<Faction, SoundKey> = {
  wolves: 'wolves_win',
  villagers: 'villagers_win',
}

export const SOUND_URLS: Record<SoundKey, string> = {
  wolf_reveal:     '/sounds/wolf-howl.mp3',
  seer_reveal:     '/sounds/seer-reveal.mp3',
  doctor_reveal:   '/sounds/doctor-reveal.mp3',
  villager_reveal: '/sounds/vilager-reveal.mp3',
  night_falls:     '/sounds/night-fall.mp3',
  wolf_action:     '/sounds/wolf-attack.mp3',
  seer_action:     '/sounds/seer-inspect.mp3',
  doctor_action:   '/sounds/doctor-save.mp3',
  dawn_bell:       '/sounds/dawn.mp3',
  death_toll:      '/sounds/death.mp3',
  gavel:           '/sounds/gavel.mp3',
  vote_thud:       '/sounds/vote-thud.mp3',
  timer_tick:      '/sounds/timer-tick.mp3',
  elimination:     '/sounds/suspense.mp3',
  wolves_win:      '/sounds/wolf-win.mp3',
  villagers_win:   '/sounds/villager-win.mp3',
}

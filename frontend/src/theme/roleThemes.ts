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
    sounds: { reveal: 'villager_reveal', nightAction: 'wolf_action' },
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
  wolf_reveal:     'https://cdn.freesound.org/previews/320/320654_230356-lq.mp3',
  seer_reveal:     'https://cdn.freesound.org/previews/411/411089_5121236-lq.mp3',
  doctor_reveal:   'https://cdn.freesound.org/previews/411/411090_5121236-lq.mp3',
  villager_reveal: 'https://cdn.freesound.org/previews/108/108615_1537981-lq.mp3',
  night_falls:     'https://cdn.freesound.org/previews/17/17712_47211-lq.mp3',
  wolf_action:     'https://cdn.freesound.org/previews/320/320655_230356-lq.mp3',
  seer_action:     'https://cdn.freesound.org/previews/411/411092_5121236-lq.mp3',
  doctor_action:   'https://cdn.freesound.org/previews/411/411091_5121236-lq.mp3',
  dawn_bell:       'https://cdn.freesound.org/previews/411/411646_5121236-lq.mp3',
  death_toll:      'https://cdn.freesound.org/previews/411/411645_5121236-lq.mp3',
  gavel:           'https://cdn.freesound.org/previews/411/411643_5121236-lq.mp3',
  vote_thud:       'https://cdn.freesound.org/previews/411/411642_5121236-lq.mp3',
  timer_tick:      'https://cdn.freesound.org/previews/411/411641_5121236-lq.mp3',
  elimination:     'https://cdn.freesound.org/previews/411/411644_5121236-lq.mp3',
  wolves_win:      'https://cdn.freesound.org/previews/320/320656_230356-lq.mp3',
  villagers_win:   'https://cdn.freesound.org/previews/411/411093_5121236-lq.mp3',
}

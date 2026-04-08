/**
 * SYNC: This file mirrors backend/src/shared/types.ts + errors.ts.
 * When the backend types change, update this file manually.
 * Key differences from backend: Map→Record, Set→string[], no server-only fields.
 */

// ── Core enums ────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAWN'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'DAY_RESULT'
  | 'GAME_OVER'

export type Role = 'werewolf' | 'seer' | 'doctor' | 'villager'
export type ChatChannel = 'day' | 'wolf' | 'ghost' | 'system'
export type ConnectionStatus = 'connected' | 'disconnected'
export type Faction = 'wolves' | 'villagers'

// ── Room types ────────────────────────────────────────────────────────────────

export interface GameSettings {
  nightDuration: number          // ms
  dayDiscussionDuration: number  // ms
  dayVotingDuration: number      // ms
}

export const DEFAULT_SETTINGS: GameSettings = {
  nightDuration: 60_000,
  dayDiscussionDuration: 120_000,
  dayVotingDuration: 30_000,
}

export interface RoomPlayer {
  playerId: string
  displayName: string
  isHost: boolean
  isReady: boolean
  connectionStatus: ConnectionStatus
  disconnectedAt: number | null
  joinedAt: number
}

// Serialized room state (Maps/Sets omitted; kickBans not exposed to client)
export interface RoomState {
  roomCode: string
  status: 'LOBBY' | 'IN_GAME' | 'GAME_OVER' | 'EXPIRED'
  hostId: string
  players: RoomPlayer[]
  spectators: RoomPlayer[]
  settings: GameSettings
  lastActivityAt: number
  createdAt: number
}

// ── Game types ────────────────────────────────────────────────────────────────

export interface PlayerInGame {
  playerId: string
  displayName: string
  isAlive: boolean
  connectionStatus: ConnectionStatus
  isAfk: boolean
  disconnectedAt: number | null
  outcome: 'survived' | 'killed_night' | 'lynched' | null
  eliminatedRound: number | null
}

export interface ChatMessage {
  messageId: string
  senderId: string | null  // null for system messages
  senderName: string
  text: string
  sentAt: number
  channel: ChatChannel
}

// Wire format of game state snapshot (Maps serialized to Records, Sets to arrays)
export interface GameSnapshot {
  roomCode: string
  phase: GamePhase
  round: number
  phaseStartedAt: number
  phaseEndsAt: number | null
  players: PlayerInGame[]
  alive: string[]                          // Set<string> → string[]
  roles: Record<string, Role>              // Map<playerId, Role> → Record
  dayVotes: Record<string, string>         // Map<voterId, targetId> → Record
  daySkipVotes: string[]                   // Set<string> → string[]
  doctorLastProtected: string | null
  seerInspectedTargets: string[]           // Set<string> → string[]
  chatLogs: {
    day: ChatMessage[]
    wolf: ChatMessage[]
    ghost: ChatMessage[]
    system: ChatMessage[]
  }
  winner: Faction | null
  startedAt: number
}

// ── Frontend-only types ───────────────────────────────────────────────────────

export type AppScreen = 'landing' | 'lobby' | 'game' | 'gameover'

export type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface SeerResult {
  targetId: string
  isWolf: boolean
}

// ── Error codes ───────────────────────────────────────────────────────────────

export const ErrorCodes = {
  INVALID_DISPLAY_NAME: 'INVALID_DISPLAY_NAME',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  SPECTATORS_FULL: 'SPECTATORS_FULL',
  ROOM_IN_PROGRESS: 'ROOM_IN_PROGRESS',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  NOT_HOST: 'NOT_HOST',
  PLAYER_KICKED: 'PLAYER_KICKED',
  PLAYER_NOT_IN_ROOM: 'PLAYER_NOT_IN_ROOM',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  GAME_STARTED: 'GAME_STARTED',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_TARGET: 'INVALID_TARGET',
  WRONG_ROLE: 'WRONG_ROLE',
  PLAYER_DEAD: 'PLAYER_DEAD',
  SELF_TARGET: 'SELF_TARGET',
  ALREADY_INSPECTED: 'ALREADY_INSPECTED',
  CONSECUTIVE_PROTECT: 'CONSECUTIVE_PROTECT',
  WOLF_TARGETING_WOLF: 'WOLF_TARGETING_WOLF',
  RATE_LIMITED: 'RATE_LIMITED',
  CHANNEL_ACCESS_DENIED: 'CHANNEL_ACCESS_DENIED',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  INVALID_SETTINGS: 'INVALID_SETTINGS',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

// ── Role display info ─────────────────────────────────────────────────────────

export const ROLE_INFO: Record<Role, { icon: string; name: string; desc: string }> = {
  werewolf: {
    icon: '🐺',
    name: 'Werewolf',
    desc: 'Each night, vote with your pack to eliminate a villager. Win when wolves equal or outnumber the village.',
  },
  seer: {
    icon: '🔮',
    name: 'Seer',
    desc: 'Each night, inspect one player to learn if they are a wolf. You cannot inspect the same player twice.',
  },
  doctor: {
    icon: '💊',
    name: 'Doctor',
    desc: 'Each night, protect one player from being killed. You cannot protect the same player two nights in a row.',
  },
  villager: {
    icon: '👤',
    name: 'Villager',
    desc: 'Use your wits during the day to identify and vote out the wolves.',
  },
}

// ── Phase display info ────────────────────────────────────────────────────────

export const PHASE_INFO: Partial<Record<GamePhase, { icon: string; label: string }>> = {
  ROLE_ASSIGNMENT: { icon: '🃏', label: 'Role Reveal' },
  NIGHT:           { icon: '🌙', label: 'Night' },
  DAWN:            { icon: '🌅', label: 'Dawn' },
  DAY_DISCUSSION:  { icon: '☀️', label: 'Day — Discussion' },
  DAY_VOTING:      { icon: '🗳️', label: 'Day — Voting' },
  DAY_RESULT:      { icon: '⚖️', label: 'Day — Result' },
  GAME_OVER:       { icon: '🏁', label: 'Game Over' },
}

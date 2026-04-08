import type { Request } from 'express'

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

export interface JwtPayload {
  playerId: string
  displayName: string
  iat: number
  exp: number
}

export interface AuthenticatedRequest extends Request {
  player: JwtPayload
}

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

export interface RoomState {
  roomCode: string
  status: 'LOBBY' | 'IN_GAME' | 'GAME_OVER' | 'EXPIRED'
  hostId: string
  players: RoomPlayer[]
  spectators: RoomPlayer[]
  settings: GameSettings
  kickBans: Map<string, number>  // playerId → bannedUntil ms timestamp
  lastActivityAt: number
  createdAt: number
}

export interface PlayerInGame {
  playerId: string
  displayName: string
  isAlive: boolean
  connectionStatus: ConnectionStatus
  isAfk: boolean
  disconnectedAt: number | null
  outcome: 'survived' | 'killed_night' | 'lynched' | null  // set on death
  eliminatedRound: number | null                             // set on death
}

export interface ChatMessage {
  messageId: string
  senderId: string | null  // null for system messages
  senderName: string
  text: string
  sentAt: number
  channel: ChatChannel
}

export interface NightActionsState {
  wolfVotes: Map<string, string>  // voterId → targetId
  seerTarget: string | null
  doctorTarget: string | null
}

export interface GameState {
  roomCode: string
  phase: GamePhase
  round: number
  players: PlayerInGame[]
  roles: Map<string, Role>
  alive: Set<string>
  phaseStartedAt: number
  phaseEndsAt: number | null
  lastActivityAt: number
  nightActions: NightActionsState
  dayVotes: Map<string, string>  // voterId → targetId
  daySkipVotes: Set<string>
  doctorLastProtected: string | null
  seerInspectedTargets: Set<string>
  chatLogs: {
    day: ChatMessage[]
    wolf: ChatMessage[]
    ghost: ChatMessage[]
    system: ChatMessage[]
  }
  winner: Faction | null
  startedAt: number
}

export interface NightResolution {
  killedPlayerId: string | null
  seerResult: { targetId: string; isWolf: boolean } | null
  doctorSaved: boolean
}

export interface VotingResolution {
  eliminatedPlayerId: string | null
  voteCounts: Record<string, number>
}

export interface WinResult {
  winner: Faction
}

export interface ValidationResult {
  valid: boolean
  errorCode?: string
}

export interface NightAction {
  type: 'wolf_vote' | 'seer_inspect' | 'doctor_protect'
  targetId: string
}

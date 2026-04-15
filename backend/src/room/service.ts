import { randomInt } from 'crypto'
import { store } from '../game/store'
import { DEFAULT_SETTINGS } from '../shared/types'
import { ErrorCodes } from '../shared/errors'
import type { RoomState, RoomPlayer, GameSettings } from '../shared/types'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_PLAYERS = 10
const MAX_SPECTATORS = 20
const KICK_BAN_DURATION_MS = 5 * 60 * 1000

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)]
  }
  return code
}

function defaultSettings(playerCount: number): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    dayDiscussionDuration: playerCount >= 6 ? 180_000 : 120_000,
  }
}

export function createRoom(hostId: string, hostDisplayName: string): string {
  let roomCode: string
  do { roomCode = generateRoomCode() } while (store.getRoom(roomCode))

  const host: RoomPlayer = {
    playerId: hostId,
    displayName: hostDisplayName,
    isHost: true,
    isReady: false,
    connectionStatus: 'connected',
    disconnectedAt: null,
    joinedAt: Date.now(),
  }

  const room: RoomState = {
    roomCode,
    status: 'LOBBY',
    hostId,
    players: [host],
    spectators: [],
    settings: defaultSettings(1),
    kickBans: new Map(),
    lastActivityAt: Date.now(),
    createdAt: Date.now(),
  }

  store.setRoom(roomCode, room)
  store.setPlayerRoom(hostId, roomCode)
  return roomCode
}

export function joinRoom(
  roomCode: string,
  playerId: string,
  displayName: string,
  asSpectator: boolean
): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.status === 'IN_GAME') return { error: ErrorCodes.ROOM_IN_PROGRESS }
  if (room.status === 'EXPIRED') return { error: ErrorCodes.ROOM_NOT_FOUND }

  const banExpiry = room.kickBans.get(playerId)
  if (banExpiry && Date.now() < banExpiry) return { error: ErrorCodes.PLAYER_KICKED }

  const allPlayers = [...room.players, ...room.spectators]
  if (allPlayers.some(p => p.playerId === playerId)) return {}  // already in room
  if (allPlayers.some(p => p.displayName === displayName)) {
    return { error: ErrorCodes.DUPLICATE_NAME }
  }

  const player: RoomPlayer = {
    playerId,
    displayName,
    isHost: false,
    isReady: false,
    connectionStatus: 'connected',
    disconnectedAt: null,
    joinedAt: Date.now(),
  }

  if (asSpectator) {
    if (room.spectators.length >= MAX_SPECTATORS) return { error: ErrorCodes.SPECTATORS_FULL }
    room.spectators.push(player)
  } else {
    if (room.players.length >= MAX_PLAYERS) return { error: ErrorCodes.ROOM_FULL }
    room.players.push(player)
    if (room.players.length === 6 && room.settings.dayDiscussionDuration === 120_000) {
      room.settings.dayDiscussionDuration = 180_000
    }
  }

  room.lastActivityAt = Date.now()
  store.setPlayerRoom(playerId, roomCode)
  return {}
}

export function leaveRoom(
  roomCode: string,
  playerId: string
): { hostChanged: boolean; newHostId: string | null } {
  const room = store.getRoom(roomCode)
  if (!room) return { hostChanged: false, newHostId: null }

  const wasHost = room.hostId === playerId
  room.players = room.players.filter(p => p.playerId !== playerId)
  room.spectators = room.spectators.filter(p => p.playerId !== playerId)
  store.removePlayerRoom(playerId)

  if (room.players.length === 0 && room.spectators.length === 0) {
    store.deleteRoom(roomCode)
    return { hostChanged: false, newHostId: null }
  }

  let hostChanged = false
  let newHostId: string | null = null
  if (wasHost && room.players.length > 0) {
    const nextHost = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0]
    nextHost.isHost = true
    room.hostId = nextHost.playerId
    room.settings = defaultSettings(room.players.length)
    hostChanged = true
    newHostId = nextHost.playerId
  }

  room.lastActivityAt = Date.now()
  return { hostChanged, newHostId }
}

export function setReady(roomCode: string, playerId: string, ready: boolean): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  const player = room.players.find(p => p.playerId === playerId)
  if (!player) return { error: ErrorCodes.PLAYER_NOT_IN_ROOM }
  player.isReady = ready
  room.lastActivityAt = Date.now()
  return {}
}

export function kickPlayer(roomCode: string, hostId: string, targetId: string): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.hostId !== hostId) return { error: ErrorCodes.NOT_HOST }
  const target = room.players.find(p => p.playerId === targetId)
  if (!target) return { error: ErrorCodes.PLAYER_NOT_IN_ROOM }

  room.players = room.players.filter(p => p.playerId !== targetId)
  room.kickBans.set(targetId, Date.now() + KICK_BAN_DURATION_MS)
  store.removePlayerRoom(targetId)
  room.lastActivityAt = Date.now()
  return {}
}

export function updateSettings(
  roomCode: string,
  hostId: string,
  settings: Partial<GameSettings>
): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.hostId !== hostId) return { error: ErrorCodes.NOT_HOST }
  if (room.status !== 'LOBBY') return { error: ErrorCodes.GAME_STARTED }

  const s = room.settings
  if (settings.nightDuration !== undefined) {
    if (settings.nightDuration < 30_000 || settings.nightDuration > 180_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.nightDuration = settings.nightDuration
  }
  if (settings.dayDiscussionDuration !== undefined) {
    if (settings.dayDiscussionDuration < 60_000 || settings.dayDiscussionDuration > 600_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.dayDiscussionDuration = settings.dayDiscussionDuration
  }
  if (settings.dayVotingDuration !== undefined) {
    if (settings.dayVotingDuration < 15_000 || settings.dayVotingDuration > 120_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.dayVotingDuration = settings.dayVotingDuration
  }
  if (settings.seerCanActRound1 !== undefined) {
    s.seerCanActRound1 = Boolean(settings.seerCanActRound1)
  }
  if (settings.wolvesCanKillRound1 !== undefined) {
    s.wolvesCanKillRound1 = Boolean(settings.wolvesCanKillRound1)
  }

  room.lastActivityAt = Date.now()
  return {}
}

/** Serialize room state for client — strips internal-only fields (kickBans). */
export function serializeRoom(room: RoomState) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostId: room.hostId,
    players: room.players,
    spectators: room.spectators,
    settings: room.settings,
  }
}

import type { Server, Socket } from 'socket.io'
import { store } from '../game/store'
import { shouldRefreshToken, refreshToken } from '../auth/service'
import { logger } from '../shared/logger'
import * as roomService from './service'
import type { GameSettings, GameState } from '../shared/types'

export function registerRoomEvents(io: Server, socket: Socket): void {
  const playerId = socket.data.playerId as string
  const displayName = socket.data.displayName as string
  const exp = socket.data.exp as number

  // ── Reconnect handling ──────────────────────────────────────────────────
  const existingRoomCode = store.getPlayerRoom(playerId)
  if (existingRoomCode) {
    socket.join(existingRoomCode)

    const room = store.getRoom(existingRoomCode)
    if (room) {
      // Update connection status in room
      const rp = [...room.players, ...room.spectators].find(p => p.playerId === playerId)
      if (rp) { rp.connectionStatus = 'connected'; rp.disconnectedAt = null }
    }

    const game = store.getGame(existingRoomCode)
    if (game !== undefined) {
      // Update connection status in game
      const gp = game.players.find(p => p.playerId === playerId)
      if (gp) { gp.connectionStatus = 'connected'; gp.disconnectedAt = null; gp.isAfk = false }
      // Send filtered state snapshot
      socket.emit('game:state_snapshot', buildGameSnapshot(game, playerId))
    } else if (room) {
      socket.emit('room:state', roomService.serializeRoom(room))
    }

    // Refresh JWT if close to expiry
    if (shouldRefreshToken(exp)) {
      socket.emit('auth:token_refreshed', { token: refreshToken(playerId, displayName) })
    }

    logger.info({ playerId, roomCode: existingRoomCode }, 'Player reconnected')
  }

  // ── room:create ─────────────────────────────────────────────────────────
  socket.on('room:create', () => {
    if (store.getPlayerRoom(playerId)) {
      socket.emit('error', { code: 'ALREADY_IN_ROOM', message: 'Already in a room' })
      return
    }
    const roomCode = roomService.createRoom(playerId, displayName)
    socket.join(roomCode)
    const room = store.getRoom(roomCode)!
    socket.emit('room:state', roomService.serializeRoom(room))
    logger.info({ playerId, roomCode }, 'Room created')
  })

  // ── room:join ────────────────────────────────────────────────────────────
  socket.on('room:join', (payload: unknown) => {
    const { roomCode, asSpectator } = (payload ?? {}) as { roomCode?: string; asSpectator?: boolean }
    if (typeof roomCode !== 'string') {
      socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'roomCode required' })
      return
    }
    const code = roomCode.toUpperCase()
    const result = roomService.joinRoom(code, playerId, displayName, asSpectator ?? false)
    if (result.error) {
      socket.emit('error', { code: result.error, message: result.error })
      return
    }
    socket.join(code)
    const room = store.getRoom(code)!
    socket.emit('room:state', roomService.serializeRoom(room))
    const joined = [...room.players, ...room.spectators].find(p => p.playerId === playerId)
    socket.to(code).emit('room:player_joined', { player: joined })
    logger.info({ playerId, roomCode: code }, 'Player joined room')
  })

  // ── room:leave ───────────────────────────────────────────────────────────
  socket.on('room:leave', () => {
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const { hostChanged, newHostId } = roomService.leaveRoom(roomCode, playerId)
    socket.leave(roomCode)
    io.to(roomCode).emit('room:player_left', { playerId })
    if (hostChanged && newHostId) {
      io.to(roomCode).emit('room:host_changed', { newHostId })
    }
    logger.info({ playerId, roomCode }, 'Player left room')
  })

  // ── room:ready ───────────────────────────────────────────────────────────
  socket.on('room:ready', (payload: unknown) => {
    const { ready } = (payload ?? {}) as { ready?: boolean }
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = roomService.setReady(roomCode, playerId, ready ?? false)
    if (result.error) { socket.emit('error', { code: result.error, message: result.error }); return }
    const room = store.getRoom(roomCode)!
    io.to(roomCode).emit('room:state', roomService.serializeRoom(room))
  })

  // ── room:kick ────────────────────────────────────────────────────────────
  socket.on('room:kick', (payload: unknown) => {
    const { playerId: targetId } = (payload ?? {}) as { playerId?: string }
    if (!targetId) return
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = roomService.kickPlayer(roomCode, playerId, targetId)
    if (result.error) { socket.emit('error', { code: result.error, message: result.error }); return }
    io.to(roomCode).emit('room:player_left', { playerId: targetId })
    io.to(`player:${targetId}`).emit('error', { code: 'PLAYER_KICKED', message: 'You were kicked' })
    logger.info({ hostId: playerId, targetId, roomCode }, 'Player kicked')
  })

  // ── room:update_settings ─────────────────────────────────────────────────
  socket.on('room:update_settings', (payload: unknown) => {
    const settings = (payload ?? {}) as Partial<GameSettings>
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = roomService.updateSettings(roomCode, playerId, settings)
    if (result.error) { socket.emit('error', { code: result.error, message: result.error }); return }
    const room = store.getRoom(roomCode)!
    io.to(roomCode).emit('room:settings_updated', { settings: room.settings })
  })

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return

    const now = Date.now()
    const room = store.getRoom(roomCode)
    if (room) {
      const rp = [...room.players, ...room.spectators].find(p => p.playerId === playerId)
      if (rp) { rp.connectionStatus = 'disconnected'; rp.disconnectedAt = now }
    }

    const game = store.getGame(roomCode)
    if (game) {
      const gp = game.players.find(p => p.playerId === playerId)
      if (gp) { gp.connectionStatus = 'disconnected'; gp.disconnectedAt = now }
    }

    logger.info({ playerId, roomCode }, 'Player disconnected')
  })
}

function buildGameSnapshot(game: GameState, playerId: string) {
  const isAlive = game.alive.has(playerId)
  const role = game.roles.get(playerId)
  const isDead = !isAlive

  // Dead players see everything; alive players see limited info
  const rolesVisible: Record<string, string> = {}
  if (isDead) {
    for (const [pid, r] of game.roles) rolesVisible[pid] = r
  } else {
    rolesVisible[playerId] = role!
    if (role === 'werewolf') {
      for (const [pid, r] of game.roles) {
        if (r === 'werewolf') rolesVisible[pid] = r
      }
    }
  }

  return {
    roomCode: game.roomCode,
    phase: game.phase,
    round: game.round,
    phaseEndsAt: game.phaseEndsAt,
    players: game.players,
    alive: [...game.alive],
    roles: rolesVisible,
    dayVotes: Object.fromEntries(game.dayVotes),
    winner: game.winner,
    chatLogs: {
      day: game.chatLogs.day,
      wolf: isDead || role === 'werewolf' ? game.chatLogs.wolf : [],
      ghost: isDead ? game.chatLogs.ghost : [],
      system: game.chatLogs.system,
    },
  }
}

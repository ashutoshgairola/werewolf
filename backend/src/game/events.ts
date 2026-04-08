import type { Server, Socket } from 'socket.io'
import { store } from './store'
import { ErrorCodes } from '../shared/errors'
import {
  startGame,
  handleNightAction,
  handleDayVote,
  handleSkipToVote,
} from './orchestrator'

export function registerGameEvents(io: Server, socket: Socket): void {
  const playerId = socket.data.playerId as string

  // ── room:start ─────────────────────────────────────────────────────────
  socket.on('room:start', () => {
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const room = store.getRoom(roomCode)
    if (!room) return
    if (room.hostId !== playerId) {
      socket.emit('error', { code: ErrorCodes.NOT_HOST, message: 'Only the host can start the game' })
      return
    }
    const result = startGame(roomCode, io)
    if (result.error) {
      socket.emit('error', { code: result.error, message: result.error })
    }
  })

  // ── night:wolf_vote ────────────────────────────────────────────────────
  socket.on('night:wolf_vote', (payload: unknown) => {
    const { targetId } = (payload ?? {}) as { targetId?: string }
    if (typeof targetId !== 'string') return
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = handleNightAction(roomCode, playerId, { type: 'wolf_vote', targetId }, io)
    if (result.error) socket.emit('error', { code: result.error, message: result.error })
  })

  // ── night:seer_inspect ─────────────────────────────────────────────────
  socket.on('night:seer_inspect', (payload: unknown) => {
    const { targetId } = (payload ?? {}) as { targetId?: string }
    if (typeof targetId !== 'string') return
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = handleNightAction(roomCode, playerId, { type: 'seer_inspect', targetId }, io)
    if (result.error) socket.emit('error', { code: result.error, message: result.error })
  })

  // ── night:doctor_protect ───────────────────────────────────────────────
  socket.on('night:doctor_protect', (payload: unknown) => {
    const { targetId } = (payload ?? {}) as { targetId?: string }
    if (typeof targetId !== 'string') return
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = handleNightAction(roomCode, playerId, { type: 'doctor_protect', targetId }, io)
    if (result.error) socket.emit('error', { code: result.error, message: result.error })
  })

  // ── day:vote ──────────────────────────────────────────────────────────
  socket.on('day:vote', (payload: unknown) => {
    const { targetId } = (payload ?? {}) as { targetId?: string | null }
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = handleDayVote(roomCode, playerId, targetId ?? null, io)
    if (result.error) socket.emit('error', { code: result.error, message: result.error })
  })

  // ── day:skip_to_vote ──────────────────────────────────────────────────
  socket.on('day:skip_to_vote', () => {
    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return
    const result = handleSkipToVote(roomCode, playerId, io)
    if (result.error) socket.emit('error', { code: result.error, message: result.error })
  })
}

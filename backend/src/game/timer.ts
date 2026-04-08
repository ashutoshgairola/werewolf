import type { Server } from 'socket.io'
import { store } from './store'
import { advancePhase, abandonGame } from './orchestrator'
import { logger } from '../shared/logger'

const TICK_INTERVAL_MS = 500
const GAME_IDLE_TIMEOUT_MS = 5 * 60 * 1000   // 5 min
const ROOM_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000  // 2 hours
const LOBBY_DISCONNECT_TIMEOUT_MS = 60_000    // 1 min

export function startTimerLoop(io: Server): void {
  setInterval(() => tick(io), TICK_INTERVAL_MS)
  logger.info('Timer loop started')
}

async function tick(io: Server): Promise<void> {
  const now = Date.now()

  // ── Active game checks ────────────────────────────────────────────────
  for (const [roomCode, game] of store.getAllGames()) {
    // Phase advance
    if (game.phaseEndsAt !== null && now >= game.phaseEndsAt) {
      await advancePhase(roomCode, io).catch(err => {
        logger.error({ err, roomCode }, 'Error advancing phase')
      })
    }

    // Idle game abandon
    if (now - game.lastActivityAt > GAME_IDLE_TIMEOUT_MS) {
      await abandonGame(roomCode, io).catch(err => {
        logger.error({ err, roomCode }, 'Error abandoning idle game')
      })
    }
  }

  // ── Lobby checks ──────────────────────────────────────────────────────
  for (const [roomCode, room] of store.getAllRooms()) {
    if (room.status !== 'LOBBY') continue

    // Remove players disconnected too long
    for (const player of [...room.players]) {
      if (
        player.connectionStatus === 'disconnected' &&
        player.disconnectedAt !== null &&
        now - player.disconnectedAt >= LOBBY_DISCONNECT_TIMEOUT_MS
      ) {
        room.players = room.players.filter(p => p.playerId !== player.playerId)
        store.removePlayerRoom(player.playerId)
        io.to(roomCode).emit('room:player_left', { playerId: player.playerId })
        logger.info({ playerId: player.playerId, roomCode }, 'Removed disconnected lobby player')

        // Check if remaining room is empty
        if (room.players.length === 0 && room.spectators.length === 0) {
          store.deleteRoom(roomCode)
          break
        }

        // Host migration if host timed out
        if (room.hostId === player.playerId && room.players.length > 0) {
          const nextHost = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0]
          nextHost.isHost = true
          room.hostId = nextHost.playerId
          io.to(roomCode).emit('room:host_changed', { newHostId: nextHost.playerId })
        }
      }
    }

    // Expire idle empty rooms
    if (
      room.players.length === 0 &&
      room.spectators.length === 0 &&
      now - room.lastActivityAt > ROOM_IDLE_TIMEOUT_MS
    ) {
      store.deleteRoom(roomCode)
    }
  }
}

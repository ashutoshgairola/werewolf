import type { Server, Socket } from 'socket.io'
import { store } from '../game/store'
import { ErrorCodes } from '../shared/errors'
import { checkRateLimit, validateChatAccess, buildChatMessage } from './service'
import type { ChatChannel } from '../shared/types'

const VALID_CHANNELS = new Set<ChatChannel>(['day', 'wolf', 'ghost'])

export function registerChatEvents(io: Server, socket: Socket): void {
  const playerId = socket.data.playerId as string
  const displayName = socket.data.displayName as string

  socket.on('chat:message', (payload: unknown) => {
    const { channel, text } = (payload ?? {}) as { channel?: string; text?: string }

    if (typeof text !== 'string' || typeof channel !== 'string') {
      socket.emit('error', { code: ErrorCodes.EMPTY_MESSAGE, message: 'channel and text required' })
      return
    }

    if (!VALID_CHANNELS.has(channel as ChatChannel)) {
      socket.emit('error', { code: ErrorCodes.CHANNEL_ACCESS_DENIED, message: 'Invalid channel' })
      return
    }

    const roomCode = store.getPlayerRoom(playerId)
    if (!roomCode) return

    const game = store.getGame(roomCode)
    if (!game) return

    // Validate channel access
    const access = validateChatAccess(game, playerId, channel as ChatChannel)
    if (access.error) {
      socket.emit('error', { code: access.error, message: access.error })
      return
    }

    // Rate limit check
    const rateCheck = checkRateLimit(playerId, channel as ChatChannel)
    if (rateCheck.limited) {
      socket.emit('chat:rate_limited', { channel, retryAfter: rateCheck.retryAfter })
      return
    }

    // Build and validate message content
    const { message, error } = buildChatMessage(playerId, displayName, text, channel as ChatChannel)
    if (error || !message) {
      socket.emit('error', { code: error, message: error })
      return
    }

    // Persist to in-memory chat log
    game.chatLogs[channel as ChatChannel].push(message)
    game.lastActivityAt = Date.now()

    // Broadcast to appropriate audience
    if (channel === 'wolf') {
      // Only living wolves
      for (const [pid, role] of game.roles) {
        if (role === 'werewolf' && game.alive.has(pid)) {
          io.to(`player:${pid}`).emit('chat:message', { channel, message })
        }
      }
    } else if (channel === 'ghost') {
      // Only dead players
      for (const p of game.players) {
        if (!p.isAlive) {
          io.to(`player:${p.playerId}`).emit('chat:message', { channel, message })
        }
      }
    } else {
      // day: living players + spectators (broadcast to whole room)
      io.to(roomCode).emit('chat:message', { channel, message })
    }
  })
}

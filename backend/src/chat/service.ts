import { v4 as uuidv4 } from 'uuid'
import { ErrorCodes } from '../shared/errors'
import type { ChatMessage, ChatChannel, GameState } from '../shared/types'

const MAX_MESSAGE_LENGTH = 500
const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 3000

// playerId:channel → array of sent timestamps (sliding window)
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(
  playerId: string,
  channel: ChatChannel
): { limited: boolean; retryAfter?: number } {
  const key = `${playerId}:${channel}`
  const now = Date.now()
  const timestamps = (rateLimitMap.get(key) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT_COUNT) {
    const retryAfter = Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { limited: true, retryAfter }
  }
  timestamps.push(now)
  rateLimitMap.set(key, timestamps)
  return { limited: false }
}

/** Strip HTML/script tags and trim. */
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

export function validateChatAccess(
  game: GameState,
  playerId: string,
  channel: ChatChannel
): { error?: string } {
  const isAlive = game.alive.has(playerId)
  const role = game.roles.get(playerId)

  switch (channel) {
    case 'day':
      if (!isAlive) return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }
      break
    case 'wolf':
      if (!isAlive || role !== 'werewolf') return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }
      if (game.phase !== 'NIGHT') return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }
      break
    case 'ghost':
      if (isAlive) return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }
      break
    case 'system':
      return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }
  }

  return {}
}

export function buildChatMessage(
  senderId: string,
  senderName: string,
  text: string,
  channel: ChatChannel
): { message?: ChatMessage; error?: string } {
  const clean = sanitize(text)
  if (!clean) return { error: ErrorCodes.EMPTY_MESSAGE }
  if (clean.length > MAX_MESSAGE_LENGTH) return { error: ErrorCodes.MESSAGE_TOO_LONG }

  return {
    message: {
      messageId: uuidv4(),
      senderId,
      senderName,
      text: clean,
      sentAt: Date.now(),
      channel,
    },
  }
}

export function buildSystemMessage(text: string, channel: ChatChannel = 'system'): ChatMessage {
  return {
    messageId: uuidv4(),
    senderId: null,
    senderName: 'System',
    text,
    sentAt: Date.now(),
    channel,
  }
}

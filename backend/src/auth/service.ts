import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import type { JwtPayload } from '../shared/types'

function secret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET env var not set')
  return s
}

const JWT_TTL = '24h'
const REFRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000  // 6 hours

export function createGuestToken(displayName: string): { token: string; playerId: string } {
  const playerId = uuidv4()
  const token = jwt.sign({ playerId, displayName }, secret(), { expiresIn: JWT_TTL })
  return { token, playerId }
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret()) as JwtPayload
}

export function shouldRefreshToken(exp: number): boolean {
  return (exp * 1000 - Date.now()) < REFRESH_THRESHOLD_MS
}

export function refreshToken(playerId: string, displayName: string): string {
  return jwt.sign({ playerId, displayName }, secret(), { expiresIn: JWT_TTL })
}

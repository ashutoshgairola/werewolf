import type { Request, Response, NextFunction } from 'express'
import type { Socket } from 'socket.io'
import { verifyToken } from '../auth/service'
import { ErrorCodes } from './errors'
import type { AuthenticatedRequest } from './types'

export function restAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: ErrorCodes.UNAUTHORIZED })
    return
  }
  try {
    const payload = verifyToken(header.slice(7))
    ;(req as AuthenticatedRequest).player = payload
    next()
  } catch {
    res.status(401).json({ error: ErrorCodes.TOKEN_EXPIRED })
  }
}

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) {
    next(new Error(ErrorCodes.UNAUTHORIZED))
    return
  }
  try {
    const payload = verifyToken(token)
    socket.data.playerId = payload.playerId
    socket.data.displayName = payload.displayName
    socket.data.exp = payload.exp
    next()
  } catch {
    next(new Error(ErrorCodes.TOKEN_EXPIRED))
  }
}

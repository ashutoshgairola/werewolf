import { Router } from 'express'
import { restAuthMiddleware } from '../shared/middleware'
import { createRoom } from './service'
import { store } from '../game/store'
import { ErrorCodes } from '../shared/errors'
import type { AuthenticatedRequest } from '../shared/types'

export const roomRouter = Router()

roomRouter.post('/', restAuthMiddleware, (req, res) => {
  const { playerId, displayName } = (req as AuthenticatedRequest).player
  if (store.getPlayerRoom(playerId)) {
    res.status(400).json({ error: ErrorCodes.ALREADY_IN_ROOM })
    return
  }
  const roomCode = createRoom(playerId, displayName)
  res.json({ roomCode })
})

roomRouter.get('/:code', restAuthMiddleware, (req, res) => {
  const room = store.getRoom(req.params.code.toUpperCase())
  if (!room) {
    res.json({ exists: false, phase: null, playerCount: 0, canJoin: false })
    return
  }
  res.json({
    exists: true,
    phase: room.status,
    playerCount: room.players.length,
    canJoin: room.status === 'LOBBY' && room.players.length < 10,
  })
})

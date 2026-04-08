import { Router } from 'express'
import { createGuestToken } from './service'
import { ErrorCodes } from '../shared/errors'

const DISPLAY_NAME_RE = /^[a-zA-Z0-9 ]{3,20}$/

export const authRouter = Router()

authRouter.post('/guest', (req, res) => {
  const { displayName } = req.body as { displayName?: unknown }
  if (typeof displayName !== 'string' || !DISPLAY_NAME_RE.test(displayName.trim())) {
    res.status(400).json({ error: ErrorCodes.INVALID_DISPLAY_NAME })
    return
  }
  const { token, playerId } = createGuestToken(displayName.trim())
  res.json({ token, playerId })
})

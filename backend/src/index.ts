import 'dotenv/config'
import http from 'http'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { Server } from 'socket.io'
import { register, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client'
import { authRouter } from './auth/routes'
import { roomRouter } from './room/routes'
import { registerRoomEvents } from './room/events'
import { registerGameEvents } from './game/events'
import { registerChatEvents } from './chat/events'
import { socketAuthMiddleware } from './shared/middleware'
import { startTimerLoop } from './game/timer'
import { store } from './game/store'
import { logger } from './shared/logger'

// ── Prometheus metrics ────────────────────────────────────────────────────────
collectDefaultMetrics()

const activeRoomsGauge = new Gauge({ name: 'werewolf_active_rooms_total', help: 'Active rooms' })
const activeGamesGauge = new Gauge({ name: 'werewolf_active_games_total', help: 'Active games' })
const connectedPlayersGauge = new Gauge({ name: 'werewolf_connected_players_total', help: 'Connected players' })
const disconnectCounter = new Counter({ name: 'werewolf_disconnect_total', help: 'Total disconnects' })
const gameDurationHistogram = new Histogram({
  name: 'werewolf_game_duration_seconds',
  help: 'Game duration in seconds',
  buckets: [30, 60, 120, 300, 600, 1200],
})

// ── Express app ───────────────────────────────────────────────────────────────
const app = express()

app.use(express.json())
app.use(rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/metrics',
}))

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), activeGames: store.getAllGames().size })
})

// Metrics
app.get('/metrics', async (_req, res) => {
  // Refresh gauges
  activeRoomsGauge.set(store.getAllRooms().size)
  activeGamesGauge.set(store.getAllGames().size)

  let connected = 0
  for (const room of store.getAllRooms().values()) {
    connected += [...room.players, ...room.spectators].filter(p => p.connectionStatus === 'connected').length
  }
  connectedPlayersGauge.set(connected)

  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

// REST routers
app.use('/auth', authRouter)
app.use('/rooms', roomRouter)

// ── HTTP + Socket.IO ──────────────────────────────────────────────────────────
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

io.use(socketAuthMiddleware)

io.on('connection', (socket) => {
  const playerId = socket.data.playerId as string
  logger.info({ playerId, socketId: socket.id }, 'Socket connected')

  // Join personal room for private messages
  socket.join(`player:${playerId}`)

  registerRoomEvents(io, socket)
  registerGameEvents(io, socket)
  registerChatEvents(io, socket)

  socket.on('disconnect', () => {
    disconnectCounter.inc()
    logger.info({ playerId, socketId: socket.id }, 'Socket disconnected')
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000)
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Werewolf backend listening')
  startTimerLoop(io)
})

export { io, gameDurationHistogram }

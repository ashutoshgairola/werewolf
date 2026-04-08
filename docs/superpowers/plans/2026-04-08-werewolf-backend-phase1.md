# Werewolf Backend — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Werewolf Phase 1 backend — Express + Socket.IO server with in-memory game state, pure game engine, PostgreSQL logging, and full WebSocket/REST API.

**Architecture:** Feature-sliced under `backend/src/` (auth, room, game, chat, db, shared). Pure game engine in `game/engine/` has no I/O. `game/orchestrator.ts` is the sole coordinator of engine, store, and socket emissions. All game state is in-memory; PostgreSQL writes only on game over in a single transaction.

**Tech Stack:** Node.js 20+, TypeScript 5, Express 4, Socket.IO 4, jsonwebtoken, pg (raw SQL), pino, express-rate-limit, prom-client, uuid, tsx (dev runner), dotenv

---

## File Map

```
backend/
├── src/
│   ├── auth/
│   │   ├── routes.ts          REST: POST /auth/guest
│   │   └── service.ts         JWT sign/verify/refresh
│   ├── room/
│   │   ├── events.ts          Socket: room:* handlers + disconnect + reconnect
│   │   ├── routes.ts          REST: POST /rooms, GET /rooms/:code
│   │   └── service.ts         Room lifecycle, host migration, kick bans, settings
│   ├── game/
│   │   ├── engine/
│   │   │   ├── day.ts         resolveVoting (pure)
│   │   │   ├── night.ts       resolveNight, validateNightAction (pure)
│   │   │   ├── roles.ts       assignRoles (pure)
│   │   │   └── win.ts         checkWin (pure)
│   │   ├── events.ts          Socket: night:* and day:* action handlers
│   │   ├── orchestrator.ts    startGame, advancePhase, endGame, abandonGame
│   │   ├── store.ts           In-memory GameStore singleton
│   │   └── timer.ts           500ms tick loop
│   ├── chat/
│   │   ├── events.ts          Socket: chat:message handler
│   │   └── service.ts         Rate limiting, channel access rules, sanitization
│   ├── db/
│   │   ├── client.ts          pg Pool
│   │   └── queries.ts         writeGameResult (game_logs, game_players, game_chat_logs)
│   ├── shared/
│   │   ├── errors.ts          ErrorCodes const + ErrorCode type
│   │   ├── logger.ts          Pino logger singleton
│   │   ├── middleware.ts      JWT middleware for REST + socket
│   │   └── types.ts           All TypeScript interfaces and types
│   └── index.ts               Express + Socket.IO bootstrap + timer start
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env.example`
- Create: `backend/src/index.ts` (skeleton)

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "werewolf-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.3.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0",
    "pino": "^9.3.2",
    "prom-client": "^15.1.3",
    "socket.io": "^4.7.5",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.11",
    "@types/pg": "^8.11.6",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `backend/.env.example`**

```
PORT=3000
JWT_SECRET=change_me_in_production
DATABASE_URL=postgres://postgres:postgres@localhost:5432/werewolf
LOG_LEVEL=info
NODE_ENV=development
```

- [ ] **Step 4: Create `backend/src/index.ts` (skeleton — replaced in Task 19)**

```ts
import 'dotenv/config'

const PORT = process.env.PORT ?? 3000
console.log(`Starting Werewolf backend on port ${PORT}`)
```

- [ ] **Step 5: Install dependencies**

```bash
cd backend && pnpm install
```

Expected: lock file created, `node_modules` populated.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd backend && git add package.json tsconfig.json .env.example src/index.ts pnpm-lock.yaml
git commit -m "feat: scaffold backend project (express, socket.io, ts)"
```

---

## Task 2: Shared Types

**Files:**
- Create: `backend/src/shared/types.ts`

- [ ] **Step 1: Create `backend/src/shared/types.ts`**

```ts
import type { Request } from 'express'

export type GamePhase =
  | 'LOBBY'
  | 'ROLE_ASSIGNMENT'
  | 'NIGHT'
  | 'DAWN'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTING'
  | 'DAY_RESULT'
  | 'GAME_OVER'

export type Role = 'werewolf' | 'seer' | 'doctor' | 'villager'
export type ChatChannel = 'day' | 'wolf' | 'ghost' | 'system'
export type ConnectionStatus = 'connected' | 'disconnected'
export type Faction = 'wolves' | 'villagers'

export interface JwtPayload {
  playerId: string
  displayName: string
  iat: number
  exp: number
}

export interface AuthenticatedRequest extends Request {
  player: JwtPayload
}

export interface GameSettings {
  nightDuration: number          // ms
  dayDiscussionDuration: number  // ms
  dayVotingDuration: number      // ms
}

export const DEFAULT_SETTINGS: GameSettings = {
  nightDuration: 60_000,
  dayDiscussionDuration: 120_000,
  dayVotingDuration: 30_000,
}

export interface RoomPlayer {
  playerId: string
  displayName: string
  isHost: boolean
  isReady: boolean
  connectionStatus: ConnectionStatus
  disconnectedAt: number | null
  joinedAt: number
}

export interface RoomState {
  roomCode: string
  status: 'LOBBY' | 'IN_GAME' | 'GAME_OVER' | 'EXPIRED'
  hostId: string
  players: RoomPlayer[]
  spectators: RoomPlayer[]
  settings: GameSettings
  kickBans: Map<string, number>  // playerId → bannedUntil ms timestamp
  lastActivityAt: number
  createdAt: number
}

export interface PlayerInGame {
  playerId: string
  displayName: string
  isAlive: boolean
  connectionStatus: ConnectionStatus
  isAfk: boolean
  disconnectedAt: number | null
  outcome: 'survived' | 'killed_night' | 'lynched' | null  // set on death
  eliminatedRound: number | null                             // set on death
}

export interface ChatMessage {
  messageId: string
  senderId: string | null  // null for system messages
  senderName: string
  text: string
  sentAt: number
  channel: ChatChannel
}

export interface NightActionsState {
  wolfVotes: Map<string, string>  // voterId → targetId
  seerTarget: string | null
  doctorTarget: string | null
}

export interface GameState {
  roomCode: string
  phase: GamePhase
  round: number
  players: PlayerInGame[]
  roles: Map<string, Role>
  alive: Set<string>
  phaseStartedAt: number
  phaseEndsAt: number | null
  lastActivityAt: number
  nightActions: NightActionsState
  dayVotes: Map<string, string>  // voterId → targetId
  daySkipVotes: Set<string>
  doctorLastProtected: string | null
  seerInspectedTargets: Set<string>
  chatLogs: {
    day: ChatMessage[]
    wolf: ChatMessage[]
    ghost: ChatMessage[]
    system: ChatMessage[]
  }
  winner: Faction | null
  startedAt: number
}

export interface NightResolution {
  killedPlayerId: string | null
  seerResult: { targetId: string; isWolf: boolean } | null
  doctorSaved: boolean
}

export interface VotingResolution {
  eliminatedPlayerId: string | null
  voteCounts: Record<string, number>
}

export interface WinResult {
  winner: Faction
}

export interface ValidationResult {
  valid: boolean
  errorCode?: string
}

export interface NightAction {
  type: 'wolf_vote' | 'seer_inspect' | 'doctor_protect'
  targetId: string
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Error Codes + Logger

**Files:**
- Create: `backend/src/shared/errors.ts`
- Create: `backend/src/shared/logger.ts`

- [ ] **Step 1: Create `backend/src/shared/errors.ts`**

```ts
export const ErrorCodes = {
  // Auth
  INVALID_DISPLAY_NAME: 'INVALID_DISPLAY_NAME',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Room
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  SPECTATORS_FULL: 'SPECTATORS_FULL',
  ROOM_IN_PROGRESS: 'ROOM_IN_PROGRESS',
  NOT_ENOUGH_PLAYERS: 'NOT_ENOUGH_PLAYERS',
  NOT_HOST: 'NOT_HOST',
  PLAYER_KICKED: 'PLAYER_KICKED',
  PLAYER_NOT_IN_ROOM: 'PLAYER_NOT_IN_ROOM',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  GAME_STARTED: 'GAME_STARTED',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',

  // Game actions
  INVALID_PHASE: 'INVALID_PHASE',
  INVALID_TARGET: 'INVALID_TARGET',
  WRONG_ROLE: 'WRONG_ROLE',
  PLAYER_DEAD: 'PLAYER_DEAD',
  SELF_TARGET: 'SELF_TARGET',
  ALREADY_INSPECTED: 'ALREADY_INSPECTED',
  CONSECUTIVE_PROTECT: 'CONSECUTIVE_PROTECT',
  WOLF_TARGETING_WOLF: 'WOLF_TARGETING_WOLF',

  // Chat
  RATE_LIMITED: 'RATE_LIMITED',
  CHANNEL_ACCESS_DENIED: 'CHANNEL_ACCESS_DENIED',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  EMPTY_MESSAGE: 'EMPTY_MESSAGE',

  // Settings
  INVALID_SETTINGS: 'INVALID_SETTINGS',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```

- [ ] **Step 2: Create `backend/src/shared/logger.ts`**

```ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})
```

- [ ] **Step 3: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/errors.ts src/shared/logger.ts
git commit -m "feat: add error codes and pino logger"
```

---

## Task 4: Database Client

**Files:**
- Create: `backend/src/db/client.ts`

- [ ] **Step 1: Create `backend/src/db/client.ts`**

```ts
import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: add pg pool client"
```

---

## Task 5: Auth Service + JWT Middleware

**Files:**
- Create: `backend/src/auth/service.ts`
- Create: `backend/src/shared/middleware.ts`

- [ ] **Step 1: Create `backend/src/auth/service.ts`**

```ts
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
```

- [ ] **Step 2: Create `backend/src/shared/middleware.ts`**

```ts
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
```

- [ ] **Step 3: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/auth/service.ts src/shared/middleware.ts
git commit -m "feat: add auth service and JWT middleware"
```

---

## Task 6: Auth REST Routes

**Files:**
- Create: `backend/src/auth/routes.ts`

- [ ] **Step 1: Create `backend/src/auth/routes.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth/routes.ts
git commit -m "feat: add POST /auth/guest route"
```

---

## Task 7: In-Memory Game Store

**Files:**
- Create: `backend/src/game/store.ts`

- [ ] **Step 1: Create `backend/src/game/store.ts`**

```ts
import type { GameState, RoomState } from '../shared/types'

class GameStore {
  private games = new Map<string, GameState>()
  private rooms = new Map<string, RoomState>()
  private playerRoomIndex = new Map<string, string>()  // playerId → roomCode

  // ── Rooms ─────────────────────────────────────────────────────────────────

  setRoom(roomCode: string, room: RoomState): void {
    this.rooms.set(roomCode, room)
  }

  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode)
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode)
    if (room) {
      for (const p of [...room.players, ...room.spectators]) {
        this.playerRoomIndex.delete(p.playerId)
      }
    }
    this.rooms.delete(roomCode)
  }

  getAllRooms(): Map<string, RoomState> {
    return this.rooms
  }

  // ── Games ─────────────────────────────────────────────────────────────────

  setGame(roomCode: string, game: GameState): void {
    this.games.set(roomCode, game)
  }

  getGame(roomCode: string): GameState | undefined {
    return this.games.get(roomCode)
  }

  deleteGame(roomCode: string): void {
    this.games.delete(roomCode)
  }

  getAllGames(): Map<string, GameState> {
    return this.games
  }

  // ── Player index ──────────────────────────────────────────────────────────

  setPlayerRoom(playerId: string, roomCode: string): void {
    this.playerRoomIndex.set(playerId, roomCode)
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRoomIndex.get(playerId)
  }

  removePlayerRoom(playerId: string): void {
    this.playerRoomIndex.delete(playerId)
  }
}

export const store = new GameStore()
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/store.ts
git commit -m "feat: add in-memory GameStore singleton"
```

---

## Task 8: Game Engine — Roles

**Files:**
- Create: `backend/src/game/engine/roles.ts`

- [ ] **Step 1: Create `backend/src/game/engine/roles.ts`**

```ts
import type { Role } from '../../shared/types'

interface RoleDistribution {
  wolves: number
  seer: number
  doctor: number
}

const DISTRIBUTION: Record<number, RoleDistribution> = {
  4:  { wolves: 1, seer: 1, doctor: 0 },
  5:  { wolves: 1, seer: 1, doctor: 1 },
  6:  { wolves: 2, seer: 1, doctor: 1 },
  7:  { wolves: 2, seer: 1, doctor: 1 },
  8:  { wolves: 2, seer: 1, doctor: 1 },
  9:  { wolves: 3, seer: 1, doctor: 1 },
  10: { wolves: 3, seer: 1, doctor: 1 },
}

/**
 * Assigns roles to players using the PRD distribution table.
 * @param randFn Injected randomizer: randFn(n) returns an integer in [0, n)
 */
export function assignRoles(
  playerIds: string[],
  randFn: (max: number) => number
): Map<string, Role> {
  const n = playerIds.length
  const dist = DISTRIBUTION[n]
  if (!dist) throw new Error(`Unsupported player count: ${n}`)

  const villagerCount = n - dist.wolves - dist.seer - dist.doctor
  const roles: Role[] = [
    ...Array<Role>(dist.wolves).fill('werewolf'),
    ...Array<Role>(dist.seer).fill('seer'),
    ...Array<Role>(dist.doctor).fill('doctor'),
    ...Array<Role>(villagerCount).fill('villager'),
  ]

  // Fisher-Yates shuffle with injected RNG
  for (let i = roles.length - 1; i > 0; i--) {
    const j = randFn(i + 1)
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }

  const assignment = new Map<string, Role>()
  for (let i = 0; i < playerIds.length; i++) {
    assignment.set(playerIds[i], roles[i])
  }
  return assignment
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/engine/roles.ts
git commit -m "feat: add pure assignRoles engine function"
```

---

## Task 9: Game Engine — Night

**Files:**
- Create: `backend/src/game/engine/night.ts`

- [ ] **Step 1: Create `backend/src/game/engine/night.ts`**

```ts
import type {
  GameState,
  NightActionsState,
  NightAction,
  NightResolution,
  ValidationResult,
} from '../../shared/types'
import { ErrorCodes } from '../../shared/errors'

export function validateNightAction(
  state: GameState,
  playerId: string,
  action: NightAction
): ValidationResult {
  if (state.phase !== 'NIGHT') {
    return { valid: false, errorCode: ErrorCodes.INVALID_PHASE }
  }
  if (!state.alive.has(playerId)) {
    return { valid: false, errorCode: ErrorCodes.PLAYER_DEAD }
  }

  const role = state.roles.get(playerId)
  const { targetId } = action

  if (!state.alive.has(targetId)) {
    return { valid: false, errorCode: ErrorCodes.INVALID_TARGET }
  }

  switch (action.type) {
    case 'wolf_vote': {
      if (role !== 'werewolf') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (state.roles.get(targetId) === 'werewolf') {
        return { valid: false, errorCode: ErrorCodes.WOLF_TARGETING_WOLF }
      }
      break
    }
    case 'seer_inspect': {
      if (role !== 'seer') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (targetId === playerId) return { valid: false, errorCode: ErrorCodes.SELF_TARGET }
      if (state.seerInspectedTargets.has(targetId)) {
        return { valid: false, errorCode: ErrorCodes.ALREADY_INSPECTED }
      }
      break
    }
    case 'doctor_protect': {
      if (role !== 'doctor') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (state.doctorLastProtected === targetId) {
        return { valid: false, errorCode: ErrorCodes.CONSECUTIVE_PROTECT }
      }
      break
    }
  }

  return { valid: true }
}

/**
 * Resolves all night actions in order: doctor protect → wolf vote → kill → seer inspect.
 * Night 1 (round === 1) is peaceful: wolves cannot kill.
 * @param randFn Injected randomizer for wolf vote tie-breaking
 */
export function resolveNight(
  state: GameState,
  actions: NightActionsState,
  randFn: (max: number) => number
): NightResolution {
  const doctorProtect = actions.doctorTarget

  // Night 1 is peaceful — no wolf kill
  let killTarget: string | null = null
  if (state.round > 1) {
    killTarget = talliedWolfTarget(actions.wolfVotes, randFn)
  }

  // Resolve kill vs protection
  const killedPlayerId =
    killTarget !== null && killTarget !== doctorProtect ? killTarget : null

  // Seer result
  let seerResult: NightResolution['seerResult'] = null
  if (actions.seerTarget !== null) {
    seerResult = {
      targetId: actions.seerTarget,
      isWolf: state.roles.get(actions.seerTarget) === 'werewolf',
    }
  }

  return {
    killedPlayerId,
    seerResult,
    doctorSaved: killTarget !== null && killTarget === doctorProtect,
  }
}

function talliedWolfTarget(
  wolfVotes: Map<string, string>,
  randFn: (max: number) => number
): string | null {
  if (wolfVotes.size === 0) return null

  const tally = new Map<string, number>()
  for (const targetId of wolfVotes.values()) {
    tally.set(targetId, (tally.get(targetId) ?? 0) + 1)
  }

  const maxVotes = Math.max(...tally.values())
  const topTargets = [...tally.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  return topTargets[randFn(topTargets.length)]
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/engine/night.ts
git commit -m "feat: add pure resolveNight and validateNightAction engine functions"
```

---

## Task 10: Game Engine — Day + Win

**Files:**
- Create: `backend/src/game/engine/day.ts`
- Create: `backend/src/game/engine/win.ts`

- [ ] **Step 1: Create `backend/src/game/engine/day.ts`**

```ts
import type { GameState, VotingResolution } from '../../shared/types'

/**
 * Resolves day votes.
 * Majority of votes cast wins. Tie or all-abstain → no elimination.
 */
export function resolveVoting(
  _state: GameState,
  votes: Map<string, string>
): VotingResolution {
  if (votes.size === 0) {
    return { eliminatedPlayerId: null, voteCounts: {} }
  }

  const tally: Record<string, number> = {}
  for (const targetId of votes.values()) {
    tally[targetId] = (tally[targetId] ?? 0) + 1
  }

  const maxVotes = Math.max(...Object.values(tally))
  const topTargets = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  // Tie → no elimination
  const eliminatedPlayerId = topTargets.length === 1 ? topTargets[0] : null

  return { eliminatedPlayerId, voteCounts: tally }
}
```

- [ ] **Step 2: Create `backend/src/game/engine/win.ts`**

```ts
import type { GameState, WinResult } from '../../shared/types'

/**
 * Checks win conditions against alive players.
 * Wolves win: wolfCount >= nonWolfCount (parity rule).
 * Villagers win: wolfCount === 0.
 */
export function checkWin(state: GameState): WinResult | null {
  let wolfCount = 0
  let nonWolfCount = 0

  for (const playerId of state.alive) {
    if (state.roles.get(playerId) === 'werewolf') {
      wolfCount++
    } else {
      nonWolfCount++
    }
  }

  if (wolfCount === 0) return { winner: 'villagers' }
  if (wolfCount >= nonWolfCount) return { winner: 'wolves' }
  return null
}
```

- [ ] **Step 3: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/game/engine/day.ts src/game/engine/win.ts
git commit -m "feat: add pure resolveVoting and checkWin engine functions"
```

---

## Task 11: Room Service

**Files:**
- Create: `backend/src/room/service.ts`

- [ ] **Step 1: Create `backend/src/room/service.ts`**

```ts
import { randomInt } from 'crypto'
import { store } from '../game/store'
import { DEFAULT_SETTINGS } from '../shared/types'
import { ErrorCodes } from '../shared/errors'
import type { RoomState, RoomPlayer, GameSettings } from '../shared/types'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MAX_PLAYERS = 10
const MAX_SPECTATORS = 20
const KICK_BAN_DURATION_MS = 5 * 60 * 1000

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)]
  }
  return code
}

function defaultSettings(playerCount: number): GameSettings {
  return {
    ...DEFAULT_SETTINGS,
    dayDiscussionDuration: playerCount >= 6 ? 180_000 : 120_000,
  }
}

export function createRoom(hostId: string, hostDisplayName: string): string {
  let roomCode: string
  do { roomCode = generateRoomCode() } while (store.getRoom(roomCode))

  const host: RoomPlayer = {
    playerId: hostId,
    displayName: hostDisplayName,
    isHost: true,
    isReady: false,
    connectionStatus: 'connected',
    disconnectedAt: null,
    joinedAt: Date.now(),
  }

  const room: RoomState = {
    roomCode,
    status: 'LOBBY',
    hostId,
    players: [host],
    spectators: [],
    settings: defaultSettings(1),
    kickBans: new Map(),
    lastActivityAt: Date.now(),
    createdAt: Date.now(),
  }

  store.setRoom(roomCode, room)
  store.setPlayerRoom(hostId, roomCode)
  return roomCode
}

export function joinRoom(
  roomCode: string,
  playerId: string,
  displayName: string,
  asSpectator: boolean
): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.status === 'IN_GAME') return { error: ErrorCodes.ROOM_IN_PROGRESS }
  if (room.status === 'EXPIRED') return { error: ErrorCodes.ROOM_NOT_FOUND }

  const banExpiry = room.kickBans.get(playerId)
  if (banExpiry && Date.now() < banExpiry) return { error: ErrorCodes.PLAYER_KICKED }

  const allPlayers = [...room.players, ...room.spectators]
  if (allPlayers.some(p => p.playerId === playerId)) return {}  // already in room
  if (allPlayers.some(p => p.displayName === displayName)) {
    return { error: ErrorCodes.DUPLICATE_NAME }
  }

  const player: RoomPlayer = {
    playerId,
    displayName,
    isHost: false,
    isReady: false,
    connectionStatus: 'connected',
    disconnectedAt: null,
    joinedAt: Date.now(),
  }

  if (asSpectator) {
    if (room.spectators.length >= MAX_SPECTATORS) return { error: ErrorCodes.SPECTATORS_FULL }
    room.spectators.push(player)
  } else {
    if (room.players.length >= MAX_PLAYERS) return { error: ErrorCodes.ROOM_FULL }
    room.players.push(player)
    if (room.players.length === 6 && room.settings.dayDiscussionDuration === 120_000) {
      room.settings.dayDiscussionDuration = 180_000
    }
  }

  room.lastActivityAt = Date.now()
  store.setPlayerRoom(playerId, roomCode)
  return {}
}

export function leaveRoom(
  roomCode: string,
  playerId: string
): { hostChanged: boolean; newHostId: string | null } {
  const room = store.getRoom(roomCode)
  if (!room) return { hostChanged: false, newHostId: null }

  const wasHost = room.hostId === playerId
  room.players = room.players.filter(p => p.playerId !== playerId)
  room.spectators = room.spectators.filter(p => p.playerId !== playerId)
  store.removePlayerRoom(playerId)

  if (room.players.length === 0 && room.spectators.length === 0) {
    store.deleteRoom(roomCode)
    return { hostChanged: false, newHostId: null }
  }

  let hostChanged = false
  let newHostId: string | null = null
  if (wasHost && room.players.length > 0) {
    const nextHost = [...room.players].sort((a, b) => a.joinedAt - b.joinedAt)[0]
    nextHost.isHost = true
    room.hostId = nextHost.playerId
    room.settings = defaultSettings(room.players.length)
    hostChanged = true
    newHostId = nextHost.playerId
  }

  room.lastActivityAt = Date.now()
  return { hostChanged, newHostId }
}

export function setReady(roomCode: string, playerId: string, ready: boolean): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  const player = room.players.find(p => p.playerId === playerId)
  if (!player) return { error: ErrorCodes.PLAYER_NOT_IN_ROOM }
  player.isReady = ready
  room.lastActivityAt = Date.now()
  return {}
}

export function kickPlayer(roomCode: string, hostId: string, targetId: string): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.hostId !== hostId) return { error: ErrorCodes.NOT_HOST }
  const target = room.players.find(p => p.playerId === targetId)
  if (!target) return { error: ErrorCodes.PLAYER_NOT_IN_ROOM }

  room.players = room.players.filter(p => p.playerId !== targetId)
  room.kickBans.set(targetId, Date.now() + KICK_BAN_DURATION_MS)
  store.removePlayerRoom(targetId)
  room.lastActivityAt = Date.now()
  return {}
}

export function updateSettings(
  roomCode: string,
  hostId: string,
  settings: Partial<GameSettings>
): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.hostId !== hostId) return { error: ErrorCodes.NOT_HOST }
  if (room.status !== 'LOBBY') return { error: ErrorCodes.GAME_STARTED }

  const s = room.settings
  if (settings.nightDuration !== undefined) {
    if (settings.nightDuration < 30_000 || settings.nightDuration > 180_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.nightDuration = settings.nightDuration
  }
  if (settings.dayDiscussionDuration !== undefined) {
    if (settings.dayDiscussionDuration < 60_000 || settings.dayDiscussionDuration > 600_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.dayDiscussionDuration = settings.dayDiscussionDuration
  }
  if (settings.dayVotingDuration !== undefined) {
    if (settings.dayVotingDuration < 15_000 || settings.dayVotingDuration > 120_000) {
      return { error: ErrorCodes.INVALID_SETTINGS }
    }
    s.dayVotingDuration = settings.dayVotingDuration
  }

  room.lastActivityAt = Date.now()
  return {}
}

/** Serialize room state for client — strips internal-only fields (kickBans). */
export function serializeRoom(room: RoomState) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostId: room.hostId,
    players: room.players,
    spectators: room.spectators,
    settings: room.settings,
  }
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/room/service.ts
git commit -m "feat: add room service (create, join, leave, kick, settings)"
```

---

## Task 12: Room REST Routes

**Files:**
- Create: `backend/src/room/routes.ts`

- [ ] **Step 1: Create `backend/src/room/routes.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/room/routes.ts
git commit -m "feat: add POST /rooms and GET /rooms/:code routes"
```

---

## Task 13: Room Socket Events

**Files:**
- Create: `backend/src/room/events.ts`

- [ ] **Step 1: Create `backend/src/room/events.ts`**

```ts
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

  // ── room:start ───────────────────────────────────────────────────────────
  // Handled in game/events.ts via orchestrator.startGame()

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
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/room/events.ts
git commit -m "feat: add room socket event handlers and reconnect logic"
```

---

## Task 14: Chat Service + Events

**Files:**
- Create: `backend/src/chat/service.ts`
- Create: `backend/src/chat/events.ts`

- [ ] **Step 1: Create `backend/src/chat/service.ts`**

```ts
import { v4 as uuidv4 } from 'uuid'
import { store } from '../game/store'
import { ErrorCodes } from '../shared/errors'
import type { ChatMessage, ChatChannel, GameState } from '../shared/types'

const MAX_MESSAGE_LENGTH = 500
const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 3000

// playerId:channel → array of sent timestamps
const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(playerId: string, channel: ChatChannel): { limited: boolean; retryAfter?: number } {
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
      return { error: ErrorCodes.CHANNEL_ACCESS_DENIED }  // system-only
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
```

- [ ] **Step 2: Create `backend/src/chat/events.ts`**

```ts
import type { Server, Socket } from 'socket.io'
import { store } from '../game/store'
import { ErrorCodes } from '../shared/errors'
import { checkRateLimit, validateChatAccess, buildChatMessage } from './service'
import type { ChatChannel } from '../shared/types'

export function registerChatEvents(io: Server, socket: Socket): void {
  const playerId = socket.data.playerId as string
  const displayName = socket.data.displayName as string

  socket.on('chat:message', (payload: unknown) => {
    const { channel, text } = (payload ?? {}) as { channel?: string; text?: string }

    if (typeof text !== 'string' || typeof channel !== 'string') {
      socket.emit('error', { code: ErrorCodes.EMPTY_MESSAGE, message: 'channel and text required' })
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

    // Rate limit
    const rateCheck = checkRateLimit(playerId, channel as ChatChannel)
    if (rateCheck.limited) {
      socket.emit('chat:rate_limited', { channel, retryAfter: rateCheck.retryAfter })
      return
    }

    // Build message
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
      // Only to living wolves
      for (const [pid, role] of game.roles) {
        if (role === 'werewolf' && game.alive.has(pid)) {
          io.to(`player:${pid}`).emit('chat:message', { channel, message })
        }
      }
    } else if (channel === 'ghost') {
      // Only to dead players
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
```

- [ ] **Step 3: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/chat/service.ts src/chat/events.ts
git commit -m "feat: add chat service with rate limiting and channel access"
```

---

## Task 15: Database Queries

**Files:**
- Create: `backend/src/db/queries.ts`

- [ ] **Step 1: Create `backend/src/db/queries.ts`**

```ts
import { pool } from './client'
import type { GameState, RoomState } from '../shared/types'

export async function writeGameResult(game: GameState, room: RoomState): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const endedAt = new Date()
    const startedAt = new Date(game.startedAt)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    // Insert game_logs
    const gameResult = await client.query<{ id: string }>(
      `INSERT INTO game_logs
         (room_code, started_at, ended_at, duration_seconds, winner, total_rounds, player_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        game.roomCode,
        startedAt,
        endedAt,
        durationSeconds,
        game.winner,
        game.round,
        game.players.length,
      ]
    )
    const gameId = gameResult.rows[0].id

    // Insert game_players
    for (const player of game.players) {
      const role = game.roles.get(player.playerId) ?? 'villager'
      const outcome = player.isAlive
        ? 'survived'
        : inferOutcome(game, player.playerId)
      const eliminatedRound = player.isAlive ? null : inferEliminatedRound(game, player.playerId)

      await client.query(
        `INSERT INTO game_players
           (game_id, player_id, display_name, role, outcome, eliminated_round)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [gameId, player.playerId, player.displayName, role, outcome, eliminatedRound]
      )
    }

    // Insert game_chat_logs (day, ghost, system — wolf chat is NOT persisted)
    const channels = (['day', 'ghost', 'system'] as const)
    for (const channel of channels) {
      for (const msg of game.chatLogs[channel]) {
        await client.query(
          `INSERT INTO game_chat_logs
             (game_id, channel, sender_id, sender_name, text, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gameId, channel, msg.senderId, msg.senderName, msg.text, new Date(msg.sentAt)]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

function inferOutcome(game: GameState, playerId: string): string {
  // Check last system message to determine how they died — simplified: use phase context
  // For now: if not alive, we need to differentiate night kill vs lynched
  // Store this info in PlayerInGame in a future iteration; default to 'killed_night'
  return 'killed_night'
}

function inferEliminatedRound(_game: GameState, _playerId: string): number | null {
  return null  // Enhanced tracking can be added later via PlayerInGame.eliminatedRound
}
```

Note: The `inferOutcome` and `inferEliminatedRound` stubs will be superseded in Task 16 when `PlayerInGame` gets `outcome` and `eliminatedRound` fields set by the orchestrator.

- [ ] **Step 2: Add `outcome` and `eliminatedRound` to `PlayerInGame` in `shared/types.ts`**

Modify `backend/src/shared/types.ts` — add two fields to `PlayerInGame`:

```ts
export interface PlayerInGame {
  playerId: string
  displayName: string
  isAlive: boolean
  connectionStatus: ConnectionStatus
  isAfk: boolean
  disconnectedAt: number | null
  outcome: 'survived' | 'killed_night' | 'lynched' | null  // set on death
  eliminatedRound: number | null                             // set on death
}
```

Then update `inferOutcome` and `inferEliminatedRound` in `queries.ts` to use these fields:

```ts
function inferOutcome(game: GameState, playerId: string): string {
  const player = game.players.find(p => p.playerId === playerId)
  return player?.outcome ?? 'killed_night'
}

function inferEliminatedRound(game: GameState, playerId: string): number | null {
  const player = game.players.find(p => p.playerId === playerId)
  return player?.eliminatedRound ?? null
}
```

- [ ] **Step 3: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/db/queries.ts src/shared/types.ts
git commit -m "feat: add DB write-on-game-over queries and player outcome tracking"
```

---

## Task 16: Game Orchestrator

**Files:**
- Create: `backend/src/game/orchestrator.ts`

- [ ] **Step 1: Create `backend/src/game/orchestrator.ts`**

```ts
import { randomInt } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import type { Server } from 'socket.io'
import { store } from './store'
import { assignRoles } from './engine/roles'
import { resolveNight, validateNightAction } from './engine/night'
import { resolveVoting } from './engine/day'
import { checkWin } from './engine/win'
import { writeGameResult } from '../db/queries'
import { logger } from '../shared/logger'
import { ErrorCodes } from '../shared/errors'
import type {
  GameState,
  PlayerInGame,
  ChatMessage,
  Faction,
  NightAction,
} from '../shared/types'

const rand = (max: number) => randomInt(max)

// ── Helpers ─────────────────────────────────────────────────────────────────

function systemMessage(text: string): ChatMessage {
  return { messageId: uuidv4(), senderId: null, senderName: 'System', text, sentAt: Date.now(), channel: 'system' }
}

function getPlayerName(game: GameState, playerId: string): string {
  return game.players.find(p => p.playerId === playerId)?.displayName ?? playerId
}

// ── startGame ────────────────────────────────────────────────────────────────

export function startGame(roomCode: string, io: Server): { error?: string } {
  const room = store.getRoom(roomCode)
  if (!room) return { error: ErrorCodes.ROOM_NOT_FOUND }
  if (room.status !== 'LOBBY') return { error: ErrorCodes.GAME_STARTED }
  if (room.players.length < 4) return { error: ErrorCodes.NOT_ENOUGH_PLAYERS }

  room.status = 'IN_GAME'

  const playerIds = room.players.map(p => p.playerId)
  const roles = assignRoles(playerIds, rand)

  const now = Date.now()
  const game: GameState = {
    roomCode,
    phase: 'ROLE_ASSIGNMENT',
    round: 1,
    players: room.players.map((p): PlayerInGame => ({
      playerId: p.playerId,
      displayName: p.displayName,
      isAlive: true,
      connectionStatus: p.connectionStatus,
      isAfk: false,
      disconnectedAt: p.disconnectedAt,
      outcome: null,
      eliminatedRound: null,
    })),
    roles,
    alive: new Set(playerIds),
    phaseStartedAt: now,
    phaseEndsAt: now + 2_000,  // 2s role assignment reveal
    lastActivityAt: now,
    nightActions: { wolfVotes: new Map(), seerTarget: null, doctorTarget: null },
    dayVotes: new Map(),
    daySkipVotes: new Set(),
    doctorLastProtected: null,
    seerInspectedTargets: new Set(),
    chatLogs: { day: [], wolf: [], ghost: [], system: [] },
    winner: null,
    startedAt: now,
  }

  store.setGame(roomCode, game)

  // Emit role assignments privately
  for (const [pid, role] of roles) {
    const knownAllies = role === 'werewolf'
      ? [...roles.entries()].filter(([, r]) => r === 'werewolf' && pid).map(([id]) => id).filter(id => id !== pid)
      : undefined
    io.to(`player:${pid}`).emit('game:role_assigned', { role, knownAllies })
  }

  io.to(roomCode).emit('game:started', {})
  io.to(roomCode).emit('game:phase_change', {
    phase: 'ROLE_ASSIGNMENT',
    endsAt: game.phaseEndsAt,
    round: game.round,
  })

  game.chatLogs.system.push(systemMessage('The game has begun. Roles have been assigned.'))
  logger.info({ roomCode, playerCount: playerIds.length }, 'Game started')
  return {}
}

// ── advancePhase ─────────────────────────────────────────────────────────────

export async function advancePhase(roomCode: string, io: Server): Promise<void> {
  const game = store.getGame(roomCode)
  if (!game) return

  const now = Date.now()
  const room = store.getRoom(roomCode)

  switch (game.phase) {
    case 'ROLE_ASSIGNMENT': {
      game.phase = 'NIGHT'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + (room?.settings.nightDuration ?? 60_000)
      game.nightActions = { wolfVotes: new Map(), seerTarget: null, doctorTarget: null }
      game.chatLogs.system.push(systemMessage('Night falls. The village sleeps...'))
      io.to(roomCode).emit('game:phase_change', { phase: 'NIGHT', endsAt: game.phaseEndsAt, round: game.round })
      break
    }

    case 'NIGHT': {
      // Auto-fill missing wolf votes
      fillMissingWolfVotes(game)

      const resolution = resolveNight(game, game.nightActions, rand)

      // Apply kill
      if (resolution.killedPlayerId) {
        const dead = game.players.find(p => p.playerId === resolution.killedPlayerId)!
        dead.isAlive = false
        dead.outcome = 'killed_night'
        dead.eliminatedRound = game.round
        game.alive.delete(resolution.killedPlayerId)
      }

      // Update seer state
      if (game.nightActions.seerTarget) {
        game.seerInspectedTargets.add(game.nightActions.seerTarget)
      }
      game.doctorLastProtected = game.nightActions.doctorTarget

      const killName = resolution.killedPlayerId ? getPlayerName(game, resolution.killedPlayerId) : null
      const killRole = resolution.killedPlayerId ? game.roles.get(resolution.killedPlayerId) : null
      game.chatLogs.system.push(systemMessage(
        killName ? `Dawn breaks. ${killName} was found dead.` : 'Dawn breaks. Nobody died last night.'
      ))

      // Transition to DAWN
      game.phase = 'DAWN'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + 5_000

      io.to(roomCode).emit('game:dawn', {
        killedPlayerId: resolution.killedPlayerId,
        role: killRole ?? undefined,
      })

      // Seer result — private
      if (resolution.seerResult) {
        const seerEntry = [...game.roles.entries()].find(([, r]) => r === 'seer')
        if (seerEntry) {
          io.to(`player:${seerEntry[0]}`).emit('seer:result', {
            targetId: resolution.seerResult.targetId,
            isWolf: resolution.seerResult.isWolf,
          })
        }
      }

      // Check win
      const win = checkWin(game)
      if (win) {
        await endGame(roomCode, game, win.winner, io)
        return
      }

      // Reset night actions for next round
      game.nightActions = { wolfVotes: new Map(), seerTarget: null, doctorTarget: null }
      break
    }

    case 'DAWN': {
      game.phase = 'DAY_DISCUSSION'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + (room?.settings.dayDiscussionDuration ?? 120_000)
      game.daySkipVotes = new Set()
      io.to(roomCode).emit('game:phase_change', { phase: 'DAY_DISCUSSION', endsAt: game.phaseEndsAt, round: game.round })
      break
    }

    case 'DAY_DISCUSSION': {
      game.phase = 'DAY_VOTING'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + (room?.settings.dayVotingDuration ?? 30_000)
      game.dayVotes = new Map()
      io.to(roomCode).emit('game:phase_change', { phase: 'DAY_VOTING', endsAt: game.phaseEndsAt, round: game.round })
      break
    }

    case 'DAY_VOTING': {
      const resolution = resolveVoting(game, game.dayVotes)

      if (resolution.eliminatedPlayerId) {
        const eliminated = game.players.find(p => p.playerId === resolution.eliminatedPlayerId)!
        eliminated.isAlive = false
        eliminated.outcome = 'lynched'
        eliminated.eliminatedRound = game.round
        game.alive.delete(resolution.eliminatedPlayerId)
        const role = game.roles.get(resolution.eliminatedPlayerId)!
        game.chatLogs.system.push(systemMessage(`${eliminated.displayName} was lynched. They were a ${role}.`))
        io.to(roomCode).emit('game:player_eliminated', {
          playerId: resolution.eliminatedPlayerId,
          role,
          cause: 'vote',
        })
      } else {
        game.chatLogs.system.push(systemMessage('The vote was tied. Nobody was lynched.'))
      }

      // Check win
      const win = checkWin(game)
      if (win) {
        await endGame(roomCode, game, win.winner, io)
        return
      }

      game.phase = 'DAY_RESULT'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + 5_000

      io.to(roomCode).emit('game:vote_update', { tallies: resolution.voteCounts })
      io.to(roomCode).emit('game:phase_change', {
        phase: 'DAY_RESULT',
        endsAt: game.phaseEndsAt,
        round: game.round,
        eliminatedPlayerId: resolution.eliminatedPlayerId,
      })
      break
    }

    case 'DAY_RESULT': {
      game.round++
      game.phase = 'NIGHT'
      game.phaseStartedAt = now
      game.phaseEndsAt = now + (room?.settings.nightDuration ?? 60_000)
      game.nightActions = { wolfVotes: new Map(), seerTarget: null, doctorTarget: null }
      game.chatLogs.system.push(systemMessage(`Night ${game.round} begins...`))
      io.to(roomCode).emit('game:phase_change', { phase: 'NIGHT', endsAt: game.phaseEndsAt, round: game.round })
      break
    }

    default:
      break
  }

  game.lastActivityAt = Date.now()
}

// ── endGame ──────────────────────────────────────────────────────────────────

async function endGame(roomCode: string, game: GameState, winner: Faction | null, io: Server): Promise<void> {
  game.phase = 'GAME_OVER'
  game.winner = winner
  game.phaseEndsAt = null

  const finalRoles: Record<string, string> = {}
  for (const [pid, role] of game.roles) finalRoles[pid] = role

  io.to(roomCode).emit('game:over', {
    winner,
    finalRoles,
    ghostChatLog: game.chatLogs.ghost,
  })
  logger.info({ roomCode, winner, round: game.round }, 'Game over')

  // Persist to DB (non-blocking — failure must not block lobby return)
  const room = store.getRoom(roomCode)
  if (room) {
    writeGameResult(game, room).catch(err => {
      logger.error({ err, roomCode }, 'Failed to write game result to DB')
    })
  }

  // Return room to LOBBY
  store.deleteGame(roomCode)
  if (room) {
    room.status = 'LOBBY'
    for (const p of room.players) p.isReady = false
  }
}

// ── abandonGame ──────────────────────────────────────────────────────────────

export async function abandonGame(roomCode: string, io: Server): Promise<void> {
  const game = store.getGame(roomCode)
  if (!game || game.phase === 'GAME_OVER') return
  logger.warn({ roomCode }, 'Abandoning game due to inactivity')
  await endGame(roomCode, game, null, io)
}

// ── Night action helpers ──────────────────────────────────────────────────────

export function handleNightAction(
  roomCode: string,
  playerId: string,
  action: NightAction,
  io: Server
): { error?: string } {
  const game = store.getGame(roomCode)
  if (!game) return { error: ErrorCodes.GAME_NOT_FOUND }

  const result = validateNightAction(game, playerId, action)
  if (!result.valid) return { error: result.errorCode }

  switch (action.type) {
    case 'wolf_vote':
      game.nightActions.wolfVotes.set(playerId, action.targetId)
      // Broadcast updated wolf vote tally to wolves
      broadcastWolfTally(game, roomCode, io)
      break
    case 'seer_inspect':
      game.nightActions.seerTarget = action.targetId
      break
    case 'doctor_protect':
      game.nightActions.doctorTarget = action.targetId
      break
  }

  game.lastActivityAt = Date.now()
  return {}
}

function broadcastWolfTally(game: GameState, roomCode: string, io: Server): void {
  const tally: Record<string, number> = {}
  for (const targetId of game.nightActions.wolfVotes.values()) {
    tally[targetId] = (tally[targetId] ?? 0) + 1
  }
  for (const [pid, role] of game.roles) {
    if (role === 'werewolf' && game.alive.has(pid)) {
      io.to(`player:${pid}`).emit('game:wolf_vote_update', { tally })
    }
  }
}

function fillMissingWolfVotes(game: GameState): void {
  const wolves = [...game.roles.entries()]
    .filter(([pid, role]) => role === 'werewolf' && game.alive.has(pid))
    .map(([pid]) => pid)

  const nonWolfTargets = [...game.alive].filter(
    pid => game.roles.get(pid) !== 'werewolf'
  )
  if (nonWolfTargets.length === 0) return

  for (const wolfId of wolves) {
    if (!game.nightActions.wolfVotes.has(wolfId)) {
      const target = nonWolfTargets[rand(nonWolfTargets.length)]
      game.nightActions.wolfVotes.set(wolfId, target)
    }
  }
}

// ── Day vote handlers ─────────────────────────────────────────────────────────

export function handleDayVote(
  roomCode: string,
  playerId: string,
  targetId: string | null,
  io: Server
): { error?: string } {
  const game = store.getGame(roomCode)
  if (!game) return { error: ErrorCodes.GAME_NOT_FOUND }
  if (game.phase !== 'DAY_VOTING') return { error: ErrorCodes.INVALID_PHASE }
  if (!game.alive.has(playerId)) return { error: ErrorCodes.PLAYER_DEAD }

  if (targetId === null) {
    game.dayVotes.delete(playerId)
  } else {
    if (targetId === playerId) return { error: ErrorCodes.SELF_TARGET }
    if (!game.alive.has(targetId)) return { error: ErrorCodes.INVALID_TARGET }
    game.dayVotes.set(playerId, targetId)
  }

  game.lastActivityAt = Date.now()

  // Broadcast live tally
  const tally: Record<string, number> = {}
  for (const tid of game.dayVotes.values()) {
    tally[tid] = (tally[tid] ?? 0) + 1
  }
  io.to(roomCode).emit('game:vote_update', { tallies: tally })

  // Early end: all living players voted
  const allVoted = [...game.alive].every(pid => game.dayVotes.has(pid))
  if (allVoted) {
    game.phaseEndsAt = Date.now()  // signal timer to advance immediately
  }

  return {}
}

export function handleSkipToVote(
  roomCode: string,
  playerId: string,
  io: Server
): { error?: string } {
  const game = store.getGame(roomCode)
  if (!game) return { error: ErrorCodes.GAME_NOT_FOUND }
  if (game.phase !== 'DAY_DISCUSSION') return { error: ErrorCodes.INVALID_PHASE }
  if (!game.alive.has(playerId)) return { error: ErrorCodes.PLAYER_DEAD }

  game.daySkipVotes.add(playerId)

  const skipCount = game.daySkipVotes.size
  const aliveCount = game.alive.size
  io.to(roomCode).emit('game:skip_vote_update', { skipCount, aliveCount })

  if (game.daySkipVotes.size >= game.alive.size) {
    game.phaseEndsAt = Date.now()  // trigger early advance via timer
  }

  game.lastActivityAt = Date.now()
  return {}
}
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/orchestrator.ts
git commit -m "feat: add game orchestrator (startGame, advancePhase, endGame, abandonGame)"
```

---

## Task 17: Game Socket Events

**Files:**
- Create: `backend/src/game/events.ts`

- [ ] **Step 1: Create `backend/src/game/events.ts`**

```ts
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
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/events.ts
git commit -m "feat: add game socket event handlers (night/day actions, room:start)"
```

---

## Task 18: Timer Loop

**Files:**
- Create: `backend/src/game/timer.ts`

- [ ] **Step 1: Create `backend/src/game/timer.ts`**

```ts
import type { Server } from 'socket.io'
import { store } from './store'
import { advancePhase, abandonGame } from './orchestrator'
import { logger } from '../shared/logger'

const TICK_INTERVAL_MS = 500
const GAME_IDLE_TIMEOUT_MS = 5 * 60 * 1000   // 5 min
const ROOM_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000  // 2 hours
const LOBBY_DISCONNECT_TIMEOUT_MS = 60_000    // 1 min
const HOST_MIGRATION_TIMEOUT_MS = 30_000      // 30s

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
```

- [ ] **Step 2: Verify**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/timer.ts
git commit -m "feat: add 500ms timer loop for phase transitions and idle cleanup"
```

---

## Task 19: Health, Metrics, and Full Bootstrap

**Files:**
- Create: `backend/src/index.ts` (replaces skeleton from Task 1)

- [ ] **Step 1: Replace `backend/src/index.ts` with full bootstrap**

```ts
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
app.use(rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false }))

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

export { io }
```

- [ ] **Step 2: Verify full typecheck**

```bash
cd backend && pnpm exec tsc --noEmit
```

Expected: no errors across all files.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add full Express + Socket.IO bootstrap with health and metrics"
```

---

## Task 20: Smoke Test

- [ ] **Step 1: Copy `.env.example` to `.env` and set JWT_SECRET**

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set JWT_SECRET=local_dev_secret_123
```

- [ ] **Step 2: Start the server**

```bash
cd backend && pnpm dev
```

Expected output:
```
{"level":30,"msg":"Werewolf backend listening","port":3000}
{"level":30,"msg":"Timer loop started"}
```

- [ ] **Step 3: Verify health endpoint**

```bash
curl -s http://localhost:3000/health | python3 -m json.tool
```

Expected:
```json
{
  "status": "ok",
  "uptime": ...,
  "activeGames": 0
}
```

- [ ] **Step 4: Verify guest auth**

```bash
curl -s -X POST http://localhost:3000/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"displayName":"TestPlayer"}' | python3 -m json.tool
```

Expected:
```json
{
  "token": "eyJ...",
  "playerId": "..."
}
```

- [ ] **Step 5: Verify room creation (use token from Step 4)**

```bash
TOKEN="<token from step 4>"
curl -s -X POST http://localhost:3000/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

Expected:
```json
{
  "roomCode": "XXXXXX"
}
```

- [ ] **Step 6: Verify metrics**

```bash
curl -s http://localhost:3000/metrics | grep werewolf
```

Expected: lines like `werewolf_active_rooms_total 1`

- [ ] **Step 7: Final commit**

```bash
git add backend/.env  # only if you want; .env is typically in .gitignore
git commit -m "feat: werewolf phase 1 backend complete — smoke test passing"
```

---

## Self-Review Checklist

Run this after all tasks complete:

- [ ] `pnpm exec tsc --noEmit` passes with zero errors
- [ ] All PRD §17 client→server events handled in `room/events.ts`, `game/events.ts`, `chat/events.ts`
- [ ] All PRD §17 server→client events emitted somewhere in `orchestrator.ts` or event handlers
- [ ] Game engine functions (`roles`, `night`, `day`, `win`) have no imports from `store`, `socket`, or `db`
- [ ] DB writes happen only in `orchestrator.endGame` (never during live play)
- [ ] Rate limiting in `chat/service.ts` uses sliding window per player+channel
- [ ] Reconnect flow in `room/events.ts`: re-joins socket room, updates connection status, sends snapshot or room state
- [ ] Night 1 peaceful: `resolveNight` returns `killedPlayerId: null` when `state.round === 1`
- [ ] Win condition checked after both night kills (in `NIGHT → DAWN`) and day votes (in `DAY_VOTING → DAY_RESULT`)

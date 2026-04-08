# Werewolf Backend — Phase 1 Design Spec

**Date:** 2026-04-08
**Status:** Approved
**Stack:** Node.js + TypeScript, Express, Socket.IO, PostgreSQL (raw `pg`), pnpm

---

## 1. Project Layout

Co-located flat structure at repo root:

```
backend/
├── src/
│   ├── auth/
│   │   ├── routes.ts        # POST /auth/guest
│   │   └── service.ts       # JWT sign/verify
│   ├── room/
│   │   ├── routes.ts        # POST /rooms, GET /rooms/:code
│   │   ├── events.ts        # Socket: room:create/join/leave/ready/start/kick/update_settings
│   │   └── service.ts       # Room lifecycle, host migration, kick bans
│   ├── game/
│   │   ├── engine/
│   │   │   ├── roles.ts     # assignRoles
│   │   │   ├── night.ts     # resolveNight, validateNightAction
│   │   │   ├── day.ts       # resolveVoting
│   │   │   └── win.ts       # checkWin
│   │   ├── store.ts         # GameStore singleton (shared by all features)
│   │   ├── orchestrator.ts  # Phase transitions, advancePhase, abandonGame
│   │   ├── events.ts        # Socket: night:*/day:* actions
│   │   └── timer.ts         # 500ms tick loop
│   ├── chat/
│   │   ├── events.ts        # Socket: chat:message
│   │   └── service.ts       # Rate limiting, channel access rules
│   ├── db/
│   │   ├── client.ts        # pg Pool
│   │   └── queries.ts       # game_logs, game_players, game_chat_logs writes
│   ├── shared/
│   │   ├── types.ts         # All TS interfaces + enums
│   │   ├── middleware.ts    # JWT auth middleware (REST + socket)
│   │   └── errors.ts        # Error codes
│   └── index.ts             # Express + Socket.IO bootstrap, timer start
├── package.json
├── tsconfig.json
└── .env.example
frontend/                    # Separate, implemented later
```

---

## 2. Data Flow

```
HTTP Request      REST routes (auth/, room/)
                       │
                  middleware.ts (JWT)
                       │
                  feature service.ts
                       │
                  game/store.ts ──→ game/engine/ (pure functions)
                       │
                  db/queries.ts (on GAME_OVER only)

WebSocket Event   feature events.ts
                       │
                  middleware.ts (JWT socket auth)
                       │
                  feature service.ts / game/orchestrator.ts
                       │
                  game/store.ts ──→ game/engine/ (pure functions)
                       │
                  io.to(roomCode).emit(...)
```

**Layer rules:**
- `engine/` functions: pure, no I/O, no store imports, take state + return new state
- `orchestrator.ts`: sole caller of engine functions; sole emitter of game socket events; sole writer to DB on game over
- `events.ts` files: validate input, delegate to service/orchestrator — no game logic inline
- DB writes only on `GAME_OVER`, wrapped in try/catch (failure does not block lobby return)

---

## 3. Bootstrap (`index.ts`)

1. Create Express app
2. Attach middleware: CORS, JSON body parser, express-rate-limit (30 req/min per IP)
3. Mount REST routers: auth, room, health, metrics
4. Create `http.Server` from Express app
5. Attach Socket.IO to `http.Server`
6. Register Socket.IO middleware: JWT validation on every connection, attach `socket.data.playerId` + `socket.data.displayName`
7. Register socket event handlers: `room/events.ts`, `game/events.ts`, `chat/events.ts`
8. Start timer loop (`game/timer.ts`)

**Socket.IO rooms:** each player joins a Socket.IO room keyed by `roomCode` on join, enabling `io.to(roomCode).emit(...)` broadcasts.

**Environment (`.env`):**
```
PORT=3000
JWT_SECRET=...
DATABASE_URL=postgres://...
```

---

## 4. Shared Types (`shared/types.ts`)

Key interfaces, all derived from PRD §15:

```ts
type GamePhase =
  | 'LOBBY' | 'ROLE_ASSIGNMENT' | 'NIGHT' | 'DAWN'
  | 'DAY_DISCUSSION' | 'DAY_VOTING' | 'DAY_RESULT' | 'GAME_OVER'

type Role = 'werewolf' | 'seer' | 'doctor' | 'villager'

interface RoomState {
  roomCode: string
  status: 'LOBBY' | 'IN_GAME' | 'GAME_OVER' | 'EXPIRED'
  hostId: string
  players: RoomPlayer[]       // all joined players
  spectators: RoomPlayer[]
  settings: GameSettings
  kickBans: Map<string, number>  // playerId → bannedUntil timestamp
  lastActivityAt: number
}

interface GameSettings {
  nightDuration: number        // ms
  dayDiscussionDuration: number
  dayVotingDuration: number
}

interface GameState {
  roomCode: string
  phase: GamePhase
  round: number
  players: PlayerInGame[]
  roles: Map<string, Role>
  alive: Set<string>
  phaseStartedAt: number
  phaseEndsAt: number
  lastActivityAt: number
  nightActions: NightActionsState
  dayVotes: Map<string, string>   // voterId → targetId
  daySkipVotes: Set<string>
  doctorLastProtected: string | null
  seerInspectedTargets: Set<string>      // targetIds already inspected this game (enforces no-repeat rule)
  // Seer results per night stored in NightResolution history on orchestrator, not in GameState
  chatLogs: { day: ChatMessage[]; wolf: ChatMessage[]; ghost: ChatMessage[]; system: ChatMessage[] }
  winner: 'wolves' | 'villagers' | null
}

interface NightActionsState {
  wolfVotes: Map<string, string>   // voterId → targetId
  seerTarget: string | null
  doctorTarget: string | null
}
```

---

## 5. Game Engine (`game/engine/`)

Pure functions — no imports from store, socket, db.

### `roles.ts`
```ts
assignRoles(playerIds: string[], randFn: () => number): Map<string, Role>
```
Uses PRD §7 role distribution table. `randFn` is `() => crypto.randomInt(0, n)` in production.

### `night.ts`
```ts
validateNightAction(state: GameState, playerId: string, action: NightAction): ValidationResult
resolveNight(state: GameState, actions: NightActionsState, randFn: () => number): NightResolution
```
Resolution order (PRD §8):
1. Doctor protection recorded
2. Wolf vote tallied; tie broken by `randFn`; missing wolf votes auto-randomized to living non-wolves
3. Kill resolved: if target === doctor protect → no death
4. Seer result computed

Night 1: wolves cannot kill (peaceful night).

### `day.ts`
```ts
resolveVoting(state: GameState, votes: Map<string, string>): VotingResolution
```
Majority of votes cast wins. Tie → no elimination. All abstain → no elimination.

### `win.ts`
```ts
checkWin(state: GameState): WinResult | null
```
- Wolves win: `wolfCount >= nonWolfCount` (alive only)
- Villagers win: `wolfCount === 0`
- Checked after every elimination (night kill and day vote)

---

## 6. In-Memory Store (`game/store.ts`)

```ts
class GameStore {
  private games: Map<string, GameState>     // roomCode → GameState
  private rooms: Map<string, RoomState>     // roomCode → RoomState
  private playerRoomIndex: Map<string, string>  // playerId → roomCode
}
```

Singleton exported. Imported by orchestrator, room service, chat service.

Cleanup:
- Game state deleted immediately after `GAME_OVER` DB write
- Empty rooms removed after 2h inactivity (checked in timer loop)
- Orphaned `playerRoomIndex` entries cleaned on disconnect

---

## 7. Orchestrator (`game/orchestrator.ts`)

**`startGame(roomCode, io)`**
1. Validate ≥ 4 players
2. `assignRoles()` → store in GameState
3. Lock room (no new joins, no role switches)
4. Emit `game:role_assigned` privately to each player (wolves get ally list)
5. Set phase `ROLE_ASSIGNMENT`, `phaseEndsAt = now + 2000`
6. Emit `game:phase_change` to room

**`advancePhase(roomCode, io)`** — called by timer:
```
ROLE_ASSIGNMENT → NIGHT           emit game:phase_change
NIGHT           → DAWN            orchestrator fills missing actions → resolveNight()
                                  → emit game:dawn (broadcast)
                                  → emit seer:result (private, to seer only)
                                  → checkWin
DAWN            → DAY_DISCUSSION  emit game:phase_change
DAY_DISCUSSION  → DAY_VOTING      emit game:phase_change
DAY_VOTING      → DAY_RESULT      resolveVoting() → emit game:player_eliminated → checkWin
DAY_RESULT      → NIGHT           increment round, emit game:phase_change
any             → GAME_OVER       writeGameToDb() → emit game:over → delete from store
```

**`abandonGame(roomCode, io)`** — called by timer when idle > 5 min:
Transitions to `GAME_OVER` with `winner: null`.

**Auto-action fill** (orchestrator, before calling `resolveNight`): wolves with no vote get a random living non-wolf target via `randFn`. This happens in orchestrator — not inside engine functions.

---

## 8. Timer (`game/timer.ts`)

```ts
setInterval(() => {
  const now = Date.now()
  for (const [roomCode, game] of store.games) {
    if (game.phaseEndsAt && now >= game.phaseEndsAt) {
      orchestrator.advancePhase(roomCode, io)
    }
    if (now - game.lastActivityAt > 5 * 60 * 1000) {
      orchestrator.abandonGame(roomCode, io)
    }
  }
  // Also clean up expired empty rooms
  for (const [roomCode, room] of store.rooms) {
    if (!store.games.has(roomCode) && now - room.lastActivityAt > 2 * 60 * 60 * 1000) {
      store.deleteRoom(roomCode)
    }
  }
}, 500)
```

---

## 9. REST API

| Endpoint | Auth | Behaviour |
|---|---|---|
| `POST /auth/guest` | No | Validate name (3–20 chars, alphanumeric+spaces); return `{ token, playerId }` |
| `POST /rooms` | JWT | Create room, add creator as host; return `{ roomCode }` |
| `GET /rooms/:code` | JWT | Return `{ exists, phase, playerCount, canJoin }` |
| `GET /health` | No | Return `{ status: 'ok', uptime, activeGames }` |
| `GET /metrics` | No | Prometheus text format |

Rate limit: 30 req/min per IP via `express-rate-limit`.

---

## 10. WebSocket Events

All events validated before reaching service/orchestrator (PRD §17):
- JWT valid + not expired
- Player exists in a room
- Correct phase for the action
- Player is alive (gameplay actions)
- Player has required role
- Target valid (alive, not self where applicable)

See PRD §17 for full client→server and server→client event tables.

---

## 11. Chat (`chat/`)

**Rate limiting** (`chat/service.ts`):
- 5 messages / 3s per player per channel
- Tracked in `Map<string, number[]>` (playerId+channel → timestamps), sliding window
- Excess → emit `chat:rate_limited`

**Channel access rules** (enforced server-side):
| Channel | Can send | Can receive |
|---|---|---|
| day | Living players | Living players + spectators |
| wolf | Living wolves (night only) | Living wolves |
| ghost | Dead players | Dead players |
| system | Server only | All |

**Message rules:** 500 char max, no empty/whitespace, HTML/script tags stripped.

---

## 12. Reconnect Flow

On socket `connect` with existing JWT:
1. Match `playerId` to `playerRoomIndex`
2. Mark player `connectionStatus: 'connected'`
3. If in active game → emit `game:state_snapshot` (filtered by role + alive status)
4. Rejoin Socket.IO room for broadcasts
5. If JWT TTL < 6h → issue refreshed token

On `disconnect`:
- Mark `connectionStatus: 'disconnected'` with timestamp
- In lobby: if disconnected ≥ 60s → remove from room
- In game: never remove; if disconnected 30s+ → mark AFK, auto-randomize actions

---

## 13. Database (`db/`)

**`client.ts`:** exports a `pg.Pool` configured from `DATABASE_URL`.

**`queries.ts`:** single function `writeGameResult(game: GameState, room: RoomState)` — inserts into `game_logs`, `game_players`, `game_chat_logs` in a single transaction. Called only by orchestrator on `GAME_OVER`.

Schema per PRD §19:
- `game_logs`: id, room_code, started_at, ended_at, duration_seconds, winner, total_rounds, player_count
- `game_players`: id, game_id, player_id, display_name, role, outcome, eliminated_round
- `game_chat_logs`: id, game_id, channel, sender_id, sender_name, text, sent_at (day + ghost + system only)

---

## 14. Security

- All actions server-validated (phase, role, alive status, target validity)
- No self-vote in day, no self-inspect by Seer, wolves cannot kill wolves
- Spectators blocked from all chat sends and gameplay actions
- Dead players blocked from gameplay actions
- Input sanitized: display name and chat text stripped of HTML
- JWT required for all socket connections and REST calls (except /auth/guest, /health)

---

## 15. Out of Scope (Phase 1)

- Frontend (React/Vite)
- Redis-backed state / horizontal scaling
- Profanity filter
- User accounts
- Additional roles (Hunter, Witch, Cupid)
- Replay system

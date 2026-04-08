# 🐺 Werewolf — Product Requirements & Design Document

**Version:** 2.3
**Status:** MVP Final (Detailed)
**Last updated:** April 2026
**Stack:** Node.js + TypeScript, React + Vite, Socket.IO, PostgreSQL

---

# 1. Overview

Werewolf is a browser-based real-time multiplayer social deduction game for **4–10 players**. This is a **simplified** variant of the classic party game.

### Core Loop

1. Players join a room via 6-character code
2. Host starts the game when ≥ 4 players are present
3. Each player receives a secret role
4. Game alternates between **Night** (secret actions) and **Day** (discussion + vote)
5. Game ends when one faction wins

### Win Conditions

- **Werewolves win** when wolves ≥ non-wolves (parity rule)
- **Villagers win** when all werewolves are eliminated
- Win condition is checked **after every elimination** (both night kills and day votes)

---

# 2. Core Principles

- **Zero friction** — no signup, guest-only
- **Fair gameplay** — server-authoritative, no client trust
- **Real-time** — WebSocket-driven via Socket.IO
- **Recoverable** — graceful disconnect handling
- **Single-instance MVP** — in-memory state, no horizontal scaling (see §20)

---

# 3. Authentication

## Guest-Only System

### Flow

1. User enters display name (3–20 chars, alphanumeric + spaces)
2. Client calls `POST /auth/guest`
3. Server returns JWT (TTL: 24h)
4. Client stores JWT in `localStorage`
5. JWT used for all REST + WebSocket connections

### JWT Payload

```json
{
  "playerId": "uuid-v4",
  "displayName": "string",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Rules

- `playerId` is the persistent identity (used for reconnect)
- JWT is **silently refreshed** on every successful socket reconnect if remaining TTL < 6h
- Display name uniqueness is **per-room only**, not global
- Validation: name must not be empty, ≤ 20 chars, no profanity at MVP (deferred)

---

# 4. Room System

## Properties

| Property                  | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| Code                      | 6-char uppercase alphanumeric (excludes ambiguous chars: 0, O, 1, I) |
| Min players               | 4                                                                    |
| Max players               | 10                                                                   |
| Max spectators            | 20                                                                   |
| Inactivity expiry         | 2 hours                                                              |
| In-game inactivity expiry | 5 minutes                                                            |

## Player Types

| Type      | Capabilities                                     |
| --------- | ------------------------------------------------ |
| Player    | Full gameplay, voting, chatting, role assignment |
| Spectator | View-only (day chat + player list)               |

### Spectator Restrictions

- Cannot see roles of any player
- Cannot see night actions
- Cannot see wolf chat or ghost chat
- Cannot vote
- Can only see day discussion chat
- Can join any time **before** game starts; once a game is in progress, no new spectators may join (prevents role leak via friends)

## Room Lifecycle

```
CREATED → LOBBY → IN_GAME → GAME_OVER → LOBBY → ... → EXPIRED
```

- A room returns to `LOBBY` after `GAME_OVER`, allowing rematches with the same players
- Room expires after 2 hours of total inactivity (no socket events received)
- An in-progress game auto-ends if no actions are received for 5 minutes (treated as abandonment)

## Host Rules

- The first player to join is the **host**
- Host has the "Start Game" button
- **Host migration:** if the host disconnects for > 30s in lobby, host transfers to the next-joined player
- During an active game, host has **no special powers** — host migration is irrelevant mid-game

---

# 5. Lobby System

## Features

- Player list with ready indicators
- Spectator list
- Ready toggle (per player)
- "Start Game" button (host only)
- Room code display + copy-to-clipboard
- "Leave room" button
- **Game settings panel (host only):** configure phase timers before starting

## Game Settings (Host-Configurable)

| Setting                 | Default                  | Min | Max  |
| ----------------------- | ------------------------ | --- | ---- |
| Night duration          | 60s                      | 30s | 180s |
| Day discussion duration | 120s (4–5p) / 180s (6+p) | 60s | 600s |
| Day voting duration     | 30s                      | 15s | 120s |

### Rules

- Only the host can change settings
- Settings are locked once the game starts
- Settings are visible to all players in the lobby (transparency)
- Settings reset to defaults if host migrates
- Settings are stored on the `RoomState` and copied into `GameState` at game start
- Validation enforced server-side; out-of-range values are rejected with `error` event

## Start Conditions

Game can start when **all** of the following are true:

- ≥ 4 players in the room
- Either:
  - Host clicks "Start Game" (overrides ready state), **OR**
  - All players are marked ready

## Lobby Rules

- Host can kick players (kicked players cannot rejoin same room for 5 min)
- Players can switch between Player ↔ Spectator before game starts (subject to caps)
- Once game starts, lobby is locked — no joins, no role switches

---

# 6. Game State Machine

```
LOBBY
  ↓ (host starts game)
ROLE_ASSIGNMENT (2s, reveal-only)
  ↓
NIGHT
  ↓ (timer expires — full duration always)
DAWN (5s, reveal results)
  ↓ (check win → if win, GAME_OVER)
DAY_DISCUSSION
  ↓ (timer expires)
DAY_VOTING
  ↓ (timer expires OR all votes submitted)
DAY_RESULT (5s, reveal lynch)
  ↓ (check win → if win, GAME_OVER)
NIGHT (loop)
  ...
GAME_OVER
  ↓ (host clicks "Return to Lobby")
LOBBY
```

### Phase Transitions

- All transitions are **server-driven**
- Server emits `game:phase_change` to all clients on every transition
- Clients render UI based on phase + role

---

# 7. Roles

## Role Definitions

### Werewolf 🐺

- **Faction:** Wolves
- **Night ability:** Vote with other wolves to kill one player
- **Special:** Has access to private wolf chat **only at night**
- **Knows:** Identity of other wolves from game start

### Seer 🔮

- **Faction:** Villagers
- **Night ability:** Inspect one player → result is **binary** ("Wolf" or "Not a Wolf")
- **Cannot:** Inspect themselves
- **Cannot:** Inspect the same player twice in the same game

### Doctor 💊

- **Faction:** Villagers
- **Night ability:** Protect one player from being killed that night
- **Can:** Protect themselves
- **Cannot:** Protect the same player **two nights in a row** (must alternate)
- **Feedback:** Doctor is NOT told whether their save succeeded

### Villager 👤

- **Faction:** Villagers
- **Night ability:** None (sleeps)
- **Day ability:** Discuss + vote

## Role Distribution

| Players | Wolves | Seer | Doctor | Villagers |
| ------- | ------ | ---- | ------ | --------- |
| 4       | 1      | 1    | 0      | 2         |
| 5       | 1      | 1    | 1      | 2         |
| 6       | 2      | 1    | 1      | 2         |
| 7       | 2      | 1    | 1      | 3         |
| 8       | 2      | 1    | 1      | 4         |
| 9       | 3      | 1    | 1      | 4         |
| 10      | 3      | 1    | 1      | 5         |

Role assignment is **random** using a cryptographically secure shuffle (`crypto.randomInt`).

---

# 8. Night Phase

## Duration

- **Default 60 seconds** (configurable by host in lobby, see §5)
- Night phase **always runs the full duration** — even if all actions are submitted early
- Rationale: prevents wolves from leaking timing info (e.g., "night ended fast = all wolves were ready")

## Behavior

- All night actions happen **simultaneously**
- Each player sees only their own role's UI
- Wolves see wolf chat + wolf vote panel
- Seer sees inspect target picker
- Doctor sees protect target picker
- Villagers see "You are sleeping..." screen with countdown

## First Night Rule

- **Night 1 is a "peaceful night"** — wolves cannot kill, but can chat and coordinate
- Seer **can** inspect on night 1
- Doctor **can** protect on night 1 (effectively a no-op since no kill happens)
- Rationale: prevents instant-loss feel and gives players one round to read the table

## Action Resolution Order

Resolved server-side in this exact order at end of phase:

1. **Doctor protection** is recorded
2. **Wolf kill target** is determined:
   - Tally wolf votes
   - Majority wins
   - **Tie-break:** random selection among tied targets using `crypto.randomInt`
3. **Resolve kill:**
   - If kill target == doctor's protect target → no death
   - Else → target dies
4. **Seer inspection** is resolved (no impact on death, just generates result for Seer)

## Missing Actions

- If a wolf doesn't vote → their vote is auto-randomized among living non-wolves
- If Seer doesn't inspect → no inspection result that night
- If Doctor doesn't protect → no protection that night
- Disconnected players' actions are auto-randomized following the same rules

## Constraints

- Wolves cannot vote to kill another wolf
- Doctor cannot protect the same player two consecutive nights
- Seer cannot inspect themselves
- Seer cannot inspect the same player twice in a game
- Dead players cannot perform any action

---

# 9. Day Phase

## Day Discussion

### Duration

- **Default 3 minutes** for 6+ players
- **Default 2 minutes** for 4–5 players
- Configurable by host in lobby (see §5)

### Behavior

- All living players can chat in the day channel
- Spectators can view but not send
- Dead players see day chat but cannot send (they have ghost chat instead)
- Wolf chat is **disabled** during the day
- Phase ends automatically when timer expires

### Skip Option

- If **all living players** click "Skip to Vote", discussion ends immediately

## Day Voting

### Duration

- **Default 30 seconds** (configurable by host in lobby, see §5)

### Rules

- One vote per living player
- **Self-voting is forbidden**
- Players **can change their vote** until the timer expires (last vote counts)
- **Abstaining is allowed** — players who don't vote are counted as abstain
- Majority of **votes cast** (not living players) eliminates the target
- **Tie → no elimination**
- **All abstain → no elimination**
- Vote tallies are **visible in real-time** to all players (creates pressure)

### Resolution

- Eliminated player's **role is publicly revealed**
- Win condition is checked
- If no win → proceed to next Night

---

# 10. Death & Ghost System

## On Death

- Player is marked `isAlive: false`
- Role is revealed publicly only if death occurred via **day vote**
- Night kill victims have role revealed at **dawn**
- Player moves into ghost state immediately

## Ghost Capabilities

- Can view **all game state** including:
  - All player roles
  - All chat channels (day, wolf, ghost)
  - All ongoing actions
- Can chat in **ghost channel** with other dead players

## Ghost Restrictions

- Cannot send messages in day chat
- Cannot vote
- Cannot perform night actions
- Cannot interact with living players in any way
- Cannot reveal info to living players (enforced by channel separation)

## Post-Game

- Once game ends, ghost chat history is revealed in the lobby for all players to read
- Wolf chat history is NOT revealed (preserves mystery for rematches)

---

# 11. Reconnect System

## Disconnect Detection

- Socket.IO `disconnect` event triggers reconnect timer
- Player is marked `connectionStatus: "disconnected"` with timestamp

## Behavior

### In Lobby

| Time disconnected | Result                |
| ----------------- | --------------------- |
| < 60s             | Slot held, can rejoin |
| ≥ 60s             | Removed from room     |

### In Game (Critical Fix)

| Time disconnected                   | Result                                               |
| ----------------------------------- | ---------------------------------------------------- |
| < 30s                               | Resume seamlessly, no penalty                        |
| 30s – end of current phase          | Marked AFK, actions auto-randomized, **stays alive** |
| Misses 2 consecutive full phases    | Marked AFK persistently, continues to be auto-played |
| Reconnect any time before game ends | Resumes control immediately                          |

**Players are NEVER eliminated due to disconnect mid-game.** This prevents griefing and preserves role balance. AFK players still count toward win conditions.

## Reconnect Flow

1. Client detects connection loss → shows "Reconnecting..." overlay
2. Client retries with stored JWT
3. Server validates JWT → matches `playerId` to existing room slot
4. Server sends full `game:state_snapshot` (filtered by what the player should see based on role + alive status)
5. Client rehydrates UI

## Anti-Exploit Rules

- A player cannot use disconnect to "skip" a vote or action
- Reconnect does not reset any timers
- A player cannot reconnect with a different display name
- Spectators cannot reconnect as players or vice versa

---

# 12. Spectator System

## Features

- Join room before game starts (room code required)
- View:
  - Player list (no roles)
  - Day chat (read-only)
  - Day vote tallies
  - Phase + timer

## Restrictions

- No role assignment
- No voting
- No night phase visibility
- No wolf or ghost chat
- Cannot send any chat
- Cannot become a player after game starts

---

# 13. Chat System

## Channels

| Channel | Audience                    | Active Phases           | Persisted to DB |
| ------- | --------------------------- | ----------------------- | --------------- |
| Day     | Living players + spectators | Day discussion + voting | Yes             |
| Wolf    | Living wolves only          | Night only              | No              |
| Ghost   | Dead players only           | All phases              | Yes             |
| System  | All                         | All phases              | Yes             |

### System Channel

- Server-generated messages: "Player X was eliminated", "Night falls", "Dawn breaks", etc.

## Rate Limiting

- **5 messages per 3 seconds** per player, **per channel**
- Enforced server-side
- Excess messages return `chat:rate_limited` error event
- Message length cap: **500 characters**
- Empty / whitespace-only messages rejected

---

# 14. Game Engine (Critical)

## Design Philosophy

The game engine is a set of **pure functions** with no side effects, no I/O, and no socket calls. This makes it trivially unit-testable and deterministic.

## Core Functions

```ts
// Resolves all night actions and returns the new state
resolveNight(state: GameState, actions: NightActions): NightResolution

// Resolves day votes and returns the new state
resolveVoting(state: GameState, votes: DayVotes): VotingResolution

// Checks current state for win condition
checkWin(state: GameState): WinResult | null

// Assigns roles randomly to players
assignRoles(playerIds: string[]): RoleAssignment

// Validates a single night action against current state
validateNightAction(state: GameState, playerId: string, action: NightAction): ValidationResult
```

## Rules

- Pure functions only — no Date.now(), no Math.random() (inject seeds)
- All randomness is injected as a parameter (testability)
- Functions return new state objects (immutable)
- All validation lives here — gateway layer only orchestrates

---

# 15. State Management

## In-Memory Store

```ts
class GameStore {
  private games: Map<string, GameState>; // keyed by roomCode
  private rooms: Map<string, RoomState>; // keyed by roomCode
  private playerRoomIndex: Map<string, string>; // playerId → roomCode
}
```

## GameState Shape

```ts
interface GameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  players: PlayerInGame[];
  roles: Map<string, Role>; // playerId → role
  alive: Set<string>; // playerId set
  phaseStartedAt: number; // unix ms
  phaseEndsAt: number; // unix ms
  lastActivityAt: number; // unix ms
  nightActions: NightActionsState;
  dayVotes: Map<string, string>; // voterId → targetId
  doctorLastProtected: string | null;
  seerInspections: Map<number, { target: string; result: boolean }>; // round → result
  chatLogs: {
    day: ChatMessage[];
    wolf: ChatMessage[];
    ghost: ChatMessage[];
    system: ChatMessage[];
  };
  winner: "wolves" | "villagers" | null;
}
```

## Persistence

- Game state is **NOT persisted** during play (in-memory only)
- On `GAME_OVER`, summary is written to PostgreSQL (see §19)
- Server restart = active games are lost (acceptable MVP tradeoff, see §20)

---

# 16. Timer System

## Approach

- **Single global tick loop** runs every **500ms**
- On each tick, iterate all active games and check `phaseEndsAt`
- If `now > phaseEndsAt` → call `advancePhase(roomCode)`

```ts
setInterval(() => {
  const now = Date.now();
  for (const [roomCode, game] of gameStore.games) {
    if (game.phaseEndsAt && now >= game.phaseEndsAt) {
      gameOrchestrator.advancePhase(roomCode);
    }
    if (now - game.lastActivityAt > FIVE_MINUTES) {
      gameOrchestrator.abandonGame(roomCode);
    }
  }
}, 500);
```

## Constraints

- 500ms tick = max 500ms drift on phase end (acceptable)
- Single loop scales to ~hundreds of concurrent games on a single Node process
- Beyond that, shard by roomCode (out of scope for MVP)

---

# 17. WebSocket Events

## Connection

- Client connects to `wss://api.werewolf.example/socket` with JWT in `auth.token`
- Server validates JWT on `connection` event
- Invalid token → disconnect with reason

## Client → Server Events

| Event                  | Payload                                                          | Description                          |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `room:create`          | `{ }`                                                            | Create a new room, returns room code |
| `room:join`            | `{ roomCode, asSpectator? }`                                     | Join existing room                   |
| `room:leave`           | `{ }`                                                            | Leave current room                   |
| `room:ready`           | `{ ready: boolean }`                                             | Toggle ready state in lobby          |
| `room:start`           | `{ }`                                                            | Host starts the game                 |
| `room:update_settings` | `{ nightDuration?, dayDiscussionDuration?, dayVotingDuration? }` | Host updates timer config            |
| `room:kick`            | `{ playerId }`                                                   | Host kicks a player                  |
| `night:wolf_vote`      | `{ targetId }`                                                   | Wolf votes to kill                   |
| `night:seer_inspect`   | `{ targetId }`                                                   | Seer inspects                        |
| `night:doctor_protect` | `{ targetId }`                                                   | Doctor protects                      |
| `day:vote`             | `{ targetId \| null }`                                           | Day vote (null = retract)            |
| `day:skip_to_vote`     | `{ }`                                                            | Vote to skip discussion              |
| `chat:message`         | `{ channel, text }`                                              | Send chat message                    |

## Server → Client Events

| Event                    | Payload                                | Description                              |
| ------------------------ | -------------------------------------- | ---------------------------------------- |
| `room:state`             | Full room state                        | Sent on join + state changes             |
| `room:player_joined`     | `{ player }`                           | Broadcast                                |
| `room:player_left`       | `{ playerId }`                         | Broadcast                                |
| `room:host_changed`      | `{ newHostId }`                        | Host migration                           |
| `room:settings_updated`  | `{ settings }`                         | Broadcast when host changes timer config |
| `game:started`           | `{ }`                                  | Game has begun                           |
| `game:role_assigned`     | `{ role, knownAllies? }`               | Per-player private event                 |
| `game:phase_change`      | `{ phase, endsAt, round }`             | All clients                              |
| `game:state_snapshot`    | Filtered game state                    | Sent on reconnect                        |
| `game:dawn`              | `{ killedPlayerId \| null, role? }`    | Reveal night results                     |
| `game:player_eliminated` | `{ playerId, role, cause }`            | Day vote elimination                     |
| `game:vote_update`       | `{ tallies }`                          | Live vote tally during voting            |
| `game:over`              | `{ winner, finalRoles, ghostChatLog }` | Game ended                               |
| `chat:message`           | `{ channel, message }`                 | New chat message                         |
| `chat:rate_limited`      | `{ channel, retryAfter }`              | Rate limit hit                           |
| `seer:result`            | `{ targetId, isWolf }`                 | Private to Seer at dawn                  |
| `error`                  | `{ code, message }`                    | Generic error                            |

## Validation Rules

Every server-bound event passes through validation before reaching the engine:

- JWT valid + not expired
- Player exists in a room
- Player is in the correct phase for the action
- Player is alive (for gameplay actions)
- Player has the required role (for role-specific actions)
- Target is valid (exists, alive, not self where applicable)
- Rate limit not exceeded (for chat)

---

# 18. REST API

## Endpoints

### `POST /auth/guest`

**Body:** `{ displayName: string }`
**Response:** `{ token: string, playerId: string }`

### `POST /rooms`

**Auth:** Required
**Body:** `{ }`
**Response:** `{ roomCode: string }`

### `GET /rooms/:code`

**Auth:** Required
**Response:** `{ exists: boolean, phase: string, playerCount: number, canJoin: boolean }`
Used by client to validate a room code before attempting socket join.

### `GET /health`

**Response:** `{ status: "ok", uptime: number, activeGames: number }`

---

# 19. Database

PostgreSQL. Used only for **post-game analytics and history**. No live game state.

## Schema

### `game_logs`

| Column             | Type                          | Notes                   |
| ------------------ | ----------------------------- | ----------------------- |
| `id`               | `uuid` PK                     |                         |
| `room_code`        | `varchar(6)`                  |                         |
| `started_at`       | `timestamptz`                 |                         |
| `ended_at`         | `timestamptz`                 |                         |
| `duration_seconds` | `int`                         |                         |
| `winner`           | `varchar(16)`                 | `wolves` \| `villagers` |
| `total_rounds`     | `int`                         |                         |
| `player_count`     | `int`                         |                         |
| `created_at`       | `timestamptz` default `now()` |                         |

**Indexes:** `created_at`, `winner`

### `game_players`

| Column             | Type                                         | Notes                                     |
| ------------------ | -------------------------------------------- | ----------------------------------------- |
| `id`               | `uuid` PK                                    |                                           |
| `game_id`          | `uuid` FK → `game_logs.id` ON DELETE CASCADE |                                           |
| `player_id`        | `uuid`                                       | not FK (no users table)                   |
| `display_name`     | `varchar(20)`                                |                                           |
| `role`             | `varchar(16)`                                |                                           |
| `outcome`          | `varchar(16)`                                | `survived` \| `killed_night` \| `lynched` |
| `eliminated_round` | `int` nullable                               |                                           |

**Indexes:** `game_id`, `player_id`

### `game_chat_logs`

| Column        | Type                                         | Notes                        |
| ------------- | -------------------------------------------- | ---------------------------- |
| `id`          | `bigserial` PK                               |                              |
| `game_id`     | `uuid` FK → `game_logs.id` ON DELETE CASCADE |                              |
| `channel`     | `varchar(16)`                                | `day` \| `ghost` \| `system` |
| `sender_id`   | `uuid` nullable                              | null for system              |
| `sender_name` | `varchar(20)`                                | denormalized snapshot        |
| `text`        | `text`                                       |                              |
| `sent_at`     | `timestamptz`                                |                              |

**Indexes:** `(game_id, sent_at)`

### Write Strategy

- All writes happen on `GAME_OVER` in a single transaction
- Failure to write does NOT block returning players to lobby (logged + alerted)

---

# 20. Failure Handling

## Server Restart

- All active games are lost
- Connected clients receive `connect_error` and show a "Server restarted, please rejoin" screen
- Acceptable MVP tradeoff — no recovery logic

## Deployment Constraint

- **Single Node.js process** required for MVP
- Deploy as single ECS task (or single Node container)
- **No horizontal scaling** until Redis-backed state is added (Phase 2)
- ALB health check on `GET /health`

## Memory Cleanup

- Game state deleted from memory immediately after `GAME_OVER` is committed to DB
- Empty rooms cleaned up after 2h inactivity
- Orphaned player → room mappings cleaned up on disconnect

## Crash Recovery

- Use `pm2` or container restart policy for process-level recovery
- All in-memory state intentionally lost on crash

---

# 21. Security Rules

- All actions are validated server-side
- Client sends intent only — server is authoritative
- JWT required for all socket and REST calls
- No self-voting in day phase
- No self-inspection by Seer
- Wolves cannot vote to kill other wolves
- Dead players cannot perform any gameplay action
- Players cannot perform actions outside their assigned role
- Players cannot perform actions outside the current phase
- Spectators cannot send any chat or perform any action
- Rate limiting on chat (§13)
- Rate limiting on REST endpoints: 30 req/min per IP
- Input sanitization on all string inputs (display name, chat text)
- HTML/script tags stripped from chat messages

---

# 22. Observability

## Metrics (exposed via `GET /metrics` for Prometheus)

- `werewolf_active_rooms_total`
- `werewolf_active_games_total`
- `werewolf_connected_players_total`
- `werewolf_game_duration_seconds` (histogram)
- `werewolf_disconnect_total` (counter)
- `werewolf_phase_transition_errors_total`

## Logging

- Structured JSON logs (Pino)
- Log levels: `error`, `warn`, `info`, `debug`
- Log every phase transition with `roomCode`, `round`, `phase`
- Log every disconnect/reconnect with `playerId`, `roomCode`
- Never log JWT tokens or chat content

---

# 23. UI / Frontend

**Stack:** React 18 + Vite + TypeScript + Socket.IO client + TailwindCSS + Zustand (state)

## Screens

### 1. Landing Screen

- Centered logo + tagline
- Display name input
- Two buttons: **"Create Room"** and **"Join Room"**
- "Join Room" reveals a 6-char code input
- Footer: rules link, GitHub link

### 2. Lobby Screen

- **Header:** room code (large, copyable) + leave button
- **Left panel:** player list (avatars + names + ready indicators)
- **Right panel:** spectator list
- **Settings panel (host only, collapsible):** sliders for night / day discussion / voting durations with live min-max validation. Read-only view for non-hosts.
- **Chat:** lobby chat at the bottom (uses day channel pre-game)
- **Bottom bar:**
  - Player: "Ready" toggle button
  - Host: "Start Game" button (disabled until ≥4 players)
- Visual: warm tavern theme — wood textures, candlelight, parchment

### 3. Role Reveal Screen

- Full-screen card flip animation
- Shows role icon + name + brief ability description
- "Tap to continue" → enters game UI
- For wolves: also shows other wolves' names

### 4. Night Screen

- **Background:** dark blue/purple, moon, stars
- **Phase indicator:** "🌙 Night — 0:45" countdown
- **Center area:** role-specific UI:
  - **Wolf:** grid of living non-wolf players (tap to vote) + wolf chat panel + live vote tally
  - **Seer:** grid of living players (tap to inspect, excludes self and previously inspected)
  - **Doctor:** grid of living players (tap to protect, excludes last-protected)
  - **Villager:** "You are sleeping..." with animated Z's
- **Footer:** "Action submitted ✓" indicator

### 5. Dawn Screen (5s)

- Sunrise animation
- Centered text: "X was found dead. They were a [role]."
- OR: "Nobody died last night."
- Auto-advances

### 6. Day Discussion Screen

- **Background:** bright daylight theme
- **Phase indicator:** "☀️ Day — 2:30"
- **Left panel:** player list (alive + dead with strikethrough)
  - Dead players show their revealed role
  - Crown icon next to host (if relevant)
- **Center:** large day chat
- **Right panel (for dead players only):** ghost chat
- **Bottom:** "Skip to Vote" button (shows X/Y voted to skip)

### 7. Day Voting Screen

- **Phase indicator:** "🗳️ Voting — 0:25"
- **Center:** grid of living player cards
- Tap a card to vote — highlighted with your vote
- Each card shows live vote count + voter avatars stacked
- "Retract Vote" button if already voted

### 8. Day Result Screen (5s)

- "X was lynched. They were a [role]."
- OR: "The vote was tied. Nobody was lynched."
- Auto-advances

### 9. Game Over Screen

- Big banner: "🐺 Wolves Win!" or "👤 Villagers Win!"
- Full role reveal grid
- Ghost chat history (collapsible)
- Wolf chat history is **hidden**
- Buttons: "Return to Lobby" (host) / "Leave"

### 10. Reconnecting Overlay

- Modal overlay over current screen
- Spinner + "Reconnecting... (Xs)"
- Cancel button → returns to landing

## Component Architecture

```
src/
├── components/
│   ├── lobby/
│   │   ├── PlayerList.tsx
│   │   ├── SpectatorList.tsx
│   │   └── ReadyButton.tsx
│   ├── game/
│   │   ├── PhaseHeader.tsx
│   │   ├── PlayerGrid.tsx
│   │   ├── RoleCard.tsx
│   │   ├── VotePanel.tsx
│   │   └── ChatPanel.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── CountdownTimer.tsx
├── screens/
│   ├── Landing.tsx
│   ├── Lobby.tsx
│   ├── Game.tsx
│   └── GameOver.tsx
├── stores/
│   ├── authStore.ts
│   ├── roomStore.ts
│   └── gameStore.ts
├── socket/
│   ├── client.ts
│   ├── events.ts
│   └── handlers.ts
└── App.tsx
```

## State Management

- **Zustand** stores for:
  - `authStore` — JWT, playerId, displayName
  - `roomStore` — current room, players, spectators
  - `gameStore` — game state, phase, role, chat logs
- All stores are updated by socket event handlers — components only read from stores
- Server is the source of truth; client never mutates game state locally

## Responsive Design

- Mobile-first
- Min supported width: 360px
- Desktop layout uses three-column for lobby/game; mobile collapses to tabs

## Accessibility

- All buttons keyboard-navigable
- Color is never the only signal (use icons + text)
- Screen reader labels on player cards
- Reduced-motion mode disables animations

---

# 24. Roadmap

## Phase 1 (MVP — this doc)

- Core gameplay loop
- 4 roles (Werewolf, Seer, Doctor, Villager)
- Chat (day, wolf, ghost)
- Reconnect handling
- Spectators
- PostgreSQL game logging
- Single-instance deployment

## Phase 2

- Redis-backed state for horizontal scaling
- More roles (Hunter, Witch, Cupid)
- Replay system (load game from DB)
- User accounts (optional, JWT upgrade)
- Profanity filter

## Phase 3

- Voice chat (LiveKit)
- Custom room rules (timer overrides, role bans)
- Friends + invites
- Stats / leaderboards

---

# 25. Open Questions

1. Should display names be moderated? **Deferred to Phase 2.**
2. Should we show role distribution to players in the lobby? **Default: yes** — fairness/transparency.

## Resolved Decisions (v2.2)

- Night phase **does not** end early when all actions are submitted — always runs full duration to prevent timing leaks.
- Host **can** configure phase timer durations in the lobby (Phase 1 scope, see §5).

---

# 26. Final Notes

This MVP is optimized for:

- **Fast development** — single Node process, no Redis, no auth complexity
- **Low infra cost** — runs on a single small ECS task
- **Strong gameplay integrity** — server-authoritative, validated everywhere
- **Easy iteration** — pure-function game engine is unit-testable end-to-end

Future scaling path is clear: extract state to Redis, add user accounts, shard by room code.

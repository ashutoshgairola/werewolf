# 🐺 Werewolf

> A browser-based real-time social deduction game for 4–10 players. No accounts. No downloads. Just lies, deduction, and the occasional wolf howl.

**Vibe coded** — designed and built entirely through AI-assisted development. Every line of code, every architectural decision, and every dark atmospheric particle was conjured through conversation.

---

## What is this?

Werewolf is the classic party game where a hidden group of **werewolves** tries to eliminate the village before the **villagers** figure out who's who. Each night the wolves hunt. Each day the village debates, accuses, and votes someone out. Someone is always lying.

Play it in your browser with friends. No signup required — just pick a name, share a room code, and go.

---

## Roles

| Role | Faction | Night Ability |
| ---- | ------- | ------------- |
| 🐺 Werewolf | Wolves | Vote to kill a villager (secretly, with your pack) |
| 🔮 Seer | Villagers | Inspect one player — learn if they're a wolf or not |
| 💉 Doctor | Villagers | Protect one player from being killed |
| 👤 Villager | Villagers | None — your weapon is your voice |

**Win conditions:**

- Wolves win when they equal or outnumber the villagers
- Villagers win when all wolves are eliminated

---

## Game Loop

```text
Role Reveal → Night → Dawn → Day Discussion → Day Vote → Day Result → Night → ...
```

- **Night** always runs its full duration — wolves can't tip their hand by ending early
- **Night 1** is peaceful — wolves coordinate but can't kill (gives everyone a chance to read the table)
- **Dawn** reveals who (if anyone) died in the night
- **Day** is open discussion — anyone can say anything, most of it will be lies
- **Vote** to eliminate a suspect — majority wins, tie means nobody goes
- **Dead players** join the ghost channel and watch the chaos unfold

---

## Features

- Real-time multiplayer via WebSockets (Socket.IO)
- No accounts — guest-only with JWT session tokens
- 4–10 players + up to 20 spectators per room
- Role-specific atmospheric UI themes (werewolf gets blood-red, seer gets deep blue, etc.)
- Sound effects for every game moment — role reveals, wolf howls, dawn bells, elimination stings
- Ghost chat — dead players watch and gossip separately from the living
- Reconnect handling — disconnect mid-game and rejoin without losing your role
- Host-configurable phase timers
- Game history logged to PostgreSQL

---

## Tech Stack

| Layer | Tech |
| ----- | ---- |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Zustand |
| Backend | Node.js + TypeScript + Express + Socket.IO |
| Database | PostgreSQL (game logs only — live state is in-memory) |
| Reverse proxy | Nginx (serves frontend + proxies API + WebSocket) |

---

## Running locally

**Prerequisites:** Node.js 20+, PostgreSQL running locally

```bash
# Backend
cd backend
cp .env.example .env       # fill in DATABASE_URL, JWT_SECRET
npm install
npm run dev                # runs on :3000

# Frontend (new terminal)
cd frontend
npm install
npm run dev                # runs on :5173, proxies API to :3000
```

---

## Running with Docker (recommended for production)

Everything runs in three containers — Postgres, backend, and an nginx container that serves the frontend and proxies the backend.

```bash
cp .env.example .env
# Edit .env:
#   POSTGRES_PASSWORD=something_strong
#   JWT_SECRET=$(openssl rand -hex 64)

docker compose up -d --build
```

The game will be live at `http://localhost` (or whatever `PORT` you set in `.env`).

**Services:**

| Service | Exposed | Description |
| ------- | ------- | ----------- |
| `frontend` | `:80` (host) | Nginx — serves static files + proxies to backend |
| `backend` | internal only | Node.js API + WebSocket server |
| `db` | internal only | PostgreSQL 16, data in named volume |

The database schema is created automatically on first start via `db/init.sql`.

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
| -------- | ----------- |
| `POSTGRES_USER` | Postgres username |
| `POSTGRES_PASSWORD` | Postgres password — make it strong |
| `JWT_SECRET` | Secret for signing JWTs — generate with `openssl rand -hex 64` |
| `LOG_LEVEL` | `trace` / `debug` / `info` / `warn` / `error` (default: `info`) |
| `PORT` | Host port for nginx (default: `80`) |

---

## Project structure

```text
werewolf/
├── backend/
│   ├── src/
│   │   ├── auth/        # Guest JWT auth
│   │   ├── room/        # Room lifecycle, lobby, host
│   │   ├── game/        # Game engine, orchestrator, timer loop
│   │   ├── chat/        # Chat channels + rate limiting
│   │   ├── db/          # PostgreSQL client + game log writes
│   │   └── shared/      # Logger, middleware, types
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── screens/     # Landing, Lobby, Game, GameOver
│   │   ├── components/  # Reusable game UI components
│   │   ├── hooks/       # useRoleTheme, useSoundManager, etc.
│   │   ├── stores/      # Zustand stores (auth, room, game)
│   │   ├── socket/      # Socket.IO client + event handlers
│   │   └── theme/       # Role atmosphere overlay + sound config
│   ├── public/sounds/   # Local sound effect assets
│   ├── nginx/           # Production nginx config
│   └── Dockerfile
├── db/
│   └── init.sql         # Schema — auto-run on first Postgres start
├── docker-compose.yml
└── .env.example
```

---

## Architecture notes

- **Server-authoritative** — the client sends intent, the server decides what happens. No client-side game logic is trusted.
- **In-memory game state** — live games live in a `Map` on the Node process. Fast, simple, and intentionally not persistent. A server restart ends active games (acceptable for an MVP on a single machine).
- **Pure game engine** — all game logic (`resolveNight`, `resolveVoting`, `checkWin`) is pure functions with no I/O. Randomness is injected. Easy to reason about.
- **Single process** — no Redis, no clustering. Runs fine for hundreds of concurrent games on one server. Horizontal scaling is the Phase 2 problem.
- **PostgreSQL for history only** — game results, player outcomes, and chat logs are written in a single transaction when a game ends. The database is never in the hot path during gameplay.

---

## Observability

Prometheus metrics at `GET /metrics`:

- `werewolf_active_rooms_total`
- `werewolf_active_games_total`
- `werewolf_connected_players_total`
- `werewolf_game_duration_seconds` (histogram)
- `werewolf_disconnect_total`

Structured JSON logs via Pino — set `LOG_LEVEL=debug` to see every phase transition and socket event.

---

## Roadmap

- **Phase 2:** Redis-backed state for horizontal scaling, more roles (Hunter, Witch, Cupid), replay system, user accounts
- **Phase 3:** Voice chat, custom room rules, stats and leaderboards

---

*Vibe coded with Claude. The wolves were the AI's idea.*

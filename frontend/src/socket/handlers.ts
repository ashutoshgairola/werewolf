import type { Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { disconnectSocket } from './client'
import type {
  RoomState,
  RoomPlayer,
  GameSettings,
  Role,
  Faction,
  ChatMessage,
  GameSnapshot,
  GamePhase,
} from '@/types/game'
import { ErrorCodes } from '@/types/game'
import { playSound } from '@/hooks/useSoundManager'
import { PHASE_SOUNDS, GAME_OVER_SOUNDS } from '@/theme/roleThemes'

let handlersRegistered = false

export function registerHandlers(socket: Socket): void {
  if (handlersRegistered) return
  handlersRegistered = true

  // ── Room events ──────────────────────────────────────────────────────────────

  socket.on('room:state', (room: RoomState) => {
    useRoomStore.getState().setRoom(room)
    // If room is back in LOBBY after a game, clear game state
    if (room.status === 'LOBBY') {
      useGameStore.getState().clearGame()
    }
  })

  socket.on('room:player_joined', ({ player }: { player: RoomPlayer }) => {
    useRoomStore.getState().addPlayer(player)
  })

  socket.on('room:player_left', ({ playerId }: { playerId: string }) => {
    useRoomStore.getState().removePlayer(playerId)
  })

  socket.on('room:host_changed', ({ newHostId }: { newHostId: string }) => {
    useRoomStore.getState().setHost(newHostId)
  })

  socket.on('room:settings_updated', ({ settings }: { settings: GameSettings }) => {
    useRoomStore.getState().updateSettings(settings)
  })

  // ── Game events ──────────────────────────────────────────────────────────────

  socket.on('game:started', () => {
    // Backend emits game:role_assigned BEFORE game:started, so we must NOT
    // call clearGame() here — that would wipe the role that was just set.
    // Instead, initialize alive from current room players (all start alive)
    // and reset only per-game counters/logs.
    const roomPlayers = useRoomStore.getState().players
    useGameStore.setState({
      alive: roomPlayers.map((p) => p.playerId),
      dayVotes: {},
      dayVoteTallies: {},
      wolfTally: {},
      skipVote: { skipCount: 0, aliveCount: roomPlayers.length },
      dawnInfo: null,
      lynchedPlayerId: null,
      seerResults: [],
      seerInspectedTargets: [],
      doctorLastProtected: null,
      chatLogs: { day: [], wolf: [], ghost: [], system: [] },
      winner: null,
      roles: {},
      players: roomPlayers.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        isAlive: true,
        connectionStatus: p.connectionStatus,
        isAfk: false,
        disconnectedAt: p.disconnectedAt,
        outcome: null,
        eliminatedRound: null,
      })),
      round: 1,
    })
  })

  socket.on('game:role_assigned', ({ role, knownAllies }: { role: Role; knownAllies?: string[] }) => {
    useGameStore.getState().setRole(role, knownAllies ?? [])
  })

  socket.on(
    'game:phase_change',
    ({ phase, endsAt, round }: { phase: string; endsAt: number | null; round: number }) => {
      useGameStore.getState().setPhase(phase as GamePhase, endsAt, round)
      useRoomStore.setState({ status: 'IN_GAME' })
      const soundKey = PHASE_SOUNDS[phase]
      if (soundKey) playSound(soundKey)
    }
  )

  socket.on('game:state_snapshot', (snapshot: GameSnapshot) => {
    useGameStore.getState().applySnapshot(snapshot)
    useRoomStore.setState({ status: 'IN_GAME' })
  })

  socket.on(
    'game:dawn',
    ({ killedPlayerId, role, doctorSaved }: { killedPlayerId: string | null; role?: Role; doctorSaved?: boolean }) => {
      const { round, roles } = useGameStore.getState()
      useGameStore.getState().setDawnInfo({ killedPlayerId, role, doctorSaved })
      if (killedPlayerId) {
        useGameStore.getState().markPlayerDead(killedPlayerId, 'killed_night', round)
        // Reveal the killed player's role so their card shows the icon
        if (role) {
          useGameStore.getState().setRoles({ ...roles, [killedPlayerId]: role })
        }
      }
      playSound(killedPlayerId ? 'death_toll' : 'dawn_bell')
    }
  )

  socket.on('game:you_were_killed', ({ killerNames }: { killerNames: string[] }) => {
    useGameStore.getState().setYouWereKilledBy(killerNames)
  })

  socket.on(
    'game:player_eliminated',
    ({ playerId, role }: { playerId: string; role: Role }) => {
      const { round, roles } = useGameStore.getState()
      useGameStore.getState().markPlayerDead(playerId, 'lynched', round)
      // Publicly reveal the lynched player's role (PRD §9: "role is publicly revealed")
      if (role) {
        useGameStore.getState().setRoles({ ...roles, [playerId]: role })
      }
      playSound('elimination')
    }
  )

  socket.on('game:vote_update', ({ tallies }: { tallies: Record<string, number> }) => {
    const prevTallies = useGameStore.getState().dayVoteTallies
    const prevTotal = Object.values(prevTallies).reduce((a, b) => a + b, 0)
    const newTotal = Object.values(tallies).reduce((a, b) => a + b, 0)
    if (newTotal > prevTotal) playSound('vote_thud')
    useGameStore.getState().setDayVoteTallies(tallies)
  })

  socket.on('game:wolf_vote_update', ({ tally }: { tally: Record<string, number> }) => {
    useGameStore.getState().setWolfTally(tally)
  })

  socket.on(
    'game:skip_vote_update',
    ({ skipCount, aliveCount }: { skipCount: number; aliveCount: number }) => {
      useGameStore.getState().setSkipVote(skipCount, aliveCount)
    }
  )

  socket.on(
    'game:over',
    ({
      winner,
      finalRoles,
      ghostChatLog,
    }: {
      winner: Faction | null
      finalRoles: Record<string, Role>
      ghostChatLog: ChatMessage[]
    }) => {
      useGameStore.getState().setGameOver(winner, finalRoles, ghostChatLog)
      useRoomStore.setState({ status: 'GAME_OVER' })
      if (winner) playSound(GAME_OVER_SOUNDS[winner])
    }
  )

  // ── Seer result ───────────────────────────────────────────────────────────────

  socket.on('seer:result', ({ targetId, isWolf }: { targetId: string; isWolf: boolean }) => {
    useGameStore.getState().addSeerResult(targetId, isWolf)
  })

  // ── Chat ──────────────────────────────────────────────────────────────────────

  socket.on('chat:message', ({ message }: { message: ChatMessage }) => {
    useGameStore.getState().addChatMessage(message)
  })

  socket.on('chat:rate_limited', (_payload: { channel: string; retryAfter: number }) => {
    // Handled by ChatPanel component via a local toast; no store update needed
    // We emit a custom DOM event that ChatPanel listens for
    window.dispatchEvent(new CustomEvent('chat:rate_limited', { detail: _payload }))
  })

  // ── Auth refresh ───────────────────────────────────────────────────────────────

  socket.on('auth:token_refreshed', ({ token }: { token: string }) => {
    useAuthStore.getState().setToken(token)
    // Update socket auth for next reconnect
    socket.auth = { token }
  })

  // ── Errors ────────────────────────────────────────────────────────────────────

  socket.on('error', ({ code, message }: { code: string; message: string }) => {
    if (code === ErrorCodes.PLAYER_KICKED) {
      disconnectSocket()
      useRoomStore.getState().clearRoom()
      useGameStore.getState().clearGame()
      // Dispatch event for Landing screen to show kick toast
      window.dispatchEvent(new CustomEvent('player:kicked', { detail: { message } }))
      return
    }
    // General errors dispatched for components to handle
    window.dispatchEvent(new CustomEvent('socket:error', { detail: { code, message } }))
  })

  // ── Reconnect tracking ────────────────────────────────────────────────────────

  socket.on('connect', () => {
    window.dispatchEvent(new CustomEvent('socket:connected'))
  })

  socket.on('disconnect', () => {
    window.dispatchEvent(new CustomEvent('socket:disconnected'))
  })

  socket.io.on('reconnect_attempt', () => {
    window.dispatchEvent(new CustomEvent('socket:reconnecting'))
  })

  socket.io.on('reconnect', () => {
    window.dispatchEvent(new CustomEvent('socket:connected'))
  })
}

export function resetHandlers(): void {
  handlersRegistered = false
}

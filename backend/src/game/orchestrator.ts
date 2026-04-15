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
      ? [...roles.entries()].filter(([, r]) => r === 'werewolf').map(([id]) => id).filter(id => id !== pid)
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
  if (!game || game.phase === 'GAME_OVER') return

  // Null out phaseEndsAt immediately to prevent double-advance if timer ticks overlap
  game.phaseEndsAt = null

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

      const resolution = resolveNight(game, game.nightActions, rand, room?.settings)

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

      // Send final tally before phase change so clients have it when rendering result screen
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

  // Persist to DB (non-blocking — failure must not block lobby return; abandoned games with null winner are not persisted)
  if (winner !== null) {
    writeGameResult(game).catch(err => {
      logger.error({ err, roomCode }, 'Failed to write game result to DB')
    })
  }

  // Mark surviving players' outcomes before deleting game state
  for (const p of game.players) {
    if (p.isAlive && p.outcome === null) {
      p.outcome = 'survived'
    }
  }

  // Delete game but keep room at GAME_OVER — host will explicitly return to lobby
  store.deleteGame(roomCode)
  const room = store.getRoom(roomCode)
  if (room) {
    room.status = 'GAME_OVER'
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
      broadcastWolfTally(game, io)
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

function broadcastWolfTally(game: GameState, io: Server): void {
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
  if (game.round === 1) return  // Night 1 is peaceful — wolves cannot kill

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

import { create } from 'zustand'
import type {
  GamePhase,
  Role,
  Faction,
  PlayerInGame,
  ChatMessage,
  ChatChannel,
  SeerResult,
  GameSnapshot,
} from '@/types/game'

interface DawnInfo {
  killedPlayerId: string | null
  role?: Role
  doctorSaved?: boolean
}

interface SkipVoteState {
  skipCount: number
  aliveCount: number
}

interface GameStoreState {
  phase: GamePhase | null
  round: number
  role: Role | null
  knownAllies: string[]          // playerId list (wolves only)
  players: PlayerInGame[]
  alive: string[]                // playerId list
  roles: Record<string, Role>    // playerId → role (only visible roles)
  dayVotes: Record<string, string>        // voterId → targetId (from snapshot)
  dayVoteTallies: Record<string, number>  // targetId → vote count (from live updates)
  wolfTally: Record<string, number>       // targetId → vote count
  skipVote: SkipVoteState
  daySkipVotes: string[]                  // playerIds who voted to skip (from snapshot)
  phaseStartedAt: number | null
  phaseEndsAt: number | null
  winner: Faction | null
  seerResults: SeerResult[]
  chatLogs: {
    day: ChatMessage[]
    wolf: ChatMessage[]
    ghost: ChatMessage[]
    system: ChatMessage[]
  }
  dawnInfo: DawnInfo | null
  youWereKilledBy: string[] | null  // wolf display names, private to the killed player
  lynchedPlayerId: string | null
  doctorLastProtected: string | null
  seerInspectedTargets: string[]
}

interface GameStoreActions {
  setPhase: (phase: GamePhase, phaseEndsAt: number | null, round: number) => void
  setRole: (role: Role, knownAllies?: string[]) => void
  updatePlayers: (players: PlayerInGame[]) => void
  markPlayerDead: (playerId: string, cause: 'killed_night' | 'lynched', round: number) => void
  setAlive: (alive: string[]) => void
  applySnapshot: (snapshot: GameSnapshot) => void
  addChatMessage: (message: ChatMessage) => void
  setDayVote: (voterId: string, targetId: string | null) => void  // optimistic local vote
  setDayVoteTallies: (tallies: Record<string, number>) => void   // incoming tally from server
  setWolfTally: (tally: Record<string, number>) => void
  setSkipVote: (skipCount: number, aliveCount: number) => void
  addDaySkipVote: (playerId: string) => void
  setDawnInfo: (info: DawnInfo) => void
  setYouWereKilledBy: (killerNames: string[]) => void
  addSeerResult: (targetId: string, isWolf: boolean) => void
  setGameOver: (winner: Faction | null, finalRoles: Record<string, Role>, ghostChatLog: ChatMessage[]) => void
  setRoles: (roles: Record<string, Role>) => void
  clearGame: () => void
}

const INITIAL_STATE: GameStoreState = {
  phase: null,
  round: 1,
  role: null,
  knownAllies: [],
  players: [],
  alive: [],
  roles: {},
  dayVotes: {},
  dayVoteTallies: {},
  wolfTally: {},
  skipVote: { skipCount: 0, aliveCount: 0 },
  daySkipVotes: [],
  phaseStartedAt: null,
  phaseEndsAt: null,
  winner: null,
  seerResults: [],
  chatLogs: { day: [], wolf: [], ghost: [], system: [] },
  dawnInfo: null,
  youWereKilledBy: null,
  lynchedPlayerId: null,
  doctorLastProtected: null,
  seerInspectedTargets: [],
}

export const useGameStore = create<GameStoreState & GameStoreActions>()((set) => ({
  ...INITIAL_STATE,

  setPhase: (phase, phaseEndsAt, round) =>
    set((state) => ({
      phase,
      phaseEndsAt,
      round,
      // Reset per-phase state
      dayVotes: phase === 'DAY_VOTING' ? {} : state.dayVotes,
      dayVoteTallies: phase === 'DAY_VOTING' ? {} : state.dayVoteTallies,
      wolfTally: phase === 'NIGHT' ? {} : state.wolfTally,
      skipVote: phase === 'DAY_DISCUSSION' ? { skipCount: 0, aliveCount: state.alive.length } : state.skipVote,
      daySkipVotes: phase === 'DAY_DISCUSSION' ? [] : state.daySkipVotes,
      // Clear dawn/kill info when entering NIGHT so stale banners can't reappear next round
      dawnInfo: phase === 'NIGHT' ? null : state.dawnInfo,
      youWereKilledBy: phase === 'NIGHT' ? null : state.youWereKilledBy,
      lynchedPlayerId: phase === 'DAY_RESULT' ? state.lynchedPlayerId : null,
    })),

  setRole: (role, knownAllies = []) => set({ role, knownAllies }),

  updatePlayers: (players) =>
    set({
      players,
      alive: players.filter((p) => p.isAlive).map((p) => p.playerId),
    }),

  markPlayerDead: (playerId, cause, round) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.playerId === playerId
          ? { ...p, isAlive: false, outcome: cause, eliminatedRound: round }
          : p
      ),
      alive: state.alive.filter((id) => id !== playerId),
      lynchedPlayerId: cause === 'lynched' ? playerId : state.lynchedPlayerId,
    })),

  setAlive: (alive) => set({ alive }),

  applySnapshot: (snapshot) =>
    set({
      phase: snapshot.phase,
      round: snapshot.round,
      phaseStartedAt: snapshot.phaseStartedAt,
      phaseEndsAt: snapshot.phaseEndsAt,
      players: snapshot.players,
      alive: snapshot.alive,
      roles: snapshot.roles,
      dayVotes: snapshot.dayVotes,
      dayVoteTallies: Object.entries(snapshot.dayVotes).reduce<Record<string, number>>((acc, [, targetId]) => {
        acc[targetId] = (acc[targetId] ?? 0) + 1
        return acc
      }, {}),
      skipVote: { skipCount: snapshot.daySkipVotes?.length ?? 0, aliveCount: snapshot.alive.length },
      daySkipVotes: snapshot.daySkipVotes ?? [],
      doctorLastProtected: snapshot.doctorLastProtected,
      seerInspectedTargets: snapshot.seerInspectedTargets,
      seerResults: snapshot.seerResults ?? [],
      wolfTally: snapshot.wolfTally ?? {},
      chatLogs: snapshot.chatLogs,
      winner: snapshot.winner,
      // Derive lynchedPlayerId from dayVotes when reconnecting during DAY_RESULT
      lynchedPlayerId: snapshot.phase === 'DAY_RESULT'
        ? (() => {
            const counts: Record<string, number> = {}
            for (const targetId of Object.values(snapshot.dayVotes)) {
              counts[targetId] = (counts[targetId] ?? 0) + 1
            }
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
            return sorted.length > 0 && (sorted.length === 1 || sorted[0][1] > sorted[1][1])
              ? sorted[0][0]
              : null
          })()
        : null,
    }),

  addChatMessage: (message) =>
    set((state) => {
      const channel = message.channel as ChatChannel
      // Deduplicate by messageId to prevent double-injection on reconnect
      if (state.chatLogs[channel].some((m) => m.messageId === message.messageId)) {
        return state
      }
      return {
        chatLogs: {
          ...state.chatLogs,
          [channel]: [...state.chatLogs[channel], message],
        },
      }
    }),

  setDayVote: (voterId, targetId) =>
    set((state) => {
      const next = { ...state.dayVotes }
      if (targetId === null) delete next[voterId]
      else next[voterId] = targetId
      return { dayVotes: next }
    }),

  // Server sends tallies as { targetId: count }
  setDayVoteTallies: (tallies) => set({ dayVoteTallies: tallies }),

  setWolfTally: (tally) => set({ wolfTally: tally }),

  setSkipVote: (skipCount, aliveCount) => set({ skipVote: { skipCount, aliveCount } }),

  addDaySkipVote: (playerId) =>
    set((state) => ({
      daySkipVotes: state.daySkipVotes.includes(playerId)
        ? state.daySkipVotes
        : [...state.daySkipVotes, playerId],
    })),

  setDawnInfo: (info) => set({ dawnInfo: info }),

  setYouWereKilledBy: (killerNames) => set({ youWereKilledBy: killerNames }),

  addSeerResult: (targetId, isWolf) =>
    set((state) => ({
      seerResults: [...state.seerResults, { targetId, isWolf }],
      seerInspectedTargets: [...state.seerInspectedTargets, targetId],
    })),

  setGameOver: (winner, finalRoles, ghostChatLog) =>
    set((state) => ({
      phase: 'GAME_OVER',
      winner,
      roles: finalRoles,
      phaseEndsAt: null,
      chatLogs: { ...state.chatLogs, ghost: ghostChatLog },
    })),

  setRoles: (roles) => set({ roles }),

  clearGame: () => set(INITIAL_STATE),
}))

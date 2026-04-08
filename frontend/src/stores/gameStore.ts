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
  setDayVoteTallies: (tallies: Record<string, number>) => void  // incoming tally from server
  setWolfTally: (tally: Record<string, number>) => void
  setSkipVote: (skipCount: number, aliveCount: number) => void
  setDawnInfo: (info: DawnInfo) => void
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
  phaseStartedAt: null,
  phaseEndsAt: null,
  winner: null,
  seerResults: [],
  chatLogs: { day: [], wolf: [], ghost: [], system: [] },
  dawnInfo: null,
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
      dawnInfo: phase !== 'DAWN' ? state.dawnInfo : state.dawnInfo,
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
      doctorLastProtected: snapshot.doctorLastProtected,
      seerInspectedTargets: snapshot.seerInspectedTargets,
      chatLogs: snapshot.chatLogs,
      winner: snapshot.winner,
    }),

  addChatMessage: (message) =>
    set((state) => ({
      chatLogs: {
        ...state.chatLogs,
        [message.channel]: [...state.chatLogs[message.channel as ChatChannel], message],
      },
    })),

  // Server sends tallies as { targetId: count }
  setDayVoteTallies: (tallies) => set({ dayVoteTallies: tallies }),

  setWolfTally: (tally) => set({ wolfTally: tally }),

  setSkipVote: (skipCount, aliveCount) => set({ skipVote: { skipCount, aliveCount } }),

  setDawnInfo: (info) => set({ dawnInfo: info }),

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

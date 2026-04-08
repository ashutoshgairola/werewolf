import { create } from 'zustand'
import type { RoomPlayer, GameSettings, RoomState } from '@/types/game'
import { DEFAULT_SETTINGS } from '@/types/game'

interface RoomStoreState {
  roomCode: string | null
  status: 'LOBBY' | 'IN_GAME' | 'GAME_OVER' | 'EXPIRED' | null
  hostId: string | null
  players: RoomPlayer[]
  spectators: RoomPlayer[]
  settings: GameSettings
}

interface RoomStoreActions {
  setRoom: (room: RoomState) => void
  addPlayer: (player: RoomPlayer) => void
  removePlayer: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<RoomPlayer>) => void
  setHost: (newHostId: string) => void
  updateSettings: (settings: GameSettings) => void
  clearRoom: () => void
}

const INITIAL_STATE: RoomStoreState = {
  roomCode: null,
  status: null,
  hostId: null,
  players: [],
  spectators: [],
  settings: DEFAULT_SETTINGS,
}

export const useRoomStore = create<RoomStoreState & RoomStoreActions>()((set) => ({
  ...INITIAL_STATE,

  setRoom: (room) =>
    set({
      roomCode: room.roomCode,
      status: room.status,
      hostId: room.hostId,
      players: room.players,
      spectators: room.spectators,
      settings: room.settings,
    }),

  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players.filter((p) => p.playerId !== player.playerId), player],
    })),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.playerId !== playerId),
      spectators: state.spectators.filter((p) => p.playerId !== playerId),
    })),

  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.playerId === playerId ? { ...p, ...updates } : p
      ),
      spectators: state.spectators.map((p) =>
        p.playerId === playerId ? { ...p, ...updates } : p
      ),
    })),

  setHost: (newHostId) =>
    set((state) => ({
      hostId: newHostId,
      players: state.players.map((p) => ({
        ...p,
        isHost: p.playerId === newHostId,
      })),
    })),

  updateSettings: (settings) => set({ settings }),

  clearRoom: () => set(INITIAL_STATE),
}))

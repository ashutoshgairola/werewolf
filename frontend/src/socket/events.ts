import { getSocket } from './client'
import type { ChatChannel, GameSettings } from '@/types/game'

export const socketEvents = {
  createRoom: () => {
    getSocket().emit('room:create')
  },

  joinRoom: (roomCode: string, asSpectator = false) => {
    getSocket().emit('room:join', { roomCode, asSpectator })
  },

  leaveRoom: () => {
    getSocket().emit('room:leave')
  },

  setReady: (ready: boolean) => {
    getSocket().emit('room:ready', { ready })
  },

  startGame: () => {
    getSocket().emit('room:start')
  },

  kickPlayer: (playerId: string) => {
    getSocket().emit('room:kick', { playerId })
  },

  updateSettings: (settings: Partial<GameSettings>) => {
    getSocket().emit('room:update_settings', settings)
  },

  wolfVote: (targetId: string) => {
    getSocket().emit('night:wolf_vote', { targetId })
  },

  seerInspect: (targetId: string) => {
    getSocket().emit('night:seer_inspect', { targetId })
  },

  doctorProtect: (targetId: string) => {
    getSocket().emit('night:doctor_protect', { targetId })
  },

  dayVote: (targetId: string | null) => {
    getSocket().emit('day:vote', { targetId })
  },

  skipToVote: () => {
    getSocket().emit('day:skip_to_vote')
  },

  sendChat: (channel: ChatChannel, text: string) => {
    getSocket().emit('chat:message', { channel, text })
  },

  returnToLobby: () => {
    getSocket().emit('room:return_to_lobby')
  },
}

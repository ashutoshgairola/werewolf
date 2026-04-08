import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

let socket: Socket | null = null

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token
    socket = io(API_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
    })
  }
  return socket
}

export function connectSocket(token: string): Socket {
  const s = getSocket()
  // Inject the latest token before connecting (re-sent automatically on reconnect)
  s.auth = { token }
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}

export function getSocketStatus(): 'connecting' | 'connected' | 'reconnecting' | 'disconnected' {
  if (!socket) return 'disconnected'
  if (socket.connected) return 'connected'
  return 'disconnected'
}

import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket } from '@/socket/client'
import { registerHandlers } from '@/socket/handlers'

export function useSocket(): Socket {
  const registered = useRef(false)
  const socket = getSocket()

  useEffect(() => {
    if (!registered.current) {
      registerHandlers(socket)
      registered.current = true
    }
  }, [socket])

  return socket
}

import { useState, useEffect } from 'react'
import type { SocketStatus } from '@/types/game'

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>('disconnected')

  useEffect(() => {
    const onConnected = () => setStatus('connected')
    const onDisconnected = () => setStatus('disconnected')
    const onReconnecting = () => setStatus('reconnecting')

    window.addEventListener('socket:connected', onConnected)
    window.addEventListener('socket:disconnected', onDisconnected)
    window.addEventListener('socket:reconnecting', onReconnecting)

    return () => {
      window.removeEventListener('socket:connected', onConnected)
      window.removeEventListener('socket:disconnected', onDisconnected)
      window.removeEventListener('socket:reconnecting', onReconnecting)
    }
  }, [])

  return status
}

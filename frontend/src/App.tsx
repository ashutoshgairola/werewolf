import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { useSocketStatus } from '@/hooks/useSocketStatus'
import { connectSocket } from '@/socket/client'
import { registerHandlers } from '@/socket/handlers'
import Landing from '@/screens/Landing'
import Lobby from '@/screens/Lobby'
import Game from '@/screens/Game'
import GameOver from '@/screens/GameOver'
import ReconnectingOverlay from '@/components/shared/ReconnectingOverlay'

export default function App() {
  const { token } = useAuthStore()
  const { roomCode, status: roomStatus } = useRoomStore()
  const { phase, winner } = useGameStore()
  const socketStatus = useSocketStatus()

  // On mount, if we have a valid stored token, reconnect the socket
  useEffect(() => {
    if (token) {
      const socket = connectSocket(token)
      registerHandlers(socket)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive current screen
  const screen = (() => {
    if (!token || !roomCode) return 'landing'
    if (phase === 'GAME_OVER' || winner !== null || roomStatus === 'GAME_OVER') return 'gameover'
    if (phase) return 'game'
    return 'lobby'
  })()

  return (
    <div className="overflow-hidden flex flex-col" style={{ height: '100dvh' }}>
      {screen === 'landing'  && <div key="landing"  className="screen-enter flex-1 min-h-0 flex flex-col"><Landing /></div>}
      {screen === 'lobby'    && <div key="lobby"    className="screen-enter flex-1 min-h-0 flex flex-col"><Lobby /></div>}
      {screen === 'game'     && <div key="game"     className="screen-enter flex-1 min-h-0 flex flex-col"><Game /></div>}
      {screen === 'gameover' && <div key="gameover" className="screen-enter flex-1 min-h-0 flex flex-col"><GameOver /></div>}
      {socketStatus === 'reconnecting' && <ReconnectingOverlay />}
    </div>
  )
}

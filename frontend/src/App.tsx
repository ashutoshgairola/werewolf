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
    <div className="min-h-screen">
      {screen === 'landing'  && <Landing />}
      {screen === 'lobby'    && <Lobby />}
      {screen === 'game'     && <Game />}
      {screen === 'gameover' && <GameOver />}
      {socketStatus === 'reconnecting' && <ReconnectingOverlay />}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { disconnectSocket } from '@/socket/client'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { useGameStore } from '@/stores/gameStore'
import { resetHandlers } from '@/socket/handlers'

export default function ReconnectingOverlay() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  function handleGiveUp() {
    disconnectSocket()
    resetHandlers()
    useAuthStore.getState().clearAuth()
    useRoomStore.getState().clearRoom()
    useGameStore.getState().clearGame()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/80 backdrop-blur-sm">
      <svg className="animate-spin h-12 w-12 text-candle mb-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="font-tavern text-parchment text-xl mb-1">Reconnecting...</p>
      <p className="text-parchment/60 text-sm mb-6">{elapsed}s elapsed</p>
      <button
        onClick={handleGiveUp}
        className="text-parchment/50 hover:text-parchment underline text-sm"
      >
        Give up and return to start
      </button>
    </div>
  )
}

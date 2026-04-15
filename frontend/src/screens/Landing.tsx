import { useState, useEffect } from 'react'
import { Button } from '@/components/shared/Button'
import { useAuthStore } from '@/stores/authStore'
import { useRoomStore } from '@/stores/roomStore'
import { connectSocket, disconnectSocket } from '@/socket/client'
import { registerHandlers, resetHandlers } from '@/socket/handlers'
import { socketEvents } from '@/socket/events'

const NAME_REGEX = /^[a-zA-Z0-9 ]{3,20}$/
const REST_BASE = import.meta.env.VITE_REST_BASE_URL ?? '/api'

export default function Landing() {
  const urlCode = new URLSearchParams(window.location.search).get('join')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) ?? ''

  const [displayName, setDisplayName] = useState('')
  const [joinCode, setJoinCode] = useState(urlCode)
  const [mode, setMode] = useState<'idle' | 'join'>(urlCode.length === 6 ? 'join' : 'idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [kickMessage, setKickMessage] = useState<string | null>(null)

  const setAuth = useAuthStore((s) => s.setAuth)
  const setRoom = useRoomStore((s) => s.setRoom)

  useEffect(() => {
    const onKick = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string }
      setKickMessage('You were kicked from the room.')
      setError(detail.message)
    }
    window.addEventListener('player:kicked', onKick)
    return () => window.removeEventListener('player:kicked', onKick)
  }, [])

  // Suppress unused setRoom warning — it's accessed via store
  void setRoom

  const nameError = displayName.length > 0 && !NAME_REGEX.test(displayName)
    ? 'Name must be 3–20 characters (letters, numbers, spaces)'
    : null

  async function authenticate(): Promise<string | null> {
    const res = await fetch(`${REST_BASE}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.trim() }),
    })
    if (!res.ok) {
      const body = await res.json() as { message?: string }
      throw new Error(body.message ?? 'Authentication failed')
    }
    const { token, playerId } = await res.json() as { token: string; playerId: string }
    setAuth(token, playerId, displayName.trim())
    // Always disconnect any stale socket so the new connection uses the fresh token/playerId.
    // Without this, a persisted non-expired token would have already connected with an old
    // playerId on mount (App.tsx), making hostId ≠ myId in the lobby.
    disconnectSocket()
    resetHandlers()
    const socket = connectSocket(token)
    registerHandlers(socket)
    return token
  }

  async function handleCreate() {
    if (!NAME_REGEX.test(displayName.trim())) return
    setLoading(true)
    setError(null)
    try {
      await authenticate()
      socketEvents.createRoom()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!NAME_REGEX.test(displayName.trim())) return
    if (joinCode.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      await authenticate()
      socketEvents.joinRoom(joinCode.trim().toUpperCase())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-center bg-parchment p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-3">🐺</div>
        <h1 className="font-tavern text-5xl text-wood-dark mb-2">Werewolf</h1>
        <p className="text-wood font-body italic text-lg">A game of deception and deduction</p>
      </div>

      {/* Card */}
      <div className="bg-parchment-light border-2 border-wood rounded-xl shadow-lg w-full max-w-sm p-7">
        {kickMessage && (
          <div className="bg-ember/10 border border-ember text-ember text-sm rounded p-3 mb-4">
            {kickMessage}
          </div>
        )}

        {/* Name input */}
        <div className="mb-5">
          <label className="block font-body text-wood-dark text-sm mb-1.5" htmlFor="display-name">
            Your Name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            placeholder="Enter your name..."
            className="w-full bg-parchment border border-wood rounded px-3 py-2 text-ink font-body focus:outline-none focus:ring-2 focus:ring-candle"
          />
          {nameError && (
            <p className="text-ember text-xs mt-1">{nameError}</p>
          )}
        </div>

        {/* Join code input (visible in join mode) */}
        {mode === 'join' && (
          <div className="mb-5">
            <label className="block font-body text-wood-dark text-sm mb-1.5" htmlFor="room-code">
              Room Code
            </label>
            <input
              id="room-code"
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="XXXXXX"
              className="w-full bg-parchment border border-wood rounded px-3 py-2 text-ink font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-candle"
            />
          </div>
        )}

        {error && !kickMessage && (
          <p className="text-ember text-sm mb-4">{error}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {mode === 'idle' ? (
            <>
              <Button
                onClick={handleCreate}
                disabled={!NAME_REGEX.test(displayName.trim())}
                loading={loading}
                size="lg"
                className="w-full"
              >
                🏠 Create Room
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setMode('join'); setError(null) }}
                size="lg"
                className="w-full"
              >
                🚪 Join Room
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleJoin}
                disabled={!NAME_REGEX.test(displayName.trim()) || joinCode.length !== 6}
                loading={loading}
                size="lg"
                className="w-full"
              >
                🚪 Join Room
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setMode('idle'); setJoinCode(''); setError(null) }}
                size="md"
                className="w-full"
              >
                ← Back
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="text-wood/50 text-xs mt-8">4–10 players • No signup required</p>
    </div>
  )
}

import { useState } from 'react'

interface RoomCodeDisplayProps {
  roomCode: string
}

export function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-wood text-sm font-body">Room Code</p>
      <button
        onClick={handleCopy}
        className="bg-parchment border-2 border-wood rounded-lg px-6 py-2 font-mono text-3xl font-bold tracking-widest text-wood-dark hover:bg-parchment-dark transition-colors"
        title="Click to copy"
      >
        {roomCode}
      </button>
      <span className={`text-xs transition-opacity ${copied ? 'opacity-100 text-candle-dim' : 'opacity-0'}`}>
        Copied!
      </span>
    </div>
  )
}

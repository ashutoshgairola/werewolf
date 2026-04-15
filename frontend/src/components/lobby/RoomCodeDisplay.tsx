import { useState } from 'react'

interface RoomCodeDisplayProps {
  roomCode: string
}

export function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  async function handleCopyCode() {
    await navigator.clipboard.writeText(roomCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 1500)
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}?join=${roomCode}`
    await navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 1500)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-wood text-sm font-body">Room Code</p>
      <button
        onClick={handleCopyCode}
        className="bg-parchment border-2 border-wood rounded-lg px-6 py-2 font-mono text-3xl font-bold tracking-widest text-wood-dark hover:bg-parchment-dark transition-colors"
        title="Click to copy code"
      >
        {roomCode}
      </button>
      <div className="flex items-center gap-3">
        <span className={`text-xs transition-opacity ${copiedCode ? 'opacity-100 text-candle-dim' : 'opacity-0'}`}>
          Code copied!
        </span>
        <button
          onClick={handleCopyLink}
          className="text-xs text-wood hover:text-wood-dark underline underline-offset-2 transition-colors"
          title="Copy invite link"
        >
          {copiedLink ? '✓ Link copied!' : '🔗 Copy invite link'}
        </button>
      </div>
    </div>
  )
}

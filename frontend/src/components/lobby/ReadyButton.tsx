import { useRoomStore } from '@/stores/roomStore'
import { useAuthStore } from '@/stores/authStore'
import { socketEvents } from '@/socket/events'
import { Button } from '@/components/shared/Button'

export function ReadyButton() {
  const players = useRoomStore((s) => s.players)
  const myId = useAuthStore((s) => s.playerId)
  const me = players.find((p) => p.playerId === myId)
  const isReady = me?.isReady ?? false

  function toggle() {
    socketEvents.setReady(!isReady)
  }

  return (
    <Button
      variant={isReady ? 'secondary' : 'primary'}
      size="lg"
      className="w-full"
      onClick={toggle}
    >
      {isReady ? '✓ Ready' : 'Ready Up'}
    </Button>
  )
}

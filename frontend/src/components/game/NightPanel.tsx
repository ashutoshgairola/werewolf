import type { Role } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { WolfNightPanel } from './WolfNightPanel'
import { SeerNightPanel } from './SeerNightPanel'
import { DoctorNightPanel } from './DoctorNightPanel'
import { VillagerNightPanel } from './VillagerNightPanel'
import { ChatPanel } from './ChatPanel'

function NightRoleContent({ role }: { role: Role | null }) {
  switch (role) {
    case 'werewolf': return <WolfNightPanel />
    case 'seer':     return <SeerNightPanel />
    case 'doctor':   return <DoctorNightPanel />
    default:         return <VillagerNightPanel />
  }
}

export function NightPanel() {
  const role = useGameStore((s) => s.role)
  const isWolf = role === 'werewolf'

  if (isWolf) {
    return (
      <div className="w-full h-full flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        {/* Role content — fixed height, doesn't push chat up */}
        <div className="flex-shrink-0 overflow-y-auto px-3 py-3">
          <NightRoleContent role={role} />
        </div>
        {/* Pack chat — fills remaining space; input stays anchored at bottom */}
        <div className="flex-1 min-h-0 border-t border-white/10">
          <ChatPanel sendChannel="wolf" canSend={true} />
        </div>
      </div>
    )
  }

  return (
    // Non-wolf: centered content, no chat
    <div className="w-full h-full flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          <NightRoleContent role={role} />
        </div>
      </div>
    </div>
  )
}

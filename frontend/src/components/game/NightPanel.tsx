import type { Role } from '@/types/game'
import { useGameStore } from '@/stores/gameStore'
import { PhaseHeader } from './PhaseHeader'
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
      // Wolf: role actions left | pack chat right
      // Mobile: stacked — actions on top, pack chat strip below
      <div className="flex-1 min-h-0 flex flex-col bg-moon" style={{ position: 'relative', zIndex: 1 }}>
        <PhaseHeader />
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-3 p-3">
          {/* Role actions — shrink-to-content on mobile, fill on desktop */}
          <div className="min-h-0 overflow-y-auto sm:flex-1">
            <NightRoleContent role={role} />
          </div>
          {/* Pack chat — 36vh strip on mobile, right column on desktop */}
          <div className="h-[36vh] sm:h-auto sm:w-64 lg:w-72 flex-shrink-0 min-h-0">
            <ChatPanel visibleChannels={['wolf']} defaultChannel="wolf" />
          </div>
        </div>
      </div>
    )
  }

  return (
    // Non-wolf: centered content, no chat
    <div className="flex-1 min-h-0 flex flex-col bg-moon" style={{ position: 'relative', zIndex: 1 }}>
      <PhaseHeader />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          <NightRoleContent role={role} />
        </div>
      </div>
    </div>
  )
}

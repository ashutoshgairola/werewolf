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
        {/* Mobile: role content scrolls naturally above fixed chat strip */}
        {/* Desktop: side-by-side columns */}
        <div className="flex-1 min-h-0 flex flex-col sm:flex-row sm:gap-3 sm:p-3 overflow-hidden">
          {/* Role actions */}
          <div className="overflow-y-auto p-3 sm:p-0 sm:flex-1 sm:min-h-0">
            <NightRoleContent role={role} />
          </div>
          {/* Pack chat — fixed height strip on mobile, right column on desktop */}
          <div className="h-[40vh] flex-shrink-0 sm:h-auto sm:w-64 lg:w-72 sm:min-h-0 border-t border-white/10 sm:border-t-0">
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

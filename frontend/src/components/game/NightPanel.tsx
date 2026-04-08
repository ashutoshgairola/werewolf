import { useGameStore } from '@/stores/gameStore'
import { PhaseHeader } from './PhaseHeader'
import { WolfNightPanel } from './WolfNightPanel'
import { SeerNightPanel } from './SeerNightPanel'
import { DoctorNightPanel } from './DoctorNightPanel'
import { VillagerNightPanel } from './VillagerNightPanel'
import { ChatPanel } from './ChatPanel'

export function NightPanel() {
  const role = useGameStore((s) => s.role)
  const isWolf = role === 'werewolf'

  function RoleContent() {
    switch (role) {
      case 'werewolf': return <WolfNightPanel />
      case 'seer':     return <SeerNightPanel />
      case 'doctor':   return <DoctorNightPanel />
      default:         return <VillagerNightPanel />
    }
  }

  if (isWolf) {
    return (
      <div className="min-h-screen bg-moon flex flex-col">
        <PhaseHeader />
        <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto w-full overflow-hidden">
          <div className="flex-1 min-w-0">
            <RoleContent />
          </div>
          <div className="md:w-72 min-h-48" style={{ height: 'calc(100vh - 120px)' }}>
            <ChatPanel visibleChannels={['wolf']} defaultChannel="wolf" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-moon flex flex-col">
      <PhaseHeader />
      <div className="flex-1 p-4 md:p-6 max-w-lg mx-auto w-full">
        <RoleContent />
      </div>
    </div>
  )
}

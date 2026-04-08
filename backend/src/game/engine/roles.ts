import type { Role } from '../../shared/types'

interface RoleDistribution {
  wolves: number
  seer: number
  doctor: number
}

const DISTRIBUTION: Record<number, RoleDistribution> = {
  4:  { wolves: 1, seer: 1, doctor: 0 },
  5:  { wolves: 1, seer: 1, doctor: 1 },
  6:  { wolves: 2, seer: 1, doctor: 1 },
  7:  { wolves: 2, seer: 1, doctor: 1 },
  8:  { wolves: 2, seer: 1, doctor: 1 },
  9:  { wolves: 3, seer: 1, doctor: 1 },
  10: { wolves: 3, seer: 1, doctor: 1 },
}

/**
 * Assigns roles to players using the PRD distribution table.
 * @param randFn Injected randomizer: randFn(n) returns an integer in [0, n)
 */
export function assignRoles(
  playerIds: string[],
  randFn: (max: number) => number
): Map<string, Role> {
  const n = playerIds.length
  const dist = DISTRIBUTION[n]
  if (!dist) throw new Error(`Unsupported player count: ${n}`)

  const villagerCount = n - dist.wolves - dist.seer - dist.doctor
  const roles: Role[] = [
    ...Array<Role>(dist.wolves).fill('werewolf'),
    ...Array<Role>(dist.seer).fill('seer'),
    ...Array<Role>(dist.doctor).fill('doctor'),
    ...Array<Role>(villagerCount).fill('villager'),
  ]

  // Fisher-Yates shuffle with injected RNG
  for (let i = roles.length - 1; i > 0; i--) {
    const j = randFn(i + 1)
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }

  const assignment = new Map<string, Role>()
  for (let i = 0; i < playerIds.length; i++) {
    assignment.set(playerIds[i], roles[i])
  }
  return assignment
}

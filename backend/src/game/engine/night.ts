import type {
  GameState,
  NightActionsState,
  NightAction,
  NightResolution,
  ValidationResult,
} from '../../shared/types'
import { ErrorCodes } from '../../shared/errors'

export function validateNightAction(
  state: GameState,
  playerId: string,
  action: NightAction
): ValidationResult {
  if (state.phase !== 'NIGHT') {
    return { valid: false, errorCode: ErrorCodes.INVALID_PHASE }
  }
  if (!state.alive.has(playerId)) {
    return { valid: false, errorCode: ErrorCodes.PLAYER_DEAD }
  }

  const role = state.roles.get(playerId)
  const { targetId } = action

  if (!state.alive.has(targetId)) {
    return { valid: false, errorCode: ErrorCodes.INVALID_TARGET }
  }

  switch (action.type) {
    case 'wolf_vote': {
      if (role !== 'werewolf') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (state.roles.get(targetId) === 'werewolf') {
        return { valid: false, errorCode: ErrorCodes.WOLF_TARGETING_WOLF }
      }
      break
    }
    case 'seer_inspect': {
      if (role !== 'seer') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (targetId === playerId) return { valid: false, errorCode: ErrorCodes.SELF_TARGET }
      if (state.seerInspectedTargets.has(targetId)) {
        return { valid: false, errorCode: ErrorCodes.ALREADY_INSPECTED }
      }
      break
    }
    case 'doctor_protect': {
      if (role !== 'doctor') return { valid: false, errorCode: ErrorCodes.WRONG_ROLE }
      if (state.doctorLastProtected === targetId) {
        return { valid: false, errorCode: ErrorCodes.CONSECUTIVE_PROTECT }
      }
      break
    }
  }

  return { valid: true }
}

/**
 * Resolves all night actions in order: doctor protect → wolf vote → kill → seer inspect.
 * Round 1 behaviour is controlled by settings.wolvesCanKillRound1 / settings.seerCanActRound1.
 * @param randFn Injected randomizer for wolf vote tie-breaking
 * @param settings Optional room settings (falls back to defaults if omitted)
 */
export function resolveNight(
  state: GameState,
  actions: NightActionsState,
  randFn: (max: number) => number,
  settings?: { wolvesCanKillRound1: boolean; seerCanActRound1: boolean }
): NightResolution {
  const doctorProtect = actions.doctorTarget

  const wolvesCanKill = state.round > 1 || (settings?.wolvesCanKillRound1 ?? false)
  let killTarget: string | null = null
  if (wolvesCanKill) {
    killTarget = talliedWolfTarget(actions.wolfVotes, randFn)
  }

  // Resolve kill vs protection
  const killedPlayerId =
    killTarget !== null && killTarget !== doctorProtect ? killTarget : null

  // Seer result — blocked on round 1 if setting disabled
  const seerCanAct = state.round > 1 || (settings?.seerCanActRound1 ?? true)
  let seerResult: NightResolution['seerResult'] = null
  if (seerCanAct && actions.seerTarget !== null) {
    seerResult = {
      targetId: actions.seerTarget,
      isWolf: state.roles.get(actions.seerTarget) === 'werewolf',
    }
  }

  return {
    killedPlayerId,
    seerResult,
    doctorSaved: killTarget !== null && killTarget === doctorProtect,
  }
}

function talliedWolfTarget(
  wolfVotes: Map<string, string>,
  randFn: (max: number) => number
): string | null {
  if (wolfVotes.size === 0) return null

  const tally = new Map<string, number>()
  for (const targetId of wolfVotes.values()) {
    tally.set(targetId, (tally.get(targetId) ?? 0) + 1)
  }

  const maxVotes = Math.max(...tally.values())
  const topTargets = [...tally.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  return topTargets[randFn(topTargets.length)]
}

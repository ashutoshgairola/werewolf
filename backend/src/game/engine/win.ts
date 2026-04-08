import type { GameState, WinResult } from '../../shared/types'

/**
 * Checks win conditions against alive players.
 * Wolves win: wolfCount >= nonWolfCount (parity rule).
 * Villagers win: wolfCount === 0.
 */
export function checkWin(state: GameState): WinResult | null {
  let wolfCount = 0
  let nonWolfCount = 0

  for (const playerId of state.alive) {
    if (state.roles.get(playerId) === 'werewolf') {
      wolfCount++
    } else {
      nonWolfCount++
    }
  }

  if (wolfCount === 0) return { winner: 'villagers' }
  if (wolfCount >= nonWolfCount) return { winner: 'wolves' }
  return null
}

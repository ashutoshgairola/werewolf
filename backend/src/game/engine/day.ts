import type { GameState, VotingResolution } from '../../shared/types'

/**
 * Resolves day votes.
 * Majority of votes cast wins. Tie or all-abstain → no elimination.
 */
export function resolveVoting(
  _state: GameState,
  votes: Map<string, string>
): VotingResolution {
  if (votes.size === 0) {
    return { eliminatedPlayerId: null, voteCounts: {} }
  }

  const tally: Record<string, number> = {}
  for (const targetId of votes.values()) {
    tally[targetId] = (tally[targetId] ?? 0) + 1
  }

  const maxVotes = Math.max(...Object.values(tally))
  const topTargets = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  // Tie → no elimination
  const eliminatedPlayerId = topTargets.length === 1 ? topTargets[0] : null

  return { eliminatedPlayerId, voteCounts: tally }
}

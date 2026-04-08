import { pool } from './client'
import type { GameState, RoomState } from '../shared/types'

export async function writeGameResult(game: GameState, room: RoomState): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const endedAt = new Date()
    const startedAt = new Date(game.startedAt)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    // Insert game_logs
    const gameResult = await client.query<{ id: string }>(
      `INSERT INTO game_logs
         (room_code, started_at, ended_at, duration_seconds, winner, total_rounds, player_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        game.roomCode,
        startedAt,
        endedAt,
        durationSeconds,
        game.winner,
        game.round,
        game.players.length,
      ]
    )
    const gameId = gameResult.rows[0].id

    // Insert game_players
    for (const player of game.players) {
      const role = game.roles.get(player.playerId) ?? 'villager'
      const outcome = player.outcome ?? (player.isAlive ? 'survived' : 'killed_night')
      const eliminatedRound = player.eliminatedRound ?? null

      await client.query(
        `INSERT INTO game_players
           (game_id, player_id, display_name, role, outcome, eliminated_round)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [gameId, player.playerId, player.displayName, role, outcome, eliminatedRound]
      )
    }

    // Insert game_chat_logs (day, ghost, system — wolf chat is NOT persisted)
    const channels = (['day', 'ghost', 'system'] as const)
    for (const channel of channels) {
      for (const msg of game.chatLogs[channel]) {
        await client.query(
          `INSERT INTO game_chat_logs
             (game_id, channel, sender_id, sender_name, text, sent_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gameId, channel, msg.senderId, msg.senderName, msg.text, new Date(msg.sentAt)]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

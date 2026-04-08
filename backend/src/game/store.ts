import type { GameState, RoomState } from '../shared/types'

class GameStore {
  private games = new Map<string, GameState>()
  private rooms = new Map<string, RoomState>()
  private playerRoomIndex = new Map<string, string>()  // playerId → roomCode

  // ── Rooms ─────────────────────────────────────────────────────────────────

  setRoom(roomCode: string, room: RoomState): void {
    this.rooms.set(roomCode, room)
  }

  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode)
  }

  deleteRoom(roomCode: string): void {
    const room = this.rooms.get(roomCode)
    if (room) {
      for (const p of [...room.players, ...room.spectators]) {
        this.playerRoomIndex.delete(p.playerId)
      }
    }
    this.rooms.delete(roomCode)
  }

  getAllRooms(): Map<string, RoomState> {
    return this.rooms
  }

  // ── Games ─────────────────────────────────────────────────────────────────

  setGame(roomCode: string, game: GameState): void {
    this.games.set(roomCode, game)
  }

  getGame(roomCode: string): GameState | undefined {
    return this.games.get(roomCode)
  }

  deleteGame(roomCode: string): void {
    this.games.delete(roomCode)
  }

  getAllGames(): Map<string, GameState> {
    return this.games
  }

  // ── Player index ──────────────────────────────────────────────────────────

  setPlayerRoom(playerId: string, roomCode: string): void {
    this.playerRoomIndex.set(playerId, roomCode)
  }

  getPlayerRoom(playerId: string): string | undefined {
    return this.playerRoomIndex.get(playerId)
  }

  removePlayerRoom(playerId: string): void {
    this.playerRoomIndex.delete(playerId)
  }
}

export const store = new GameStore()

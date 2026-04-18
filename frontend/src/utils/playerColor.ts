// Deterministic pastel color per player based on their playerId
const PASTEL_COLORS = [
  '#7EC8E3', // sky blue
  '#A8D5A2', // sage green
  '#F4A261', // soft orange
  '#C77DFF', // lavender purple
  '#FFB7C5', // blush pink
  '#FFD166', // warm yellow
  '#06D6A0', // mint green
  '#EF8C6F', // terracotta
  '#74B9FF', // cornflower
  '#FFC6FF', // orchid
  '#B5EAD7', // seafoam
  '#FF9AA2', // rose
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getPlayerColor(playerId: string): string {
  return PASTEL_COLORS[hashString(playerId) % PASTEL_COLORS.length]
}

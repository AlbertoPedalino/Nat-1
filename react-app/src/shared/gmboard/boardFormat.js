// How a GM Board instance stores its data: one JSON value per key, scoped to
// the board id. The board page and the battle map (which reads a campaign's
// board tables) both read it through these.
export const STORAGE_KEYS = Object.freeze({
  state: 'state:v1',
  tables: 'tables:v1',
  results: 'results:v1',
});

export function scopeKey(id, key) {
  return `gb:board:${id}:${key}`;
}

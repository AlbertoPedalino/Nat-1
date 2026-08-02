// Campaign character rows -> the little a map token needs to know about them.
// Deliberately thinner than the encounter builder's `toEncounterPlayer`: a
// piece on a map has no use for AC, HP or initiative, and pulling that mapper in
// would drag the class adapters into the VTT bundle for nothing.

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function normalizeIconColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

export function toRosterEntry(row) {
  if (!row?.id) return null;
  const sheet = row.data || {};
  return {
    characterId: row.id,
    name: sheet.name || row.name || 'Character',
    ownerId: row.owner || null,
    ownerUsername: row.owner_username || null,
    color: normalizeIconColor(sheet.classIconColor),
  };
}

export function toRoster(rows) {
  return (rows || []).map(toRosterEntry).filter(Boolean);
}

// Which roster entries already stand on the map, so the panel can offer the rest
// instead of letting the GM place a duplicate by accident.
export function placedCharacterIds(tokens) {
  return new Set((tokens || []).map((token) => token?.characterId).filter(Boolean));
}

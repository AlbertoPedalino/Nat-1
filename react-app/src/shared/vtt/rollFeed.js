// Rolls shared with the table.
//
// Deliberately without persistence: a roll is something that was said out loud,
// not a record. It travels on the broadcast channel like the laser, is kept in
// memory while the page is open, and is gone on reload — nothing to clean up
// later and no history anybody has to prune.
//
// The payload is the sheet's own toast entry, so a roll reads on the map exactly
// as it read to the player who made it.

export const ROLL_TTL_MS = 8000;
export const MAX_FEED = 40;

function numberOrNull(value) {
  // `Number(null)` is 0, which is finite — so a rest or a death-save guard, which
  // has no total at all, would have been shown as a roll of zero.
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRoll(entry) {
  if (!entry) return null;
  const label = String(entry.label || '').trim().slice(0, 60);
  const detail = String(entry.detail || '').trim().slice(0, 120);
  if (!label && !detail) return null;
  return {
    // Its own id: two identical rolls a second apart are two events, and the
    // feed has to show both.
    id: entry.id || `${entry.characterId || 'anon'}:${entry.timestamp || Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    characterId: entry.characterId || null,
    actorName: String(entry.actorName || '').slice(0, 40),
    label,
    detail,
    total: numberOrNull(entry.total),
    rolls: Array.isArray(entry.rolls) ? entry.rolls.slice(0, 20) : [],
    // 'advantage' | 'disadvantage' | undefined, as the sheet records it.
    mode: entry.meta?.mode || null,
    // Carried so the bubble can lay the roll out exactly as the sheet's toast
    // did — dice, then the flat modifier, then the total.
    bonus: Number.isFinite(entry.meta?.bonus) ? entry.meta.bonus : null,
    // Requests physical playback on an open map. Both the map roller and a
    // synced sheet roll set it; notices without dice never do.
    thrown: Boolean(entry.thrown),
    at: Number(entry.timestamp) || Date.now(),
  };
}

// Newest first, capped. The cap is what keeps a long session from growing the
// list without bound while nobody is looking at it.
export function addRoll(feed, entry, { local = false } = {}) {
  const roll = normalizeRoll(entry);
  if (!roll) return feed || [];
  if ((feed || []).some((item) => item.id === roll.id)) return feed;
  // Local is render-only metadata. It is deliberately supplied by the
  // receiving screen rather than accepted from the broadcast payload, so the
  // screen that made the roll can hide only its own speech bubble while still
  // keeping the roll in its log and physical-dice queue.
  return [{ ...roll, localOrigin: Boolean(local) }, ...(feed || [])].slice(0, MAX_FEED);
}

// One result surface for every local roll. Physical dice defer their toast
// until DiceTray reports the final painted frame; notices have nothing to wait
// for and are returned for immediate display.
export function queueRollToast(entry, pending) {
  if (!entry) return null;
  if (entry.id && entry.thrown && entry.rolls?.length) {
    pending?.set(entry.id, entry);
    return null;
  }
  return entry;
}

// Who a roll made from the map itself belongs to.
//
// A roll from a character sheet already knows whose it is. One made from the
// map's own roller does not, so it is attributed to the piece the roller has on
// this scene — which is also what gives it a bubble to appear over. The GM rolls
// as the GM: no piece, so the roll lands in the log alone.
export function rollAuthor({ isGm, ownedCharacterIds = [], tokens = [], roster = [] } = {}) {
  if (isGm) return { characterId: null, actorName: 'GM' };

  const owned = new Set(ownedCharacterIds);
  const piece = (tokens || []).find((token) => token.characterId && owned.has(token.characterId));
  const characterId = piece?.characterId || ownedCharacterIds[0] || null;
  const entry = (roster || []).find((item) => item.characterId === characterId);

  return { characterId, actorName: entry?.name || 'Player' };
}

// The freshest roll from each person, and only while it is fresh. Older ones
// are history, and history lives in the log rather than on the board.
//
// One per roller, because a flurry of rolls would otherwise stack bubbles on
// top of each other over a single piece and bury the board in dice.
function latestPerRoller(feed, now, ttl, keyOf) {
  const seen = new Set();
  const current = [];
  for (const roll of feed || []) {
    if (now - roll.at > ttl) continue;
    const key = keyOf(roll);
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    current.push(roll);
  }
  return current;
}

// A bubble belongs over a piece, so a roll with no character has nowhere to go.
export function currentBubbles(feed, now = Date.now(), ttl = ROLL_TTL_MS) {
  return latestPerRoller(
    feed,
    now,
    ttl,
    (roll) => (!roll.localOrigin && roll.characterId ? roll.characterId : null),
  );
}

// Dice land on the table when the producer requested physical playback. A
// character sheet publishes its chosen faces and the tray replays the movement
// while keeping those values on the faces that naturally land.
//
// Whoever threw them, including the GM, who has no piece for a bubble.
export function currentThrows(feed, now = Date.now(), ttl = ROLL_TTL_MS) {
  return latestPerRoller(
    feed,
    now,
    ttl,
    (roll) => (roll.thrown && roll.rolls?.length ? roll.characterId || `actor:${roll.actorName}` : null),
  );
}

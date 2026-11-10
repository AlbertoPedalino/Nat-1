import { playerColor } from '../../../shared/encounter/combatLabels.js';
import { clampPlayerStats } from '../../../shared/encounter/combat.js';
import { combatantToSheetPatch, resolveCombatVitals } from '../../../shared/encounter/sheetSync.js';
import { SYNCED_VITALS, pickCharacterVitals } from '../../../shared/character/combat/vitals.js';
import { clamp, clampInt } from '../../../shared/numbers.js';
import { normalizeHexColor } from '../../../shared/ui/colors.js';

// The encounter builder's party: the default placeholder players, party size
// and level, edits, and importing a campaign's characters.

export const DEFAULT_PARTY = Object.freeze({ count: 4, level: 5 });
export const MAX_PARTY_SIZE = 10;
export const MAX_PARTY_LEVEL = 20;

// The stand-in for party slot `index` until a real character takes it.
function placeholderPlayer(index) {
  return {
    id: index,
    name: `Player ${index + 1}`,
    initMod: [2, 1, 3, 0][index] ?? 0,
    ac: [15, 14, 16, 18][index] ?? 10,
    hpMax: [30, 25, 28, 35][index] ?? 30,
    color: playerColor(null, index),
  };
}

export function createDefaultPlayers(count = DEFAULT_PARTY.count) {
  return Array.from({ length: count }, (_, index) => placeholderPlayer(index));
}

export function setPartyCount(state, value) {
  const count = clampInt(value, 1, MAX_PARTY_SIZE, state.party.count);
  const players = state.players.slice(0, count);
  while (players.length < count) players.push(placeholderPlayer(players.length));
  return { ...state, party: { ...state.party, count }, players };
}

export function updatePlayer(state, index, patch) {
  return {
    ...state,
    players: state.players.map((player, i) => (i === index ? normalizePlayer({ ...player, ...patch }, i) : player)),
  };
}

export function removePlayer(state, index) {
  if (!Number.isInteger(index) || index < 0 || index >= state.players.length) return state;
  const removed = state.players[index];
  let players = state.players
    .filter((_, i) => i !== index)
    .map((player, i) => normalizePlayer(player.sourceId ? player : { ...player, id: i }, i));

  if (!players.length) {
    players = createDefaultPlayers(1);
  }

  return {
    ...state,
    players,
    party: {
      ...state.party,
      count: clamp(players.length, 1, MAX_PARTY_SIZE),
    },
    campaignNotice: `${removed?.name || 'Player'} removed from encounter.`,
  };
}

export function importCampaignPlayers(state, campaignPlayers) {
  const incoming = Array.isArray(campaignPlayers) ? campaignPlayers : [];
  if (!incoming.length) return { ...state, campaignNotice: '' };
  let players = isDefaultPlaceholderParty(state.players) ? [] : [...state.players];
  let added = 0;
  let updated = 0;
  let skipped = 0;

  incoming.forEach((player) => {
    const next = normalizePlayer({
      id: `cloud:${player.sourceId}`,
      sourceId: player.sourceId,
      campaignId: player.campaignId,
      name: player.name,
      level: player.level,
      initMod: player.initMod,
      ac: player.ac,
      hpMax: player.hpMax,
      // From the registry, not listed here: naming the fields is what left an
      // imported character's conditions behind on their sheet.
      ...pickCharacterVitals(player),
      iconColor: player.iconColor,
      portraitPath: player.portraitPath || null,
      // An imported character wears their sheet's colour.
      color: playerColor({ iconColor: player.iconColor }, players.length),
    }, players.length);
    const existingIndex = players.findIndex((item) => item.sourceId === next.sourceId);
    if (existingIndex >= 0) {
      players[existingIndex] = { ...players[existingIndex], ...next, color: next.iconColor || players[existingIndex].color || next.color };
      updated += 1;
      return;
    }
    if (players.length >= MAX_PARTY_SIZE) {
      skipped += 1;
      return;
    }
    players.push(next);
    added += 1;
  });

  const level = campaignAverageLevel(incoming);
  const parts = [];
  if (added) parts.push(`${added} added`);
  if (updated) parts.push(`${updated} updated`);
  if (skipped) parts.push(`${skipped} skipped (party limit ${MAX_PARTY_SIZE})`);
  return {
    ...state,
    players,
    party: { count: clamp(players.length, 1, MAX_PARTY_SIZE), level },
    campaignNotice: parts.length ? `${parts.join(', ')}.` : 'Campaign players already in party.',
  };
}

function normalizePlayer(player, index) {
  const stats = clampPlayerStats(player);
  const { hpMax } = stats;
  // resolveCombatVitals rather than the raw mapper: it is the one that reads an
  // absent current HP as "undamaged" instead of 0.
  const vitals = combatantToSheetPatch(resolveCombatVitals({ hpMax }, { ...player, hpMax }));
  const normalized = {
    ...player,
    name: String(player.name || `Player ${index + 1}`),
    ...stats,
    color: playerColor(player, index),
    iconColor: normalizeHexColor(player.iconColor, '') || null,
  };
  // Only clamp what the player actually carries: a party member typed straight
  // into the encounter has no current HP and must not be given one.
  for (const field of SYNCED_VITALS) {
    if (player[field.data] == null && player[field.combat] == null) continue;
    normalized[field.data] = vitals[field.data];
  }
  return normalized;
}

function isDefaultPlaceholderParty(players) {
  if (!players.length) return true;
  return players.every((player, index) => (
    !player.sourceId
    // Placeholders were named "Giocatore N" before the interface went all
    // English; a party saved then is still recognized as one.
    && /^(Player|Giocatore) \d+$/i.test(String(player.name || ''))
    && (player.id == null || Number(player.id) === index)
  ));
}

function campaignAverageLevel(players) {
  if (!players.length) return 1;
  const total = players.reduce((sum, player) => sum + clampInt(player.level, 1, 20, 1), 0);
  return clampInt(total / players.length, 1, 20, 1);
}

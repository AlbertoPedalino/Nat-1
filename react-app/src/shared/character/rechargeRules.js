/**
 * Canonical recharge rules, shared by sheet resources and spell free-casts.
 *
 * One vocabulary + one rest predicate so the two limited-use subsystems can't
 * drift. Adapters may write short tokens ('LR', 'SR', 'SR+LR') or long tokens
 * ('longRest', 'shortRest', 'shortOrLongRest'); both normalize here.
 */

export const RECHARGE = {
  LONG: 'longRest',
  SHORT: 'shortRest',
  SHORT_OR_LONG: 'shortOrLongRest',
  NONE: 'none',
};

const ALIASES = {
  lr: RECHARGE.LONG, long: RECHARGE.LONG, longrest: RECHARGE.LONG, 'long-rest': RECHARGE.LONG,
  dawn: RECHARGE.LONG, daily: RECHARGE.LONG, perday: RECHARGE.LONG, '1/day': RECHARGE.LONG,
  sr: RECHARGE.SHORT, short: RECHARGE.SHORT, shortrest: RECHARGE.SHORT, 'short-rest': RECHARGE.SHORT,
  'sr+lr': RECHARGE.SHORT_OR_LONG, 'sr-lr': RECHARGE.SHORT_OR_LONG,
  shortorlongrest: RECHARGE.SHORT_OR_LONG, shortorlong: RECHARGE.SHORT_OR_LONG,
  none: RECHARGE.NONE, '-': RECHARGE.NONE, '—': RECHARGE.NONE,
};

function rechargeKey(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, '');
}

/** True when `value` is a recognized recharge token (any vocabulary). */
export function isKnownRecharge(value) {
  return Object.prototype.hasOwnProperty.call(ALIASES, rechargeKey(value));
}

/** Map any recharge token to a canonical RECHARGE value (defaults to LONG). */
export function normalizeRecharge(value) {
  return ALIASES[rechargeKey(value)] || RECHARGE.LONG;
}

/**
 * Does a feature with this recharge recover on the given rest?
 * Long Rest recovers everything except 'none'; Short Rest recovers
 * short / short-or-long features.
 */
export function rechargesOnRest(recharge, restType) {
  const norm = normalizeRecharge(recharge);
  if (norm === RECHARGE.NONE) return false;
  if (restType === 'long') return true;
  if (restType === 'short') return norm === RECHARGE.SHORT || norm === RECHARGE.SHORT_OR_LONG;
  return false;
}

const LABELS = {
  [RECHARGE.LONG]: 'LR',
  [RECHARGE.SHORT]: 'SR',
  [RECHARGE.SHORT_OR_LONG]: 'SR or LR',
  [RECHARGE.NONE]: '—',
};

/** Short display suffix for a recharge token (e.g. 'LR', 'SR'). */
export function rechargeLabel(recharge) {
  return LABELS[normalizeRecharge(recharge)] || 'LR';
}

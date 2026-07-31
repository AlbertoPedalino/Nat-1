// XPHB 2024 coins: copper, silver, gold, platinum. Electrum (EP) was dropped
// from the 2024 Player's Handbook and is intentionally not included.
export const CURRENCY_TYPES = [
  { key: 'cp', label: 'Copper', shortLabel: 'CP', tone: '#b87333' },
  { key: 'sp', label: 'Silver', shortLabel: 'SP', tone: '#b8b8b8' },
  { key: 'gp', label: 'Gold', shortLabel: 'GP', tone: '#d7ad52' },
  { key: 'pp', label: 'Platinum', shortLabel: 'PP', tone: '#dde1ff' },
];

export function normalizeCoinAmount(value) {
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export function sanitizeCoinInput(value) {
  return String(value ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
}

// Custom currency entries (banknotes, gems, tokens, pine cones...) live next to
// the standard coins under `currency.custom`. Their weight is identical to a
// coin (XPHB: 50 units = 1 lb), so no per-entry weight is stored.
export const CUSTOM_CURRENCY_KEY = 'custom';
// Default tone for a fresh custom currency. The color picker (IconColorPicker)
// supplies the selectable palette + arbitrary RGB.
export const CUSTOM_CURRENCY_TONE = '#9c8cff';

const CUSTOM_LABEL_MAX = 24;
const CUSTOM_SHORT_MAX = 5;
const DEFAULT_CUSTOM_LABEL = 'Custom';
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function generateCustomCurrencyId() {
  return `cur_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// Heavy, canonical sanitizing — used for new entries and at load. Trims,
// applies fallbacks and uppercases. Not used live (see applyCustomCurrencyPatch).
export function sanitizeCurrencyLabel(value, fallback = DEFAULT_CUSTOM_LABEL) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, CUSTOM_LABEL_MAX);
  return text || fallback;
}

export function sanitizeCurrencyShortLabel(value, sourceLabel) {
  const raw = String(value ?? '').replace(/\s+/g, '').slice(0, CUSTOM_SHORT_MAX);
  if (raw) return raw.toUpperCase();
  const fromLabel = String(sourceLabel ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3);
  return (fromLabel || 'CUR').toUpperCase();
}

export function sanitizeCurrencyTone(value, fallback = CUSTOM_CURRENCY_TONE) {
  const text = String(value ?? '').trim();
  return HEX_COLOR_RE.test(text) ? text : fallback;
}

export function createCustomCurrencyEntry(partial = {}) {
  const label = sanitizeCurrencyLabel(partial.label);
  return {
    id: partial.id || generateCustomCurrencyId(),
    label,
    shortLabel: sanitizeCurrencyShortLabel(partial.shortLabel, label),
    tone: sanitizeCurrencyTone(partial.tone),
    amount: normalizeCoinAmount(partial.amount),
  };
}

// Light, edit-friendly patch — used while the user is typing so we never fight
// the cursor (no trimming/fallback). Canonicalized later by normalize at load.
export function applyCustomCurrencyPatch(entry, patch = {}) {
  const next = { ...entry };
  if ('label' in patch) next.label = String(patch.label ?? '').slice(0, CUSTOM_LABEL_MAX);
  if ('shortLabel' in patch) next.shortLabel = String(patch.shortLabel ?? '').slice(0, CUSTOM_SHORT_MAX);
  if ('tone' in patch) next.tone = sanitizeCurrencyTone(patch.tone, entry.tone);
  if ('amount' in patch) next.amount = normalizeCoinAmount(patch.amount);
  return next;
}

export function normalizeCustomCurrencyList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of list) {
    const normalized = createCustomCurrencyEntry(entry);
    if (seen.has(normalized.id)) normalized.id = generateCustomCurrencyId();
    seen.add(normalized.id);
    out.push(normalized);
  }
  return out;
}

export function getCustomCurrency(currency) {
  const list = currency?.[CUSTOM_CURRENCY_KEY];
  return Array.isArray(list) ? list : [];
}

export function customCurrencyUnits(currency) {
  return getCustomCurrency(currency).reduce((sum, entry) => sum + normalizeCoinAmount(entry?.amount), 0);
}

// Display order across ALL currencies (coins + custom). Stored as a list of
// keys under currency.order. It is "soft": repaired on read so adding/removing
// a custom entry never needs to touch it — unknown keys are dropped and missing
// ones appended in canonical order (coins first, then custom in list order).
export const CURRENCY_ORDER_KEY = 'order';

export function computeCurrencyOrder(currency, rawOrder = currency?.[CURRENCY_ORDER_KEY]) {
  const customIds = getCustomCurrency(currency).map((entry) => entry.id);
  const valid = new Set([...CURRENCY_TYPES.map((coin) => coin.key), ...customIds]);
  const seen = new Set();
  const order = [];
  const push = (key) => {
    if (valid.has(key) && !seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
  };
  if (Array.isArray(rawOrder)) rawOrder.forEach(push);
  CURRENCY_TYPES.forEach((coin) => push(coin.key));
  customIds.forEach(push);
  return order;
}

// Render-ready, ordered list of descriptors for both coins and custom entries.
export function orderedCurrencyEntries(currency) {
  const coinByKey = new Map(CURRENCY_TYPES.map((coin) => [coin.key, coin]));
  const customById = new Map(getCustomCurrency(currency).map((entry) => [entry.id, entry]));
  return computeCurrencyOrder(currency).map((key) =>
    coinByKey.has(key)
      ? { key, kind: 'coin', coin: coinByKey.get(key), amount: currency?.[key] }
      : { key, kind: 'custom', entry: customById.get(key) },
  );
}

// Canonical currency shape: the four standard coins + a normalized custom list
// + a repaired display order.
export function normalizeCurrency(currency) {
  const src = currency && typeof currency === 'object' ? currency : {};
  const out = {};
  for (const coin of CURRENCY_TYPES) out[coin.key] = normalizeCoinAmount(src[coin.key]);
  out[CUSTOM_CURRENCY_KEY] = normalizeCustomCurrencyList(src[CUSTOM_CURRENCY_KEY]);
  out[CURRENCY_ORDER_KEY] = computeCurrencyOrder(out, src[CURRENCY_ORDER_KEY]);
  return out;
}

// --- Mutators (pure, immutable) ---------------------------------------------
// Single source for every currency write, shared by the builder reducer and the
// character sheet so the storage shape is only ever touched here.

export function setCoinAmount(currency, coin, value) {
  return { ...currency, [coin]: normalizeCoinAmount(value) };
}

export function addCustomCurrency(currency, partial) {
  return {
    ...currency,
    [CUSTOM_CURRENCY_KEY]: [...getCustomCurrency(currency), createCustomCurrencyEntry(partial)],
  };
}

export function updateCustomCurrency(currency, id, patch) {
  return {
    ...currency,
    [CUSTOM_CURRENCY_KEY]: getCustomCurrency(currency).map((entry) =>
      entry.id === id ? applyCustomCurrencyPatch(entry, patch) : entry,
    ),
  };
}

export function removeCustomCurrency(currency, id) {
  return {
    ...currency,
    [CUSTOM_CURRENCY_KEY]: getCustomCurrency(currency).filter((entry) => entry.id !== id),
  };
}

// Move a currency one slot left (dir -1) or right (dir +1) in the display order.
export function reorderCurrency(currency, key, dir) {
  const order = computeCurrencyOrder(currency);
  const idx = order.indexOf(key);
  const swapIdx = idx + dir;
  if (idx < 0 || swapIdx < 0 || swapIdx >= order.length) return currency;
  const next = [...order];
  [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
  return { ...currency, [CURRENCY_ORDER_KEY]: next };
}

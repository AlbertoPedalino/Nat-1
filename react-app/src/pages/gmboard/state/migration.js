import { createDefaultCoreState } from '../../../shared/gmboard/defaultState.js';
import { createDefaultTables } from '../../../shared/gmboard/defaultTables.js';
import { parseJsonOr } from '../../../shared/gmboard/boardFormat.js';

export const LEGACY_KEYS = Object.freeze([
  'gm_state', 'gm_wea', 'gm_ev', 'gm_lo', 'gm_co', 'gm_env',
  'gm_enc0', 'gm_enc1', 'gm_enc2', 'gm_enc3',
  'gm_trap0', 'gm_trap1', 'gm_trap2', 'gm_trap3',
]);

const METEO_MAP = { Sole: 'Clear', Pioggia: 'Rain', Neve: 'Snow' };
const INTENSITY_MAP = { Leggera: 'Light', Moderata: 'Moderate', Forte: 'Heavy' };
const LOOT_TIPO_MAP = {
  'Oggetto Maledetto': 'Cursed Item', 'Arma / Armatura': 'Weapon / Armor',
  'Oggetto Magico': 'Magic Item', 'Equipaggiamento': 'Equipment',
  'Materiali': 'Materials', 'Niente trovato': 'Nothing found',
  'Consumabile': 'Consumable', 'Arma / Armatura Magica': 'Magic Weapon / Armor',
  'Artefatto / Reliquia': 'Artifact / Relic',
};
const RARITA_MAP = {
  Leggendario: 'Legendary', 'Molto Raro': 'Very Rare', Raro: 'Rare',
  'Non Comune': 'Uncommon', Comune: 'Common',
};
const QUALITA_MAP = {
  Corrotto: 'Corrupted', Rovinato: 'Damaged', Buono: 'Fine',
  Eccelso: 'Masterwork', Integro: 'Pristine',
};
const COMPL_TYPE_MAP = { Niente: 'None' };

function migrateState(raw) {
  const base = createDefaultCoreState();
  const parsed = parseJsonOr(raw, null);
  if (!parsed) return base;
  return {
    ...base,
    min: typeof parsed.min === 'number' ? parsed.min : base.min,
    day: typeof parsed.day === 'number' ? parsed.day : base.day,
    month: typeof parsed.month === 'number' ? parsed.month : base.month,
    year: typeof parsed.year === 'number' ? parsed.year : base.year,
    log: Array.isArray(parsed.log) ? parsed.log : base.log,
    season: parsed.season || base.season,
    weather: METEO_MAP[parsed.meteo] || parsed.meteo || base.weather,
    intensity: INTENSITY_MAP[parsed.intensita] || parsed.intensita || base.intensity,
    hoursSinceWeather: typeof parsed.hoursSinceWeather === 'number' ? parsed.hoursSinceWeather : base.hoursSinceWeather,
    nextWeatherIn: typeof parsed.nextWeatherIn === 'number' ? parsed.nextWeatherIn : base.nextWeatherIn,
  };
}

// Legacy rows used Italian field names (and values); a row already in the
// current shape passes through unchanged.
function migrateLoot(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map(({ tipo, rarita, qualita, valore, ...entry }) => {
    const type = tipo ?? entry.type;
    const rarity = rarita ?? entry.rarity;
    const quality = qualita ?? entry.quality;
    return {
      ...entry,
      type: LOOT_TIPO_MAP[type] || type,
      rarity: RARITA_MAP[rarity] || rarity,
      quality: QUALITA_MAP[quality] || quality,
      value: valore ?? entry.value,
    };
  });
}

function migrateCompl(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map((entry) => ({ ...entry, type: COMPL_TYPE_MAP[entry.type] || entry.type }));
}

function migrateEnv(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map(({ gravita, ...entry }) => {
    const severity = gravita ?? entry.severity;
    return { ...entry, severity: RARITA_MAP[severity] || severity };
  });
}

function migrateWeather(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map(({ sole, pioggia, ...entry }) => ({
    ...entry, clear: sole ?? entry.clear, rain: pioggia ?? entry.rain,
  }));
}

function migrateTrap(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map(({ tipo, danno, ...entry }) => ({
    ...entry, type: tipo ?? entry.type, damage: danno ?? entry.damage,
  }));
}

function migratePlainArray(raw, fallback) {
  const parsed = parseJsonOr(raw, null);
  return Array.isArray(parsed) ? parsed : fallback;
}

export function migrateLegacyBoard(raw) {
  const defaults = createDefaultTables();
  return {
    state: migrateState(raw.gm_state),
    tables: {
      weather: migrateWeather(raw.gm_wea, defaults.weather),
      events: migratePlainArray(raw.gm_ev, defaults.events),
      loot: migrateLoot(raw.gm_lo, defaults.loot),
      compl: migrateCompl(raw.gm_co, defaults.compl),
      enc: [0, 1, 2, 3].map((i) => migratePlainArray(raw[`gm_enc${i}`], defaults.enc[i])),
      trap: [0, 1, 2, 3].map((i) => migrateTrap(raw[`gm_trap${i}`], defaults.trap[i])),
      env: migrateEnv(raw.gm_env, defaults.env),
    },
  };
}

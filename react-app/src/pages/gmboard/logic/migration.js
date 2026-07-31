import { createDefaultCoreState } from './defaultState.js';
import { createDefaultTables } from './defaultTables.js';

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

function parseJson(raw, fallback) {
  if (raw == null) return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function migrateState(raw) {
  const base = createDefaultCoreState();
  const parsed = parseJson(raw, null);
  if (!parsed) return base;
  return {
    ...base,
    min: typeof parsed.min === 'number' ? parsed.min : base.min,
    day: typeof parsed.day === 'number' ? parsed.day : base.day,
    month: typeof parsed.month === 'number' ? parsed.month : base.month,
    year: typeof parsed.year === 'number' ? parsed.year : base.year,
    log: Array.isArray(parsed.log) ? parsed.log : base.log,
    season: parsed.season || base.season,
    meteo: METEO_MAP[parsed.meteo] || parsed.meteo || base.meteo,
    intensity: INTENSITY_MAP[parsed.intensita] || parsed.intensita || base.intensity,
    hoursSinceWeather: typeof parsed.hoursSinceWeather === 'number' ? parsed.hoursSinceWeather : base.hoursSinceWeather,
    nextWeatherIn: typeof parsed.nextWeatherIn === 'number' ? parsed.nextWeatherIn : base.nextWeatherIn,
  };
}

function migrateLoot(raw, fallback) {
  const parsed = parseJson(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map((entry) => ({
    ...entry,
    tipo: LOOT_TIPO_MAP[entry.tipo] || entry.tipo,
    rarita: RARITA_MAP[entry.rarita] || entry.rarita,
    qualita: QUALITA_MAP[entry.qualita] || entry.qualita,
  }));
}

function migrateCompl(raw, fallback) {
  const parsed = parseJson(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map((entry) => ({ ...entry, type: COMPL_TYPE_MAP[entry.type] || entry.type }));
}

function migrateEnv(raw, fallback) {
  const parsed = parseJson(raw, null);
  if (!Array.isArray(parsed)) return fallback;
  return parsed.map((entry) => ({ ...entry, gravita: RARITA_MAP[entry.gravita] || entry.gravita }));
}

function migratePlainArray(raw, fallback) {
  const parsed = parseJson(raw, null);
  return Array.isArray(parsed) ? parsed : fallback;
}

export function migrateLegacyBoard(raw) {
  const defaults = createDefaultTables();
  return {
    state: migrateState(raw.gm_state),
    tables: {
      weather: migratePlainArray(raw.gm_wea, defaults.weather),
      events: migratePlainArray(raw.gm_ev, defaults.events),
      loot: migrateLoot(raw.gm_lo, defaults.loot),
      compl: migrateCompl(raw.gm_co, defaults.compl),
      enc: [0, 1, 2, 3].map((i) => migratePlainArray(raw[`gm_enc${i}`], defaults.enc[i])),
      trap: [0, 1, 2, 3].map((i) => migratePlainArray(raw[`gm_trap${i}`], defaults.trap[i])),
      env: migrateEnv(raw.gm_env, defaults.env),
    },
  };
}

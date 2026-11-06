import { makeId } from '../ids.js';
function section(config) {
  return Object.freeze({ ...config });
}

// Identity of the three instance-based tools: where an instance's metadata and
// payload live locally, which cloud table mirrors it, and how it is routed.
// Everything else about instances (storage, sync, opening) is shared code in
// this folder; a tool only adds its payload adapter (`pages/<tool>/state/storage.js`).
export const SECTION_REGISTRY = Object.freeze({
  gmboard: section({
    key: 'gmboard',
    table: 'boards',
    registryKey: 'gb_board_registry',
    activeKey: 'gb_active_board_id',
    keyPrefix: 'gb:board:',
    scopedPrefix: (id) => `gb:board:${id}:`,
    idPrefix: 'gm',
    param: 'board',
    label: 'GM Board',
    route: (id) => `/gmboard?board=${encodeURIComponent(id)}`,
    newRoute: '/gmboard?board=new',
    defaultName: (id) => `GM Board ${id}`,
  }),
  encounters: section({
    key: 'encounters',
    table: 'encounters',
    registryKey: 'gb_encounter_registry',
    activeKey: 'gb_active_encounter_id',
    keyPrefix: 'gb:enc:',
    scopedPrefix: (id) => `gb:enc:${id}:`,
    idPrefix: 'enc',
    param: 'enc',
    label: 'Encounter',
    route: (id) => `/encounter-builder?enc=${encodeURIComponent(id)}`,
    newRoute: '/encounter-builder?enc=new',
    defaultName: (id) => `Encounter ${id}`,
    // Fights live in their own rows (encounter_fights): the cloud copy of each
    // is its row. This key is this device's cache of them (and the bridge the
    // battle map writes through in the same browser): kept out of the synced
    // instance, so absorbing another device's hit points never makes it dirty.
    localOnlyKeys: ['fights:v1'],
  }),
  dmscreen: section({
    key: 'dmscreen',
    table: 'dm_screens',
    registryKey: 'gb_dmscreen_registry',
    activeKey: 'gb_active_dmscreen_id',
    keyPrefix: 'gb:dmscreen:',
    scopedPrefix: (id) => `gb:dmscreen:${id}:`,
    idPrefix: 'screen',
    param: 'screen',
    label: 'DM Screen',
    route: (id) => `/dm-screen?screen=${encodeURIComponent(id)}`,
    newRoute: '/dm-screen?screen=new',
    defaultName: (id) => `DM Screen ${id}`,
  }),
});

export const SECTION_KEYS = Object.freeze(Object.keys(SECTION_REGISTRY));

export function getSection(sectionKey) {
  return Object.prototype.hasOwnProperty.call(SECTION_REGISTRY, sectionKey) ? SECTION_REGISTRY[sectionKey] : null;
}

// Instance ids are opaque, URL- and key-safe tokens.
export function sanitizeInstanceId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 48);
}

export function makeInstanceId(sectionKey, now = Date.now(), random = Math.random) {
  const section = getSection(sectionKey);
  if (!section) return '';
  return makeId(section.idPrefix, { now, random });
}

import { CREATURE_TYPES } from '../content/rulesVocabulary.js';
// The monster sources the app loads, their labels, CR to XP, and the type and
// size vocabulary of the bestiary.
export const PROJECT_ALLOWED_SOURCES = Object.freeze([
  'XPHB', 'XMM', 'XDMG', 'FRAIF', 'FRHOF', 'EFA', 'RWH', 'AU', 'AUD',
]);

export const PROJECT_TO_RAW_SOURCE = Object.freeze({
  XPHB: 'XPHB',
  XMM: 'XMM',
  XDMG: 'XDMG',
  FRAIF: 'FRAiF',
  FRHOF: 'FRHoF',
  EFA: 'EFA',
  RWH: 'RHW',
  AU: 'AU',
  AUD: 'AUD',
});

export const RAW_ALLOWED_SOURCES = Object.freeze(PROJECT_ALLOWED_SOURCES.map((source) => PROJECT_TO_RAW_SOURCE[source]));


export const CR_XP = Object.freeze({
  0: 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
});

export const CR_ORDER = Object.freeze(['0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']);

// The filter options of a bestiary (the encounter builder's, the compendium's).
export const CR_OPTIONS = Object.freeze(CR_ORDER.map((cr) => Object.freeze({ key: cr, label: `CR ${cr}` })));
export const CREATURE_TYPE_OPTIONS = Object.freeze(CREATURE_TYPES.map((type) => Object.freeze({ key: type.toLowerCase(), label: type })));


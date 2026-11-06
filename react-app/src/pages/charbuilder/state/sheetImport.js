import { getPrimaryClassLevel } from '../progression/calculations.js';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../../../shared/character/inventory/currency.js';
import { normalizeProficiencyChoicesForPersistence } from './proficiencyPersistence.js';
import { stripHeavyFields } from './persistence.js';

// Reading a character back into the builder from an exported JSON sheet.

export function extractSheetData(text) {
  // Canonical export is a JSON file: { type, data, version } (or a bare character).
  try {
    const json = JSON.parse(text);
    return json?.data || json;
  } catch (_) {
    return null;
  }
}

export function unwrapStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  // Tolerate a still-wrapped { data } payload; a real character carries className.
  if (payload.data && typeof payload.data === 'object' && !payload.className) return payload.data;
  return payload;
}

export function isStructuredSheetPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return Boolean(payload.className || payload.choices);
}

export function buildBuilderStateFromSheetPayload(data) {
  const backgroundSnapshot = data.backgroundSnapshot || null;
  const backgroundName = data.backgroundName || backgroundSnapshot?.name || '';
  const backgroundSource = data.backgroundSource || backgroundSnapshot?.source || '';
  const backgroundAbilities = data.backgroundAbilities || [];
  const backgroundPattern = data.backgroundPattern || [2, 1];
  const speciesName = data.speciesName || data.speciesSnapshot?.name || '';
  const speciesSource = data.speciesSource || data.speciesSnapshot?.source || '';

  const builderState = {
    name: data.name || '',
    level: Number(data.level || 1),
    classLevel: getPrimaryClassLevel(data),
    className: data.className || data.clsSnapshot?.name || '',
    classSource: data.classSource || data.clsSnapshot?.source || '',
    subclassShortName: data.subclassShortName || '',
    subclassSource: data.subclassSource || '',
    extraClasses: data.extraClasses || [],

    speciesName,
    speciesSource,
    speciesObj: data.speciesObj || data.speciesSnapshot || null,

    backgroundName,
    backgroundSource,
    backgroundObj: data.backgroundObj || backgroundSnapshot,
    backgroundAbilities,
    backgroundPattern,

    scoreMethod: data.scoreMethod || 'pointbuy',
    hpMode: data.hpMode || 'average',
    hpManualRolls: data.hpManualRolls || {},
    pbScores: data.pbScores || {},
    arrAssign: data.arrAssign || {},
    diceAssign: data.diceAssign || {},
    manualScores: data.manualScores || {},

    choices: data.choices || {},
    equipChoices: data.equipChoices || {},
    normalizedChoices: data.normalizedChoices || null,
    selectedSkills: data.selectedSkills || [],
    selectedLanguages: data.selectedLanguages || [],
    selectedTools: data.selectedTools || [],

    cls: data.cls || data.clsSnapshot || null,
    clsSnapshot: data.clsSnapshot || data.cls || null,
    allFeatures: data.allFeatures || data.allClassFeatures || [],
    allClassFeatures: data.allClassFeatures || data.allFeatures || [],
    allSubFeatures: data.allSubFeatures || [],
    allFeatSnapshots: data.allFeatSnapshots || [],

    selectedCantrips: data.selectedCantrips || [],
    selectedSpells: data.selectedSpells || {},
    wizardSpellbook: data.wizardSpellbook || {},
    wizardSpellMastery: data.wizardSpellMastery || {},
    wizardSignatureSpells: data.wizardSignatureSpells || {},
    autoGrantedSpells: data.autoGrantedSpells || [],

    inventory: data.inventory || [],
    currency: normalizeCurrency(data.currency || { ...DEFAULT_CURRENCY }),
    xp: Number(data.xp || 0),
  };

  return normalizeProficiencyChoicesForPersistence(builderState);
}

// Validate an imported payload and build the unified character object from it,
// WITHOUT writing to any store (local or cloud). Throws on an unrecognized
// format. Callers decide where (and whether) to persist the result.
export function buildImportedCharacter(payload) {
  const data = unwrapStructuredSheetPayload(payload);

  if (!isStructuredSheetPayload(data)) {
    throw new Error('Unrecognized file format: upload a Nat 1 character sheet JSON file.');
  }

  const normalizedData = normalizeProficiencyChoicesForPersistence(data);
  const builderState = buildBuilderStateFromSheetPayload(normalizedData);
  return stripHeavyFields({ ...builderState, ...normalizedData });
}

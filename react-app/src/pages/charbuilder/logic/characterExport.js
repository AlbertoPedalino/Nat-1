export const CHARACTER_EXPORT_TYPE = 'gb-sheet-export';
export const CHARACTER_EXPORT_VERSION = 2;

// Only player-authored definition and play-state fields cross the export
// boundary. Database snapshots and adapter output are rebuilt after import.
const CHARACTER_DEFINITION_FIELDS = [
  'name', 'xp', 'classIconColor',
  'level', 'classLevel',
  'className', 'classSource', 'subclassShortName', 'subclassSource', 'extraClasses',
  'speciesName', 'speciesSource',
  'backgroundName', 'backgroundSource', 'backgroundAbilities', 'backgroundPattern',
  'scoreMethod', 'hpMode', 'hpManualRolls', 'pbScores', 'arrAssign', 'diceAssign', 'manualScores',
  'choices', 'equipChoices', 'selectedSkills', 'selectedLanguages', 'selectedTools',
  'selectedCantrips', 'selectedSpells', 'wizardSpellbook', 'wizardSpellMastery', 'wizardSignatureSpells',
  'inventory', 'currency',
];

const CHARACTER_PLAY_STATE_FIELDS = [
  'currentHP', 'tempHP', 'maxHPBonus', 'deathSaves',
  'usedHD', 'usedHDPools',
  'spellSlotsUsed', 'createdSpellSlots',
  'resources', 'freeCastUses',
  'inspiration', 'activeConditions', 'exhaustionLevel',
  'notes', 'arcaneArmorItemKey', 'consumedItemBonuses',
];

const EXTRA_CLASS_DEFINITION_FIELDS = [
  'name', 'source', 'level', 'subclassShortName', 'subclassSource',
  'selectedCantrips', 'selectedSpells',
  'wizardSpellbook', 'wizardSpellMastery', 'wizardSignatureSpells',
];

const ACTIVE_TOGGLE_FIELD = /^[A-Za-z][A-Za-z0-9_]*Active$/;

function pickFields(source, fields) {
  const out = {};
  fields.forEach((field) => {
    if (source[field] !== undefined) out[field] = source[field];
  });
  return out;
}

function pickActiveToggleFields(source) {
  const out = {};
  Object.keys(source).forEach((field) => {
    if (ACTIVE_TOGGLE_FIELD.test(field) && typeof source[field] === 'boolean') out[field] = source[field];
  });
  return out;
}

export function serializeCharacterForExport(character) {
  if (!character || typeof character !== 'object' || Array.isArray(character)) return character;

  const out = {
    ...pickFields(character, CHARACTER_DEFINITION_FIELDS),
    ...pickFields(character, CHARACTER_PLAY_STATE_FIELDS),
    ...pickActiveToggleFields(character),
  };

  if (Array.isArray(out.extraClasses)) {
    out.extraClasses = out.extraClasses.map((extra) => (
      extra && typeof extra === 'object' && !Array.isArray(extra)
        ? pickFields(extra, EXTRA_CLASS_DEFINITION_FIELDS)
        : extra
    ));
  }

  return out;
}

export function createCharacterExport(character) {
  return {
    type: CHARACTER_EXPORT_TYPE,
    version: CHARACTER_EXPORT_VERSION,
    data: serializeCharacterForExport(character),
  };
}

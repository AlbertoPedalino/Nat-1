import { normalizeCharacterChoices } from './choiceNormalization.js';

const BUILDER_FIELD_MAP = [
  ['name', ['name']],
  ['xp', ['xp']],
  ['level', ['level']],
  ['classLevel', ['classLevel']],
  ['className', ['className']],
  ['classSource', ['classSource']],
  ['subclassShortName', ['subclassShortName']],
  ['extraClasses', ['extraClasses']],
  ['speciesName', ['speciesName']],
  ['speciesSource', ['speciesSource']],
  ['backgroundName', ['backgroundName', 'bgName']],
  ['backgroundSource', ['backgroundSource', 'bgSource']],
  ['backgroundAbilities', ['backgroundAbilities', 'bgAbility']],
  ['scoreMethod', ['scoreMethod']],
  ['hpMode', ['hpMode']],
  ['hpManualRolls', ['hpManualRolls']],
  ['pbScores', ['pbScores']],
  ['arrAssign', ['arrAssign']],
  ['diceAssign', ['diceAssign']],
  ['manualScores', ['manualScores']],
  ['choices', ['choices']],
  ['selectedSkills', ['selectedSkills']],
  ['selectedLanguages', ['selectedLanguages']],
  ['selectedTools', ['selectedTools']],
  ['selectedCantrips', ['selectedCantrips']],
  ['selectedSpells', ['selectedSpells']],
  ['wizardSpellbook', ['wizardSpellbook']],
  ['wizardSpellMastery', ['wizardSpellMastery']],
  ['wizardSignatureSpells', ['wizardSignatureSpells']],
  ['inventory', ['inventory']],
  ['currency', ['currency']],
];

function firstDefined(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined) return source[key];
  }
  return undefined;
}

export function mapCharacterToBuilderState(source) {
  if (!source || typeof source !== 'object') return {};
  const mapped = {};
  BUILDER_FIELD_MAP.forEach(([target, keys]) => {
    const value = firstDefined(source, keys);
    if (value !== undefined) mapped[target] = value;
  });
  if (source.subclassShortName !== undefined || mapped.subclassShortName === undefined) {
    mapped.subclassShortName = mapped.subclassShortName || '';
  }

  mapped.normalizedChoices = normalizeCharacterChoices(mapped);
  return mapped;
}

export function mergeSheetIntoBuilder(builder, sheet) {
  if (!sheet || typeof sheet !== 'object') return builder;
  if (builder?.name && sheet.name && builder.name !== sheet.name) return builder;
  const sheetMapped = mapCharacterToBuilderState(sheet);
  const merged = { ...(builder || {}), ...sheetMapped };
  if (Array.isArray(builder?.inventory) && builder.inventory.length && !sheetMapped.inventory?.length) {
    merged.inventory = builder.inventory;
  }
  if (builder?.currency && Object.values(builder.currency).some((value) => Number(value || 0) > 0)
    && (!sheetMapped.currency || !Object.values(sheetMapped.currency).some((value) => Number(value || 0) > 0))) {
    merged.currency = builder.currency;
  }
  merged.normalizedChoices = normalizeCharacterChoices(merged);
  return merged;
}

export function prepareCharacterForSheet(character) {
  const mapped = mapCharacterToBuilderState(character);
  return {
    ...(character || {}),
    ...mapped,
    normalizedChoices: normalizeCharacterChoices({
      ...(character || {}),
      ...mapped,
    }),
  };
}

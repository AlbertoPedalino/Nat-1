import { characterClassFeatures } from '../../../shared/character/progression/classLevel.js';
import { speciesWithVersion } from '../../../shared/character/progression/speciesVersion.js';

export function buildPreviewSheetCharacter(character = {}) {
  // The lineage or colour chosen applies, as in the saved sheet.
  const species = speciesWithVersion(character.speciesObj || character.speciesSnapshot, character.choices) || {};
  const extraClasses = (character.extraClasses || []).map((extra) => ({
    ...extra,
    clsSnapshot: extra.cls || extra.clsSnapshot || {},
  }));

  return {
    ...character,
    clsSnapshot: character.cls || character.clsSnapshot || {},
    backgroundSnapshot: character.backgroundObj || character.backgroundSnapshot || {},
    speciesSnapshot: {
      ...species,
      languageProficiencies: [{ common: true }, ...(species.languageProficiencies || [])],
    },
    extraClasses,
    allClassFeatures: characterClassFeatures({ ...character, extraClasses }),
  };
}

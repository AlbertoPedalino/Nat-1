export function buildPreviewSheetCharacter(character = {}) {
  const species = character.speciesObj || character.speciesSnapshot || {};
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
    allClassFeatures: [
      ...(character.allFeatures || []),
      ...(character.allSubFeatures || []),
      ...extraClasses.flatMap((extra) => [
        ...(extra.allFeatures || []),
        ...(extra.allSubFeatures || []),
      ]),
    ],
  };
}

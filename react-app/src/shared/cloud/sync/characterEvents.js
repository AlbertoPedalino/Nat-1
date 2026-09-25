// In-tab signals about a character, kept apart by meaning so that no consumer
// can mistake one for another:
//
// - CHARACTER_VITALS_EVENT: a health command answered here. The detail is the
//   command's answer — `{ applied, characterId, vitals, digestRevision,
//   hpBasis }` — never a sheet: it previews the character digest and nothing
//   that shows a whole sheet listens to it.
// - CHARACTER_RECHECK_EVENT: a command failed or timed out, so this tab no
//   longer knows whether it landed. Followers of that character run their
//   ordinary light recovery (a digest read, a revision check); nothing is
//   resent.
// - CHARACTER_SHEET_SAVED_EVENT: this tab saved a whole sheet; the detail is
//   `{ characterId, sheetRevision }`, the revision that save produced. Whoever
//   follows that sheet's revision takes it as known, so the Realtime echo of
//   the save is not mistaken for someone else's change.

export const CHARACTER_VITALS_EVENT = 'gb:character-vitals';
export const CHARACTER_RECHECK_EVENT = 'gb:character-recheck';
export const CHARACTER_SHEET_SAVED_EVENT = 'gb:character-sheet-saved';

function dispatch(type, detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function publishCharacterVitals(answer) {
  if (answer?.characterId && answer.vitals) dispatch(CHARACTER_VITALS_EVENT, answer);
}

export function requestCharacterRecheck(characterId) {
  if (characterId) dispatch(CHARACTER_RECHECK_EVENT, { characterId: String(characterId) });
}

export function publishCharacterSheetSaved(characterId, sheetRevision) {
  const revision = Number(sheetRevision);
  if (characterId && sheetRevision != null && Number.isFinite(revision)) {
    dispatch(CHARACTER_SHEET_SAVED_EVENT, { characterId: String(characterId), sheetRevision: revision });
  }
}

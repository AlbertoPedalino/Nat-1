import { pushCharacterData, updateCloudCharacterData } from '../../../shared/cloud/api/cloudCharacters.js';

// How the builder writes a character to the cloud. The first save creates the
// row; every later one is an update conditional on `knownRevision`, the
// sheet_revision the builder's copy is based on (never row_revision, which
// health commands move). Without a known revision pushCharacterData creates a
// missing row but refuses to touch an existing one. A change made elsewhere
// since fails with SHEET_CONFLICT; nothing is overwritten or retried.
// Resolves to `{ id, sheetRevision }`, the revision the save produced.
export function saveBuilderCharacter({ id, character, created, knownRevision }) {
  return created && knownRevision != null
    ? updateCloudCharacterData(id, character, { expectedSheetRevision: knownRevision })
    : pushCharacterData(id, character, { expectedSheetRevision: knownRevision });
}

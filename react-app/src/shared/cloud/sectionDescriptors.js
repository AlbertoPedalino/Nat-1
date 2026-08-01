import {
  readRegistry as readBoardRegistry,
  readScopedPayload as readBoardPayload,
  sanitizeBoardId,
  writeScopedPayload as writeBoardPayload,
} from '../../pages/gmboard/storage.js';
import {
  readRegistry as readEncounterRegistry,
  readScopedPayload as readEncounterPayload,
  sanitizeEncounterId,
  writeScopedPayload as writeEncounterPayload,
} from '../../pages/encounterbuilder/logic/storage.js';
import {
  readRegistry as readScreenRegistry,
  readScopedPayload as readScreenPayload,
  sanitizeId as sanitizeScreenId,
  writeScopedPayload as writeScreenPayload,
} from '../../pages/dmscreen/storage.js';
import { SECTION_KEYS, SECTION_REGISTRY } from '../sectionRegistry.js';

function descriptor(config) {
  return Object.freeze({ ...config });
}

export const SECTION_DESCRIPTORS = Object.freeze({
  gmboard: descriptor({
    ...SECTION_REGISTRY.gmboard,
    sanitizeId: sanitizeBoardId,
    readRegistry: readBoardRegistry,
    readPayload: readBoardPayload,
    writePayload: writeBoardPayload,
  }),
  encounters: descriptor({
    ...SECTION_REGISTRY.encounters,
    sanitizeId: sanitizeEncounterId,
    readRegistry: readEncounterRegistry,
    readPayload: readEncounterPayload,
    writePayload: writeEncounterPayload,
  }),
  dmscreen: descriptor({
    ...SECTION_REGISTRY.dmscreen,
    sanitizeId: sanitizeScreenId,
    readRegistry: readScreenRegistry,
    readPayload: readScreenPayload,
    writePayload: writeScreenPayload,
  }),
});

export { SECTION_KEYS };

export function getSectionDescriptor(key) {
  return Object.prototype.hasOwnProperty.call(SECTION_DESCRIPTORS, key)
    ? SECTION_DESCRIPTORS[key]
    : null;
}

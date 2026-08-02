import { normalizeLinkGroupId } from './linkGroupId.js';
import { emitStorageEvent, touchRegistryEntry } from './scopedStoragePayload.js';
import { SECTION_REGISTRY } from './sectionRegistry.js';

// Creating an instance is what saves it locally: the picker registers the entry
// before opening the tool, so the page loads an already-saved instance and its
// autosave effects run from the first edit. That is why the tool pages have no
// "Save instance" button — there is no unsaved draft state to rescue.

export function makeSectionInstanceId(sectionKey, now = Date.now(), random = Math.random) {
  const section = SECTION_REGISTRY[sectionKey];
  if (!section) return '';
  return `${section.idPrefix}_${now.toString(36)}_${random().toString(36).slice(2, 7)}`;
}

export function createSectionInstance(sectionKey, { name, linkGroupId, idFactory = makeSectionInstanceId } = {}) {
  const section = SECTION_REGISTRY[sectionKey];
  if (!section) return null;
  const id = idFactory(sectionKey);
  if (!id) return null;
  const group = normalizeLinkGroupId(linkGroupId);
  let previousRegistry = null;
  try {
    previousRegistry = localStorage.getItem(section.registryKey);
    const entry = touchRegistryEntry(section.registryKey, id, {
      name: String(name || '').trim() || section.defaultName(id),
      ...(group ? { linkGroupId: group } : {}),
    });
    if (!entry) return null;
    localStorage.setItem(section.activeKey, id);
    emitStorageEvent(section.saveEvent, id);
    return entry;
  } catch {
    // Quota/denied write. Roll the registry back and report the failure: a
    // listed entry the caller never got to open would show up in the picker as
    // an instance this creation failed to make.
    restoreRegistry(section.registryKey, previousRegistry);
    return null;
  }
}

function restoreRegistry(registryKey, raw) {
  try {
    if (raw == null) localStorage.removeItem(registryKey);
    else localStorage.setItem(registryKey, raw);
  } catch {}
}

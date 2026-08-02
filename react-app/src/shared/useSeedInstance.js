import { useEffect } from 'react';
import { hasScopedPayload } from './scopedStoragePayload.js';
import { SECTION_REGISTRY } from './sectionRegistry.js';

// Instances are created and registered by the picker, but a registry entry with
// no scoped keys has nothing to sync: cloud pushes skip an empty payload, and
// the autosave effects only write on change, so an instance nobody edited would
// stay local forever. Seeding it on open also covers the URLs that still arrive
// unsaved (`?board=new` deep links from the linked-tools dialog, bookmarks).
//
// `saveInstance` comes from the page's own persistence hook because only that
// hook knows the full payload to write.
export function useSeedInstance(sectionKey, { instanceId, instanceSaved, saveInstance }) {
  useEffect(() => {
    const section = SECTION_REGISTRY[sectionKey];
    if (!section || !instanceId) return;
    if (!instanceSaved || !hasScopedPayload(section.scopedPrefix(instanceId))) saveInstance();
  }, [instanceId, instanceSaved, saveInstance, sectionKey]);
}

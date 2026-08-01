import { requireClient } from './supabaseClient.js';
import { createSectionCloudApi } from './cloudSectionCore.js';
import { SECTION_DESCRIPTORS, getSectionDescriptor } from './sectionDescriptors.js';

export const cloudSections = Object.freeze(Object.fromEntries(
  Object.entries(SECTION_DESCRIPTORS).map(([key, descriptor]) => [
    key,
    createSectionCloudApi(descriptor, { getClient: requireClient }),
  ]),
));

export function getCloudSection(key) {
  if (!getSectionDescriptor(key)) return null;
  return cloudSections[key];
}

export function pushInstance(section, id) {
  return getCloudSection(section)?.pushInstance(id) ?? Promise.resolve(null);
}

export function pullInstance(section, id) {
  const api = getCloudSection(section);
  if (!api) return Promise.reject(new Error('Unknown cloud section.'));
  return api.pullInstance(id);
}

export function fetchInstanceMeta(section, id) {
  return getCloudSection(section)?.fetchInstanceMeta(id) ?? Promise.resolve(null);
}

export function listInstances(section) {
  return getCloudSection(section)?.listInstances() ?? Promise.resolve([]);
}

export function renameCloudInstance(section, id, name) {
  const api = getCloudSection(section);
  if (!api) return Promise.reject(new Error('Unknown cloud section.'));
  return api.renameCloudInstance(id, name);
}

export function setLinkGroup(section, id, linkGroupId) {
  const api = getCloudSection(section);
  if (!api) return Promise.reject(new Error('Unknown cloud section.'));
  return api.setLinkGroup(id, linkGroupId);
}

export function deleteCloudInstance(section, id) {
  return getCloudSection(section)?.deleteCloudInstance(id) ?? Promise.resolve();
}

import { REGISTRY_META } from '../../../shared/storage/localStorageRegistries.js';
import { SECTION_REGISTRY } from '../../../shared/instances/sectionRegistry.js';
import { formatDateTime } from '../../../shared/ui/dateFormat.js';
import { TOOL_CATALOG } from '../../../app/navigation/toolCatalog.js';

// Single data-driven table: slug -> registry key, identity, and routes. Every
// component that needs tool metadata reads from here instead of branching on
// `tool === '...'`.
export const LIBRARY_TOOLS = {
  characters: {
    slug: 'characters',
    registryKey: 'gb_char_registry',
    ...TOOL_CATALOG.characters,
    newRoute: REGISTRY_META.gb_char_registry.newRoute,
    route: REGISTRY_META.gb_char_registry.route,
  },
  gmboard: {
    slug: 'gmboard',
    sectionKey: 'gmboard',
    ...TOOL_CATALOG.gmboard,
    newRoute: SECTION_REGISTRY.gmboard.newRoute,
    route: SECTION_REGISTRY.gmboard.route,
  },
  encounters: {
    slug: 'encounters',
    sectionKey: 'encounters',
    ...TOOL_CATALOG.encounters,
    newRoute: SECTION_REGISTRY.encounters.newRoute,
    route: SECTION_REGISTRY.encounters.route,
  },
  dmscreen: {
    slug: 'dmscreen',
    sectionKey: 'dmscreen',
    ...TOOL_CATALOG.dmscreen,
    newRoute: SECTION_REGISTRY.dmscreen.newRoute,
    route: SECTION_REGISTRY.dmscreen.route,
  },
};

export function resolveTool(slug) {
  if (typeof slug !== 'string' || !Object.prototype.hasOwnProperty.call(LIBRARY_TOOLS, slug)) return null;
  return LIBRARY_TOOLS[slug];
}

export function formatUpdatedAt(ts) {
  return formatDateTime(ts);
}

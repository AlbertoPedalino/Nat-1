import { ScrollText, LayoutDashboard, Swords, StickyNote } from 'lucide-react';
import { REGISTRY_META } from '../../../shared/localStorageRegistries.js';

// Single data-driven table: slug -> registry key, identity, and routes. Every
// component that needs tool metadata reads from here instead of branching on
// `tool === '...'`.
export const LIBRARY_TOOLS = {
  characters: {
    slug: 'characters',
    registryKey: 'gb_char_registry',
    label: 'Character Sheet',
    description: 'View and manage your character in play',
    color: 'success.main',
    icon: ScrollText,
    newRoute: REGISTRY_META.gb_char_registry.newRoute,
    route: REGISTRY_META.gb_char_registry.route,
  },
  gmboard: {
    slug: 'gmboard',
    registryKey: 'gb_board_registry',
    label: 'GM Board',
    description: 'Hexcrawl, dungeon, and quest generators',
    color: 'warning.main',
    icon: LayoutDashboard,
    newRoute: REGISTRY_META.gb_board_registry.newRoute,
    route: REGISTRY_META.gb_board_registry.route,
  },
  encounters: {
    slug: 'encounters',
    registryKey: 'gb_encounter_registry',
    label: 'Encounter Builder',
    description: 'Build and balance combat encounters',
    color: 'error.main',
    icon: Swords,
    newRoute: REGISTRY_META.gb_encounter_registry.newRoute,
    route: REGISTRY_META.gb_encounter_registry.route,
  },
  dmscreen: {
    slug: 'dmscreen',
    registryKey: 'gb_dmscreen_registry',
    label: 'DM Screen',
    description: 'Keep notes and reminders close during play',
    color: 'secondary.main',
    icon: StickyNote,
    newRoute: REGISTRY_META.gb_dmscreen_registry.newRoute,
    route: REGISTRY_META.gb_dmscreen_registry.route,
  },
};

export function resolveTool(slug) {
  if (typeof slug !== 'string' || !Object.prototype.hasOwnProperty.call(LIBRARY_TOOLS, slug)) return null;
  return LIBRARY_TOOLS[slug];
}

export function formatUpdatedAt(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

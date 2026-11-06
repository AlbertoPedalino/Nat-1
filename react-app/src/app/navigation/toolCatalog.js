import { BookOpen, Flag, LayoutDashboard, Map, ScrollText, StickyNote, Swords, UserPen } from 'lucide-react';

// What each tool of the app is called and looks like, wherever it is listed:
// the home page, the library pickers, the linked-tools menu.
export const TOOL_CATALOG = Object.freeze({
  characters: { label: 'Character Sheet', description: 'View and manage your character in play', icon: ScrollText, color: 'success.main' },
  builder: { label: 'Char Builder', description: 'Create or level up your character', icon: UserPen, color: 'gmboard.rarity.Very Rare' },
  campaigns: { label: 'Campaigns', description: 'Create, join, and manage online campaigns', icon: Flag, color: 'primary.main' },
  gmboard: { label: 'GM Board', description: 'Hexcrawl, dungeon, and quest generators', icon: LayoutDashboard, color: 'warning.main' },
  dmscreen: { label: 'DM Screen', description: 'Keep notes and reminders close during play', icon: StickyNote, color: 'secondary.main' },
  vtt: { label: 'Battle Map', description: 'Maps and tokens for the campaigns you run', icon: Map, color: 'info.main' },
  encounters: { label: 'Encounter Builder', description: 'Build and balance combat encounters', icon: Swords, color: 'error.main' },
  compendium: { label: 'Compendium', description: 'Spells, items, monsters and rules in one search', icon: BookOpen, color: 'gmboard.rarity.Rare' },
});

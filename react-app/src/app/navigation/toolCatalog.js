import { TOOL_ICONS } from '../../shared/ui/gameIcons.js';
import { UI_COLORS } from '../../shared/ui/colors.js';

// What each tool of the app is called and looks like, wherever it is listed:
// the home page, its page header, the library pickers, the linked-tools menu,
// the compendium's panel. The icons are TOOL_ICONS (gameIcons.js), so a new
// look changes them there; `color` is a palette hex (a panel's screentone
// needs one), the same wherever the tool's mark is drawn.
export const TOOL_CATALOG = Object.freeze({
  characters: { label: 'Character Sheet', description: 'View and manage your character in play', icon: TOOL_ICONS.characters, color: UI_COLORS.success },
  builder: { label: 'Char Builder', description: 'Create or level up your character', icon: TOOL_ICONS.builder, color: UI_COLORS.spell },
  campaigns: { label: 'Campaigns', description: 'Create, join, and manage online campaigns', icon: TOOL_ICONS.campaigns, color: UI_COLORS.accent },
  gmboard: { label: 'GM Board', description: 'Hexcrawl, dungeon, and quest generators', icon: TOOL_ICONS.gmboard, color: UI_COLORS.warning },
  dmscreen: { label: 'DM Screen', description: 'Keep notes and reminders close during play', icon: TOOL_ICONS.dmscreen, color: UI_COLORS.secondary },
  vtt: { label: 'Battle Map', description: 'Maps and tokens for the campaigns you run', icon: TOOL_ICONS.vtt, color: UI_COLORS.info },
  encounters: { label: 'Encounter Builder', description: 'Build and balance combat encounters', icon: TOOL_ICONS.encounters, color: UI_COLORS.danger },
  compendium: { label: 'Compendium', description: 'Spells, items, monsters and rules in one search', icon: TOOL_ICONS.compendium, color: UI_COLORS.reference },
});

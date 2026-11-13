import { ICON_SIZES } from '../ui/iconSizes.js';
import { ExternalLink } from 'lucide-react';
import { get5eToolsSpellUrl, get5eToolsItemUrl } from './fiveEToolsLinks.js';
import { UI_COLORS } from '../ui/colors.js';
import TipIconButton from '../ui/TipIconButton.jsx';
import { PART_ICON_BUTTON_SX } from '../ui/pressable.js';

// The small "open on 5e.tools" icon beside a name: the page in a new tab,
// without the click reaching the row it sits in. Nothing without an address.
// Part of the name it follows, so it lies flat (PART_ICON_BUTTON_SX).
export function FiveEToolsIcon({ url, size = ICON_SIZES.sm }) {
  if (!url) return null;
  return (
    <TipIconButton title="Open on 5e.tools" arrow href={url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} size="small" sx={[PART_ICON_BUTTON_SX, { width: 22, height: 22, color: 'text.secondary', '&:hover': { color: UI_COLORS.accentText } }]}>
      <ExternalLink size={size} aria-hidden />
    </TipIconButton>
  );
}

export function SpellNameIcon({ spell, size = ICON_SIZES.sm }) {
  return <FiveEToolsIcon url={get5eToolsSpellUrl(spell)} size={size} />;
}

// A homebrew item has no page there.
export function ItemNameIcon({ item, size = ICON_SIZES.sm }) {
  if (String(item.source || '').toLowerCase() === 'custom') return null;
  return <FiveEToolsIcon url={get5eToolsItemUrl(item)} size={size} />;
}

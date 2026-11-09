import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { ExternalLink } from 'lucide-react';
import { get5eToolsSpellUrl, get5eToolsItemUrl } from './fiveEToolsLinks.js';
import { UI_COLORS } from '../ui/colors.js';

// The small "open on 5e.tools" icon beside a name: the page in a new tab,
// without the click reaching the row it sits in. Nothing without an address.
export function FiveEToolsIcon({ url, size = 14 }) {
  if (!url) return null;
  return (
    <Tooltip title="Open on 5e.tools" arrow>
      <IconButton
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Open on 5e.tools"
        onClick={(e) => e.stopPropagation()}
        size="small"
        sx={{ width: 22, height: 22, color: 'text.secondary', '&:hover': { color: UI_COLORS.goldLight } }}
      >
        <ExternalLink size={size} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}

export function SpellNameIcon({ spell, size = 14 }) {
  return <FiveEToolsIcon url={get5eToolsSpellUrl(spell)} size={size} />;
}

// A homebrew item has no page there.
export function ItemNameIcon({ item, size = 14 }) {
  if (String(item.source || '').toLowerCase() === 'custom') return null;
  return <FiveEToolsIcon url={get5eToolsItemUrl(item)} size={size} />;
}

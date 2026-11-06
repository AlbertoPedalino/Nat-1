import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { ExternalLink } from 'lucide-react';
import { get5eToolsSpellUrl, get5eToolsItemUrl } from './fiveEToolsLinks.js';
import { UI_COLORS } from '../ui/colors.js';

export function SpellNameIcon({ spell, size = 14 }) {
  const url = get5eToolsSpellUrl(spell);
  if (!url) return null;
  return (
    <Tooltip title="Open on 5e.tools" arrow>
      <IconButton
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        size="small"
        sx={{ width: 22, height: 22, color: 'text.secondary', '&:hover': { color: UI_COLORS.goldLight } }}
      >
        <ExternalLink size={size} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}

export function ItemNameIcon({ item, size = 14 }) {
  if (String(item.source || '').toLowerCase() === 'custom') return null;
  const url = get5eToolsItemUrl(item);
  if (!url) return null;
  return (
    <Tooltip title="Open on 5e.tools" arrow>
      <IconButton
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        onClick={(e) => e.stopPropagation()}
        size="small"
        sx={{ width: 22, height: 22, color: 'text.secondary', '&:hover': { color: UI_COLORS.goldLight } }}
      >
        <ExternalLink size={size} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}

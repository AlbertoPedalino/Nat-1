import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { ExternalLink } from 'lucide-react';
import { get5eToolsSpellUrl, get5eToolsItemUrl } from './fiveEToolsLinks.js';

function FiveEToolsLinkContent({ url, children, noIcon }) {
  return (
    <>
      {url ? (
        <Link
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          underline="hover"
          color="inherit"
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            fontWeight: 'inherit', cursor: 'pointer',
            '&:hover': { color: '#edd48a' },
          }}
        >
          {children}
          {!noIcon && <ExternalLink size={12} aria-hidden style={{ flexShrink: 0, opacity: 0.5 }} />}
        </Link>
      ) : (
        <Box component="span" sx={{ display: 'inline', color: 'inherit' }}>{children}</Box>
      )}
    </>
  );
}

export function SpellNameLink({ spell, children, sx, noIcon }) {
  if (!spell?.name) return null;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <FiveEToolsLinkContent url={get5eToolsSpellUrl(spell)} noIcon={noIcon}>
        {children ?? spell.name}
      </FiveEToolsLinkContent>
    </Box>
  );
}

export function ItemNameLink({ item, children, sx, noIcon }) {
  if (!item?.name) return null;
  if (String(item.source || '').toLowerCase() === 'custom') {
    return <Box component="span" sx={{ display: 'inline', color: 'inherit', ...sx }}>{children ?? item.name}</Box>;
  }
  const url = get5eToolsItemUrl(item);
  if (!url) {
    return <Box component="span" sx={{ display: 'inline', color: 'inherit', ...sx }}>{children ?? item.name}</Box>;
  }
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ...sx }}>
      <FiveEToolsLinkContent url={url} noIcon={noIcon}>
        {children ?? item.name}
      </FiveEToolsLinkContent>
    </Box>
  );
}

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
        sx={{ width: 22, height: 22, color: 'text.secondary', '&:hover': { color: '#edd48a' } }}
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
        sx={{ width: 22, height: 22, color: 'text.secondary', '&:hover': { color: '#edd48a' } }}
      >
        <ExternalLink size={size} aria-hidden />
      </IconButton>
    </Tooltip>
  );
}

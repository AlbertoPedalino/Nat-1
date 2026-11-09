import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { EntryBlocks } from '../../content/EntryBlocks.jsx';
import { RICH_TEXT_ACCENT } from '../../ui/entityColors.js';
import {
  areMasteriesLoaded,
  getWeaponMasteryEntries,
  getWeaponMasteryName,
  loadMasteryEntries,
} from './weaponMastery.js';
import { stripSource } from '../../content/nameKeys.js';
import { FONT_SIZES } from '../../ui/fonts.js';

// First mastery code stripped of its source suffix ("Graze|XPHB" -> "Graze").
// Accepts the raw item.mastery array, a single tagged string, or a clean name.
export function masteryCodeOf(mastery) {
  const raw = Array.isArray(mastery) ? mastery.find(Boolean) : mastery;
  return raw ? stripSource(raw) : '';
}

// Loads the mastery dataset once (module-cached) and re-renders when ready.
// `active` skips the work when there is no mastery to resolve.
export function useMasteryEntries(active = true) {
  const [loaded, setLoaded] = useState(areMasteriesLoaded);
  useEffect(() => {
    if (!active || loaded) return undefined;
    let alive = true;
    loadMasteryEntries().then(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, [active, loaded]);
  return loaded;
}

// Single source of truth for rendering a weapon mastery's name + rich-text
// description. `variant`:
//   'tag'   - gold "Weapon Mastery — Name" header (sheet inventory, Actions tab)
//   'title' - bare name as a heading (builder mastery picker, where the row
//             label is already the weapon)
export function WeaponMasteryBlock({ mastery, variant = 'tag', fontSize, sx }) {
  const code = masteryCodeOf(mastery);
  const loaded = useMasteryEntries(!!code);
  if (!code) return null;
  const name = getWeaponMasteryName(code) || code;
  const entries = getWeaponMasteryEntries(code);
  return (
    <Box sx={{ mt: variant === 'tag' ? 0.75 : 0, ...sx }}>
      {variant === 'title' ? (
        <Typography variant="h2" sx={{ color: RICH_TEXT_ACCENT }}>{name}</Typography>
      ) : (
        <Typography sx={{ fontSize: FONT_SIZES.sm, color: RICH_TEXT_ACCENT, fontWeight: 700 }}>
          Weapon Mastery — {name}
        </Typography>
      )}
      {entries?.length ? (
        <EntryBlocks entries={entries} fontSize={fontSize} emptyText="" />
      ) : (
        <Typography sx={{ fontSize, color: 'text.secondary' }}>
          {loaded ? 'Mastery description unavailable.' : 'Loading mastery description...'}
        </Typography>
      )}
    </Box>
  );
}

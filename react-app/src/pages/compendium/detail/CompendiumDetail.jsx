import { useCallback, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { EntryBlocks } from '../../../shared/content/EntryBlocks.jsx';
import { ItemNameIcon, SpellNameIcon } from '../../../shared/content/FiveEToolsLink.jsx';
import { HigherLevelBlock, SpellMetaGrid } from '../../../shared/character/spells/SpellReference.jsx';
import { ItemReferenceBody } from '../../../shared/character/inventory/ItemReference.jsx';
import DiceToast from '../../../shared/character/dice/DiceToast.jsx';
import { COMPENDIUM_KIND_COLORS } from '../../../shared/ui/entityColors.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { StatBlockHeader, StatBlockSheet } from '../../../shared/bestiary/StatBlockSheet.jsx';
import { rollDice } from '../../../shared/character/dice/rollNotation.js';
import { buildEncounterDiceToast } from '../../../shared/character/dice/encounterDiceToast.js';
import { compendiumKind } from '../search/compendiumIndex.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// One compendium entry, shown the way the rest of the app shows that kind: a
// spell as on the sheet, a monster as the encounter builder's stat block (its
// numbers roll, for whoever is reading), everything else as its rules text.
export default function CompendiumDetail({ entry, legendaryGroups }) {
  const [toast, setToast] = useState(null);
  const handleRoll = useCallback(({ notation, type, advantage }) => {
    const result = rollDice(notation, type, Math.random, { advantage });
    if (result) setToast(buildEncounterDiceToast({ ...result, actor: entry?.name }));
  }, [entry?.name]);

  if (!entry) return null;
  const { kind, record } = entry;

  if (kind === 'monster') {
    return (
      <Stack spacing={1.5}>
        <Box sx={monsterHeaderSx}><StatBlockHeader monster={record} /></Box>
        <StatBlockSheet monster={record} legendaryGroups={legendaryGroups} onRoll={handleRoll} />
        <DiceToast toast={toast} onClose={() => setToast(null)} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h2" component="h2" sx={titleSx}>{entry.name}</Typography>
          {kind === 'spell' ? <SpellNameIcon spell={record} /> : null}
          {kind === 'item' ? <ItemNameIcon item={record} /> : null}
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <MiniBadge label={compendiumKind(kind)?.single || kind} color={COMPENDIUM_KIND_COLORS[kind]} />
          {/* "Condition" beside a Condition tag says nothing new. */}
          {entry.subtitle && entry.subtitle !== compendiumKind(kind)?.single
            ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.subtitle}</Typography>
            : null}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{entry.source}</Typography>
        </Stack>
      </Box>
      {entry.image ? (
        <Box component="img" src={entry.image} alt={entry.name} loading="lazy" sx={pictureSx} />
      ) : null}
      {kind === 'spell' ? <SpellMetaGrid spell={record} /> : null}
      {/* As the item card shows it, but for its attunement: whether it is
          required is in the line above, and nobody here is attuned to it. */}
      {kind === 'item'
        ? <ItemReferenceBody item={record} exclude={['type', 'rarity', 'attunement']} />
        : <EntryBlocks entries={record.descriptionEntries || record.entries} />}
      {kind === 'spell' ? <HigherLevelBlock entries={record.higherLevelEntries} /> : null}
    </Stack>
  );
}

// An item's picture, large: it is what the entry is opened for as often as
// its text.
const pictureSx = {
  alignSelf: 'center',
  maxWidth: '100%',
  maxHeight: { xs: 320, sm: 480 },
  objectFit: 'contain',
  borderRadius: 1,
};

const titleSx = {
  fontSize: FONT_SIZES.lead,
};

const monsterHeaderSx = {
  position: 'relative',
};

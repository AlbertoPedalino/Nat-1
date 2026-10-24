import { useCallback, useState } from 'react';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { EntryBlocks } from '../../shared/content/EntryBlocks.jsx';
import { get5eToolsItemUrl, get5eToolsSpellUrl } from '../../shared/content/fiveEToolsLinks.js';
import { HigherLevelBlock, SpellMetaGrid } from '../../shared/character/spells/SpellReference.jsx';
import { decodeDamageType, itemPropertyLabels } from '../../shared/character/inventory/itemCodes.js';
import DiceToast from '../../shared/character/dice/DiceToast.jsx';
import { COMPENDIUM_KIND_COLORS, chipTintStyle } from '../../shared/ui/entityColors.js';
import { StatBlockHeader, StatBlockSheet } from '../encounterbuilder/bestiary/StatBlockDialog.jsx';
import { monster5eUrl } from '../encounterbuilder/bestiary/monsterUtils.js';
import { rollDice } from '../encounterbuilder/rolls/dice.js';
import { buildEncounterDiceToast } from '../encounterbuilder/rolls/EncounterDiceToast.jsx';
import { compendiumKind } from './compendiumIndex.js';

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

  const url = kind === 'spell' ? get5eToolsSpellUrl(record) : kind === 'item' ? get5eToolsItemUrl(record) : null;
  return (
    <Stack spacing={1.25}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h2" component="h2" sx={titleSx}>{entry.name}</Typography>
          {url ? (
            <Link href={url} target="_blank" rel="noopener" aria-label={`${entry.name} on 5e.tools`} sx={linkSx}>
              <ExternalLink size={14} />
            </Link>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
          <Chip size="small" variant="outlined" label={compendiumKind(kind)?.single || kind} sx={chipTintStyle(COMPENDIUM_KIND_COLORS[kind])} />
          {/* "Condition" beside a Condition tag says nothing new. */}
          {entry.subtitle && entry.subtitle !== compendiumKind(kind)?.single
            ? <Typography variant="body2" color="text.secondary">{entry.subtitle}</Typography>
            : null}
          <Typography variant="caption" color="text.secondary">{entry.source}</Typography>
        </Stack>
      </Box>
      {kind === 'spell' ? <SpellMetaGrid spell={record} /> : null}
      {kind === 'item' ? <ItemFacts item={record} /> : null}
      <EntryBlocks entries={record.descriptionEntries || record.entries} />
      {kind === 'spell' ? <HigherLevelBlock entries={record.higherLevelEntries} /> : null}
    </Stack>
  );
}

function ItemFacts({ item }) {
  const facts = [
    item.dmg1 ? `${item.dmg1}${item.dmgType ? ` ${decodeDamageType(item.dmgType)}` : ''}` : '',
    item.ac ? `AC ${item.ac}` : '',
    ...itemPropertyLabels(item),
    item.weight ? `${item.weight} lb.` : '',
    item.value ? formatValue(item.value) : '',
  ].filter(Boolean);
  if (!facts.length) return null;
  return <Typography variant="body2" color="text.secondary">{facts.join(' · ')}</Typography>;
}

// 5etools values are in copper pieces.
function formatValue(copper) {
  if (copper >= 100 && copper % 100 === 0) return `${copper / 100} gp`;
  if (copper >= 10 && copper % 10 === 0) return `${copper / 10} sp`;
  return `${copper} cp`;
}

const titleSx = {
  fontSize: '1.15rem',
};

const linkSx = {
  display: 'inline-flex',
  color: 'text.secondary',
  '&:hover': { color: 'primary.main' },
};

const monsterHeaderSx = {
  position: 'relative',
};

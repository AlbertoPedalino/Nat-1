import { useMemo, useState } from 'react';
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Sparkles, X } from 'lucide-react';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import SearchField from '../../../shared/character/SearchField.jsx';
import { filterOptions } from '../../../shared/character/searchText.js';
import { findFamiliarBeasts } from '../../../shared/character/beasts.js';
import { WILD_SHAPE_RESOURCE_KEY } from '../../../shared/character/wildShapeForm.js';
import { getSheetSlots } from '../logic/spellsTabLogic.js';
import { consumeSlot, getRegularSlotUsed } from '../../../shared/character/spellSlots.js';
import { BeastNameLink, BeastStatBlock, panelSx, headerSx, subSx, rowSx } from './BeastStatBlock.jsx';
import { useBeastsDb } from '../hooks/useBeastsDb.js';
import {
  getActiveWildCompanion,
  summonWildCompanionPatch,
  dismissWildCompanionPatch,
} from '../../../shared/character/wildCompanionForm.js';

// Sheet panel for the Druid's Wild Companion (XPHB 2024). Casts Find Familiar by
// expending either a Wild Shape use or a spell slot: pick any Beast of CR 0 to
// summon as a Fey familiar that lasts until a Long Rest. The familiar is a
// separate creature (no transform / stat override) — its form is stored at
// C.wildCompanion for the stat block.

// Lowest available regular spell-slot level. Find Familiar is a 1st-level spell,
// so any slot of level 1+ works and the cheapest one is preferred.
function lowestAvailableSlotLevel(regularSlots, sheet) {
  const used = sheet?.spellSlotUsed || {};
  const created = sheet?.createdSpellSlots || {};
  for (let lv = 1; lv <= regularSlots.length; lv++) {
    const total = Number(regularSlots[lv - 1] || 0);
    if (!total) continue;
    if (total - getRegularSlotUsed(used, lv) + Number(created[lv] || 0) > 0) return lv;
  }
  return 0;
}

export default function WildCompanionPanel({ character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const beastsDb = useBeastsDb();
  const [query, setQuery] = useState('');
  const [costMode, setCostMode] = useState('ws'); // 'ws' | 'slot'

  const usesLeft = Number(resources?.[WILD_SHAPE_RESOURCE_KEY] ?? 0);
  const regularSlots = useMemo(() => getSheetSlots(character)?.regular || [], [character]);
  const slotLevel = useMemo(() => lowestAvailableSlotLevel(regularSlots, sheet), [regularSlots, sheet]);
  const canWildShape = usesLeft > 0;
  const canSlot = slotLevel > 0;
  const canSummon = canWildShape || canSlot;
  // Honor the picked cost method, but fall back to whichever is actually
  // available so the Summon button always spends something valid.
  const effectiveCost = costMode === 'slot'
    ? (canSlot ? 'slot' : 'ws')
    : (canWildShape ? 'ws' : 'slot');

  const active = getActiveWildCompanion(character);
  const familiars = useMemo(() => findFamiliarBeasts(beastsDb), [beastsDb]);
  // Match the app-wide search behaviour (accent-folding, multi-term) and the
  // builder's beast picker by searching name + CR + size through filterOptions.
  const visible = useMemo(
    () => filterOptions(familiars, query, (b) => `${b.name} ${b.cr} ${b.size}`),
    [familiars, query],
  );

  const summon = (beast) => {
    if (!beast || !onUpdateCharacter || !canSummon) return;
    if (effectiveCost === 'slot') {
      if (!consumeSlot(regularSlots, sheet, slotLevel, onUpdateSheet, onUpdateCharacter)) return;
    } else if (typeof onResChange === 'function') {
      onResChange(WILD_SHAPE_RESOURCE_KEY, -1);
    }
    onUpdateCharacter((prev) => ({ ...prev, ...summonWildCompanionPatch(beast) }));
  };
  const dismiss = () => {
    if (!onUpdateCharacter) return;
    onUpdateCharacter((prev) => ({ ...prev, ...dismissWildCompanionPatch() }));
  };

  if (active) {
    const b = active.beast;
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
          <Sparkles size={14} color="#edd48a" />
          <Typography sx={headerSx} component="span">Familiar —</Typography>
          <BeastNameLink name={b.name} source={b.source} sx={headerSx} />
        </Box>
        <BeastStatBlock b={b} typeLabel="Fey" hpLabel="HP" />
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6 }}>
          A Fey spirit; rolls its own Initiative and acts on its own turn. It can't attack, but takes other actions normally. Vanishes when you finish a Long Rest.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<X size={13} />}
          onClick={dismiss}
          sx={{ mt: 0.8, fontSize: '0.7rem', borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
        >
          Dismiss familiar
        </Button>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
        <Sparkles size={14} color="#edd48a" />
        <Typography sx={headerSx}>Summon Familiar — CR 0 Beast</Typography>
      </Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={canSummon ? effectiveCost : null}
        onChange={(e, v) => { e.stopPropagation(); if (v) setCostMode(v); }}
        sx={{ mb: 0.6 }}
      >
        <ToggleButton value="ws" disabled={!canWildShape} sx={toggleSx}>
          {canWildShape ? `Wild Shape (${usesLeft})` : 'Wild Shape'}
        </ToggleButton>
        <ToggleButton value="slot" disabled={!canSlot} sx={toggleSx}>
          {canSlot ? `Spell Slot (Lv ${slotLevel})` : 'Spell Slot'}
        </ToggleButton>
      </ToggleButtonGroup>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search beasts…"
        stopPropagation
        sx={{ mb: 0.6, '& .MuiInputBase-input': { fontSize: '0.74rem', py: '6px' } }}
      />
      {!familiars.length ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic' }}>Loading beasts…</Typography>
      ) : (
        <Stack spacing={0.5} sx={{ maxHeight: 260, overflow: 'auto' }}>
          {visible.map((beast) => (
            <Box key={`${beast.name}|${beast.source}`} sx={rowSx}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <BeastNameLink name={beast.name} source={beast.source} sx={{ fontSize: '0.8rem' }} />
                <Typography noWrap sx={subSx}>{`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average}`}</Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                disabled={!canSummon}
                onClick={() => summon(beast)}
                sx={{ fontSize: '0.68rem', flexShrink: 0, borderColor: 'rgba(202,165,80,0.5)', color: '#edd48a' }}
              >
                Summon
              </Button>
            </Box>
          ))}
          {!visible.length ? <Typography sx={{ ...subSx, fontStyle: 'italic' }}>No matches.</Typography> : null}
        </Stack>
      )}
      <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6, color: canSummon ? 'text.secondary' : '#c98a8a' }}>
        {!canSummon
          ? 'No Wild Shape uses or spell slots left — finish a rest.'
          : `Summoning spends ${effectiveCost === 'slot' ? `a level ${slotLevel} spell slot` : 'one Wild Shape use'}; the familiar is Fey and lasts until a Long Rest.`}
      </Typography>
    </Box>
  );
}

const toggleSx = {
  fontSize: '0.66rem',
  py: '3px',
  px: '10px',
  textTransform: 'none',
  color: '#edd48a',
  borderColor: 'rgba(202,165,80,0.4)',
  '&.Mui-selected': { bgcolor: 'rgba(237,212,138,0.18)', color: '#edd48a' },
  '&.Mui-selected:hover': { bgcolor: 'rgba(237,212,138,0.24)' },
};

import { useMemo, useState } from 'react';
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import HpPoolBar from '../../../shared/character/combat/HpPoolBar.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { filterOptions } from '../../../shared/content/searchText.js';
import { findFamiliarBeasts } from '../../../shared/character/forms/beasts.js';
import { WILD_SHAPE_RESOURCE_KEY } from '../../../shared/character/forms/wildShapeForm.js';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import {
  consumeSlot,
  lowestAvailableSlotLevel,
} from '../../../shared/character/spells/spellSlots.js';
import {
  BeastNameLink,
  BeastStatBlock,
  BeastPickerRow,
  creatureHpBoxSx,
  panelSx,
  headerSx,
  subSx,
  dismissButtonSx,
} from './BeastStatBlock.jsx';
import { useBeastsDb } from './useBeastsDb.js';
import { useCreatureRolls } from './useCreatureRolls.js';
import {
  getActiveWildCompanion,
  getWildCompanionHp,
  setWildCompanionHpPatch,
  summonWildCompanionPatch,
  dismissWildCompanionPatch,
} from '../../../shared/character/forms/wildCompanionForm.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

// Sheet panel for the Druid's Wild Companion (XPHB 2024). Casts Find Familiar by
// expending either a Wild Shape use or a spell slot: pick any Beast of CR 0 to
// summon as a Fey familiar that lasts until a Long Rest. The familiar is a
// separate creature (no transform / stat override) — its form is stored at
// C.wildCompanion for the stat block.

export default function WildCompanionPanel({ character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  // The familiar is its own creature: its rolls never take the druid's
  // exhaustion penalty.
  const { rollCheck, rollFormulaToast } = useCreatureRolls();
  const beastsDb = useBeastsDb();
  const [query, setQuery] = useState('');
  const [costMode, setCostMode] = useState('ws'); // 'ws' | 'slot'
  const [hpStep, setHpStep] = useState('1'); // persistent heal/damage step for the familiar HP tracker

  const usesLeft = Number(resources?.[WILD_SHAPE_RESOURCE_KEY] ?? 0);
  const regularSlots = useMemo(() => getSpellSlots(character)?.regular || [], [character]);
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

  // Apply a signed HP delta to the familiar, resolving/clamping against the latest
  // state so rapid clicks never race off a stale current value.
  const applyHpDelta = (delta) => onUpdateCharacter?.((prev) => {
    const cur = getWildCompanionHp(prev)?.current ?? 0;
    return { ...prev, ...setWildCompanionHpPatch(prev, cur + delta) };
  });

  if (active) {
    const b = active.beast;
    const hp = getWildCompanionHp(character);
    return (
      <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
          <Sparkles size={14} color={UI_COLORS.goldLight} />
          <Typography sx={headerSx} component="span">Familiar —</Typography>
          <BeastNameLink name={b.name} source={b.source} sx={headerSx} />
          <Button size="small" onClick={dismiss} sx={{ ...dismissButtonSx, ml: 'auto' }}>
            Dismiss familiar
          </Button>
        </Box>
        {hp ? (
          <Box sx={creatureHpBoxSx}>
            <HpPoolBar
              current={hp.current}
              max={hp.max}
              onDelta={applyHpDelta}
              amount={hpStep}
              onAmount={setHpStep}
              plusLabel="Heal familiar"
              minusLabel="Damage familiar"
              stateLabel="down"
            />
          </Box>
        ) : null}
        <BeastStatBlock b={b} typeLabel="Fey" hpLabel="HP" onRoll={rollCheck} onRollFormula={rollFormulaToast} />
        <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6 }}>
          A Fey spirit; rolls its own Initiative and acts on its own turn. It can't attack, but takes other actions normally. Vanishes when you finish a Long Rest.
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
        <Sparkles size={14} color={UI_COLORS.goldLight} />
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
        sx={{ mb: 0.6, '& .MuiInputBase-input': { fontSize: FONT_SIZES.md, py: '6px' } }}
      />
      {!familiars.length ? (
        <Typography sx={{ ...subSx, fontStyle: 'italic' }}>Loading beasts…</Typography>
      ) : (
        <Stack spacing={0.5} sx={{ maxHeight: 260, overflow: 'auto' }}>
          {visible.map((beast) => (
            <BeastPickerRow
              key={`${beast.name}|${beast.source}`}
              beast={beast}
              name={beast.name}
              source={beast.source}
              summary={`CR ${beast.cr} · ${beast.size} · AC ${beast.ac ?? '—'} · HP ${beast.hp.average}`}
              actionLabel="Summon"
              onAction={() => summon(beast)}
              actionDisabled={!canSummon}
              typeLabel="Fey"
            />
          ))}
          {!visible.length ? <Typography sx={{ ...subSx, fontStyle: 'italic' }}>No matches.</Typography> : null}
        </Stack>
      )}
      <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.6, color: canSummon ? 'text.secondary' : UI_COLORS.dangerMuted }}>
        {!canSummon
          ? 'No Wild Shape uses or spell slots left — finish a rest.'
          : `Summoning spends ${effectiveCost === 'slot' ? `a level ${slotLevel} spell slot` : 'one Wild Shape use'}; the familiar is Fey and lasts until a Long Rest.`}
      </Typography>
    </Box>
  );
}

const toggleSx = {
  fontSize: FONT_SIZES.sm,
  py: '3px',
  px: '10px',
  textTransform: 'none',
  color: UI_COLORS.goldLight,
  borderColor: uiAlpha(UI_COLORS.gold, 0.4),
  '&.Mui-selected': { bgcolor: uiAlpha(UI_COLORS.goldLight, 0.18), color: UI_COLORS.goldLight },
  '&.Mui-selected:hover': { bgcolor: uiAlpha(UI_COLORS.goldLight, 0.24) },
};

import { useMemo, useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import HpPoolBar from '../../../shared/character/combat/HpPoolBar.jsx';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { filterOptions } from '../../../shared/content/searchText.js';
import { beastSummary, findFamiliarBeasts } from '../../../shared/character/forms/beasts.js';
import { WILD_SHAPE_RESOURCE_KEY } from '../../../shared/character/forms/wildShapeForm.js';
import {
  BeastTitle,
  BeastStatBlock,
  BeastPickerRow,
  creatureHpBoxSx,
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
import DetailPanel, { DetailNote } from '../layout/DetailPanel.jsx';
import { filterByBooks } from '../../../shared/content/booksView.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import { useCostMode } from './useCostMode.js';
import CostModeToggle from './CostModeToggle.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// Sheet panel for the Druid's Wild Companion (XPHB 2024). Casts Find Familiar by
// expending either a Wild Shape use or a spell slot: pick any Beast of CR 0 to
// summon as a Fey familiar that lasts until a Long Rest. The familiar is a
// separate creature (no transform / stat override) — its form is stored at
// C.wildCompanion for the stat block.

export default function WildCompanionPanel({ character, sheet, resources, onResChange }) {
  const { onUpdateCharacter } = useSheetActions();
  // The familiar is its own creature: its rolls never take the druid's
  // exhaustion penalty.
  const { rollCheck, rollFormulaToast } = useCreatureRolls();
  const beastsDb = useBeastsDb();
  const [query, setQuery] = useState('');
  const [hpStep, setHpStep] = useState('1'); // persistent heal/damage step for the familiar HP tracker

  // Find Familiar is cast with a Wild Shape use or a spell slot.
  const costMode = useCostMode({
    character,
    sheet,
    usesLeft: Number(resources?.[WILD_SHAPE_RESOURCE_KEY] ?? 0),
    resKey: WILD_SHAPE_RESOURCE_KEY,
    onResChange,
  });
  const { canPay: canSummon, cost, slotLevel } = costMode;

  const active = getActiveWildCompanion(character);
  const familiars = useMemo(() => findFamiliarBeasts(filterByBooks(beastsDb, character)), [beastsDb, character]);
  // Match the app-wide search behaviour (accent-folding, multi-term) and the
  // builder's beast picker by searching name + CR + size through filterOptions.
  const visible = useMemo(
    () => filterOptions(familiars, query, (b) => `${b.name} ${b.cr} ${b.size}`),
    [familiars, query],
  );

  const summon = (beast) => {
    if (!beast || !onUpdateCharacter || !costMode.spend()) return;
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
      <DetailPanel
        icon={GAME_ICONS.beast}
        title="Familiar —"
        titleNode={<BeastTitle name={b.name} source={b.source} />}
        aside={(
          <Button size="small" onClick={dismiss} sx={dismissButtonSx}>
            Dismiss familiar
          </Button>
        )}
      >
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
        <DetailNote>
          A Fey spirit; rolls its own Initiative and acts on its own turn. It can't attack, but takes other actions normally. Vanishes when you finish a Long Rest.
        </DetailNote>
      </DetailPanel>
    );
  }

  return (
    <DetailPanel icon={GAME_ICONS.beast} title="Summon Familiar — CR 0 Beast">
      <CostModeToggle costMode={costMode} useLabel="Wild Shape" sx={{ mb: 0.5 }} />
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Search beasts…"
        stopPropagation
        density="compact"
        sx={{ mb: 0.5 }}
      />
      {!familiars.length ? (
        <DetailNote sx={{ mt: 0 }}>Loading beasts…</DetailNote>
      ) : (
        <Stack spacing={0.5} sx={{ maxHeight: 260, overflow: 'auto' }}>
          {visible.map((beast) => (
            <BeastPickerRow
              key={`${beast.name}|${beast.source}`}
              beast={beast}
              name={beast.name}
              source={beast.source}
              summary={beastSummary(beast)}
              actionLabel="Summon"
              onAction={() => summon(beast)}
              actionDisabled={!canSummon}
              typeLabel="Fey"
            />
          ))}
          {!visible.length ? <EmptyLine>No matches.</EmptyLine> : null}
        </Stack>
      )}
      <DetailNote warn={!canSummon}>
        {!canSummon
          ? 'No Wild Shape uses or spell slots left — finish a rest.'
          : `Summoning spends ${cost === 'slot' ? `a level ${slotLevel} spell slot` : 'one Wild Shape use'}; the familiar is Fey and lasts until a Long Rest.`}
      </DetailNote>
    </DetailPanel>
  );
}


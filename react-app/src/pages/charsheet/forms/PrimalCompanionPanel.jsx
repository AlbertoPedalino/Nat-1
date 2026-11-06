import { useMemo, useState } from 'react';
import {
  Box, Button, CircularProgress, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { PawPrint } from 'lucide-react';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { getFinal, getMod, getPB } from '../state/calculations.js';
import { getSheetSlots } from '../spells/spellcasting.js';
import {
  consumeSlot,
  lowestAvailableSlotLevel,
} from '../../../shared/character/spells/spellSlots.js';
import { classLevel } from '../../../shared/character/progression/classLevel.js';
import HpPoolBar from '../../../shared/character/combat/HpPoolBar.jsx';
import {
  findSummonedCreature,
  normalizeSummonedCreature,
} from '../../../shared/character/forms/summonedCreatures.js';
import {
  BESTIAL_FURY_LEVEL,
  EXCEPTIONAL_TRAINING_LEVEL,
  PRIMAL_BEASTS,
  PRIMAL_BEAST_SOURCE,
  SHARE_SPELLS_LEVEL,
  applyPrimalCompanionTraits,
  getPrimalCompanion,
  primalCompanionHp,
  primalStrikeDamageTypes,
  restorePrimalCompanionPatch,
  setPrimalCompanionHpPatch,
  setPrimalDamageTypePatch,
  summonPrimalBeastPatch,
} from '../../../shared/character/forms/primalCompanionForm.js';
import {
  BeastNameLink,
  BeastStatBlock,
  CreatureOptionRow,
  creatureHpBoxSx,
  headerSx,
  optionToggleSx,
  panelSx,
  subSx,
} from './BeastStatBlock.jsx';
import { useSummonedCreatureRecords } from './useSummonedCreatureRecords.js';
import { useCreatureRolls } from './useCreatureRolls.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';

// Sheet panel for the Beast Master's Primal Companion (XPHB 2024), in the
// family of the Eldritch Cannon and Wild Companion panels: pick the beast and
// its Beast's Strike damage type, track its HP, revive it with a spell slot at
// 0 HP, and roll from its stat block (scaled to the Ranger, Primal Bond applied).
export default function PrimalCompanionPanel({ character, sheet }) {
  const { onUpdateCharacter, onUpdateSheet } = useSheetActions();
  const { records, status } = useSummonedCreatureRecords();
  const { rollCheck, rollFormulaToast } = useCreatureRolls();
  const [hpAmt, setHpAmt] = useState('1');
  const C = character;

  const rangerLevel = classLevel(C, 'Ranger');
  const companion = getPrimalCompanion(C, { rangerLevel });
  const pb = getPB(C);
  const wisMod = getMod(getFinal(C, 'wis'));
  const spellAttack = pb + wisMod;
  const spellDc = 8 + spellAttack;

  const record = useMemo(
    () => findSummonedCreature(records, companion.beast, PRIMAL_BEAST_SOURCE),
    [records, companion.beast],
  );
  const creature = useMemo(() => applyPrimalCompanionTraits(
    normalizeSummonedCreature(record, {
      classLevel: rangerLevel,
      abilityMod: wisMod,
      spellAttackBonus: spellAttack,
      spellSaveDc: spellDc,
    }),
    { proficiencyBonus: pb, damageType: companion.damageType },
  ), [record, rangerLevel, wisMod, spellAttack, spellDc, pb, companion.damageType]);

  const maxHp = Math.max(1, Number(creature?.hp?.average) || 1);
  const currentHp = primalCompanionHp(companion, maxHp);
  const dead = currentHp <= 0;
  const regularSlots = useMemo(() => getSheetSlots(C)?.regular || [], [C]);
  const reviveSlot = lowestAvailableSlotLevel(regularSlots, sheet);
  const damageTypes = primalStrikeDamageTypes(companion.beast, rangerLevel);
  const rules = companionRules(rangerLevel);

  // `patchFor(prev)` builds the patch from the latest character.
  const update = (patchFor) => {
    onUpdateCharacter?.((prev) => {
      const patch = patchFor(prev);
      return patch ? { ...prev, ...patch } : prev;
    });
  };
  const save = (patch) => { if (patch) update(() => patch); };
  const summon = (beastName) => update((prev) => summonPrimalBeastPatch(prev, beastName, rangerLevel));
  const applyHp = (delta) => {
    const next = currentHp + delta;
    if (delta && next !== currentHp) save(setPrimalCompanionHpPatch(companion, next, maxHp));
  };
  const revive = () => {
    if (!reviveSlot || !consumeSlot(regularSlots, sheet, reviveSlot, onUpdateSheet, onUpdateCharacter)) return;
    save(restorePrimalCompanionPatch(companion));
  };

  if (status === 'loading') {
    return (
      <Box onClick={(event) => event.stopPropagation()} sx={{ ...panelSx, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={subSx}>Loading primal beast…</Typography>
      </Box>
    );
  }
  if (!creature) {
    return (
      <Box onClick={(event) => event.stopPropagation()} sx={panelSx}>
        <Typography sx={subSx} color={status === 'error' ? 'error.main' : 'text.secondary'}>
          Primal beast stat block unavailable.
        </Typography>
      </Box>
    );
  }

  return (
    <Box onClick={(event) => event.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.6 }}>
        <PawPrint size={14} color={UI_COLORS.goldLight} />
        <BeastNameLink name={creature.name} source={creature.source} sx={headerSx} />
        <Typography sx={{ ...subSx, ml: 'auto' }}>Ranger {rangerLevel}</Typography>
      </Box>

      <CreatureOptionRow label="Beast">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={companion.beast}
          onChange={(event, value) => { event.stopPropagation(); if (value && value !== companion.beast) summon(value); }}
          sx={{ flexWrap: 'wrap' }}
        >
          {PRIMAL_BEASTS.map((beast) => (
            <ToggleButton key={beast.name} value={beast.name} sx={optionToggleSx}>{beast.short}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </CreatureOptionRow>

      {damageTypes.length > 1 ? (
        <CreatureOptionRow label="Beast's Strike damage">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={companion.damageType}
            onChange={(event, value) => { event.stopPropagation(); if (value) save(setPrimalDamageTypePatch(companion, value)); }}
            sx={{ flexWrap: 'wrap' }}
          >
            {damageTypes.map((type) => (
              <ToggleButton key={type} value={type} sx={optionToggleSx}>{type}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </CreatureOptionRow>
      ) : null}

      <Box sx={creatureHpBoxSx}>
        <HpPoolBar
          current={currentHp}
          max={maxHp}
          onDelta={applyHp}
          amount={hpAmt}
          onAmount={setHpAmt}
          plusLabel="Heal beast"
          minusLabel="Damage beast"
          stateLabel="dead"
        />
        {dead ? (
          <Box>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              disabled={!reviveSlot}
              onClick={revive}
              sx={reviveButtonSx}
            >
              {reviveSlot ? `Revive (level ${reviveSlot} slot)` : 'Revive'}
            </Button>
            <Typography sx={{ ...subSx, mt: 0.4, fontStyle: 'italic', color: reviveSlot ? 'text.secondary' : UI_COLORS.dangerMuted }}>
              {reviveSlot
                ? 'Within an hour of its death: Magic action, touch it, expend a spell slot. It returns after 1 minute with all its HP.'
                : 'No spell slot to expend — it can be summoned again after a Long Rest.'}
            </Typography>
          </Box>
        ) : null}
      </Box>

      <BeastStatBlock
        b={creature}
        typeLabel="Beast"
        showCr={false}
        onRoll={rollCheck}
        onRollFormula={rollFormulaToast}
      />

      {rules.length ? (
        <Box sx={{ mt: 0.6 }}>
          {rules.map((rule) => (
            <Typography key={rule.title} sx={{ ...subSx, mt: 0.3 }}>
              <Box component="span" sx={{ fontWeight: 700, color: UI_COLORS.goldLight }}>{rule.title}.</Box> {rule.text}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

// The later Beast Master features that change the beast, by level. How it acts
// in combat is in the card's own description.
function companionRules(rangerLevel) {
  const rules = [];
  if (rangerLevel >= EXCEPTIONAL_TRAINING_LEVEL) rules.push({
    title: 'Exceptional Training',
    text: 'When your Bonus Action commands it to take an action, it can also Dash, Disengage, Dodge, or Help with its own Bonus Action. Its hits can deal Force damage instead of their normal type.',
  });
  if (rangerLevel >= BESTIAL_FURY_LEVEL) rules.push({
    title: 'Bestial Fury',
    text: "Commanded to use Beast's Strike, it can use it twice. The first time each turn it hits a creature under your Hunter's Mark, it deals extra Force damage equal to the spell's bonus damage.",
  });
  if (rangerLevel >= SHARE_SPELLS_LEVEL) rules.push({
    title: 'Share Spells',
    text: 'A spell you cast targeting yourself can also affect the beast if it is within 30 feet.',
  });
  return rules;
}

const reviveButtonSx = {
  fontSize: '0.68rem',
  borderColor: uiAlpha(UI_COLORS.gold, 0.5),
  color: UI_COLORS.goldLight,
  '&:hover': { borderColor: UI_COLORS.goldLight, bgcolor: uiAlpha(UI_COLORS.goldLight, 0.08) },
};

import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import HpPoolBar from '../../../shared/character/combat/HpPoolBar.jsx';
import ACDisplay from '../stats/ACDisplay.jsx';
import DefensesPanel from '../stats/DefensesPanel.jsx';
import { creatureHpBoxSx, dismissButtonSx } from './BeastStatBlock.jsx';
import { ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import {
  CANNON_AC,
  CANNON_DAMAGE_IMMUNITIES,
  artificerLevel,
  cannonMaxHp,
  maxCannons,
  cannonDamageDice,
  protectorThpDice,
  getActiveCannons,
  addCannonPatch,
  removeCannonPatch,
  updateCannonHpPatch,
} from '../../../shared/character/forms/eldritchCannonForm.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { SIZE_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import { CannonRulesSummary, CannonActionRow } from './EldritchCannonParts.jsx';
import { clamp } from '../../../shared/numbers.js';
import DetailPanel, { DetailNote, detailTitleSx } from '../layout/DetailPanel.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import { useCostMode } from './useCostMode.js';
import CostModeToggle from './CostModeToggle.jsx';

// Sheet panel for the Artillerist's Eldritch Cannon (EFA 2024). Mirrors the
// Wild Shape / Wild Companion panels: an "Activate" control creates a cannon
// (spending the Long Rest use or a spell slot), and each active cannon renders a
// board with an editable HP pool (styled like the sheet HP block) and its firing
// options — Flamethrower / Force Ballista / Protector (Bonus Action) plus, from
// level 9, Detonate (Reaction). Each row is tinted by the action-economy colour
// of its type, not an arbitrary hue.

// The cannon's defenses, as the character's Defenses box lists them.
const CANNON_DEFENSES = CANNON_DAMAGE_IMMUNITIES.map((type) => ({ kind: 'Immune', type }));

export default function EldritchCannonPanel({ action, character, sheet, resources, onResChange }) {
  const { onUpdateCharacter, onRoll, onShowToast } = useSheetActions();
  const C = character;
  const [size, setSize] = useState('S');
  const [hpAmt, setHpAmt] = useState({}); // per-cannon step amount

  const lv = artificerLevel(C);
  const { abilityModifier: intMod, attack: spellAtk, dc } = spellcastingNumbers(C, 'int');
  const maxHp = cannonMaxHp(lv);
  const dmgDice = cannonDamageDice(lv);
  const thpFormula = withModifier(protectorThpDice(lv), intMod);

  const cannons = getActiveCannons(C);
  const capacity = maxCannons(lv);
  const canAddMore = cannons.length < capacity;

  // A cannon is created with the 1/Long Rest use or a spell slot.
  const resKey = action?.resKey; // 'eldritch_cannon'
  const costMode = useCostMode({
    character: C,
    sheet,
    usesLeft: resKey ? Number(resources?.[resKey] ?? 0) : 0,
    resKey,
    onResChange,
  });
  const { canPay: canCreate, cost, slotLevel } = costMode;

  const firingModes = useMemo(() => {
    const modes = [
      {
        key: 'flamethrower',
        name: 'Flamethrower',
        cat: 'bonus',
        rollers: [{ kind: 'damage', formula: dmgDice, label: `Dmg ${dmgDice} fire` }],
        desc: `The cannon blasts fire in a 15-foot Cone. Each creature there makes a DEX save (DC ${dc}), taking {@damage ${dmgDice}} Fire damage on a failure, or half on a success. Flammable objects not worn/carried start burning.`,
      },
      {
        key: 'ballista',
        name: 'Force Ballista',
        cat: 'bonus',
        attackBonus: spellAtk,
        rollers: [{ kind: 'damage', formula: dmgDice, label: `Dmg ${dmgDice} force` }],
        desc: `Make a ranged spell attack from the cannon at a creature or object within 120 ft. On a hit: {@damage ${dmgDice}} Force damage, and a creature is pushed up to 5 ft from the cannon.`,
      },
      {
        key: 'protector',
        name: 'Protector',
        cat: 'bonus',
        rollers: [{ kind: 'tempHp', formula: thpFormula, label: `Temp HP ${thpFormula}` }],
        desc: `The cannon emits positive energy: itself and each creature you choose within 10 ft gain Temporary HP equal to {@dice ${protectorThpDice(lv)}} + your INT modifier (minimum +1).`,
      },
    ];
    if (lv >= 9) {
      modes.push({
        key: 'detonate',
        name: 'Detonate',
        cat: 'reaction',
        rollers: [{ kind: 'damage', formula: '3d10', label: 'Dmg 3d10 force' }],
        desc: `Reaction when the cannon takes damage (within 60 ft): it detonates and is destroyed. Each creature within 20 ft makes a DEX save (DC ${dc}), taking {@damage 3d10} Force damage on a failure, or half on a success.`,
      });
    }
    return modes;
  }, [dc, dmgDice, thpFormula, spellAtk, lv]);

  const activate = () => {
    if (!canAddMore || !onUpdateCharacter || !costMode.spend()) return;
    onUpdateCharacter((prev) => ({
      ...prev,
      ...addCannonPatch(prev, { size, hpCurrent: cannonMaxHp(artificerLevel(prev)) }),
    }));
  };

  const dismiss = (index) => {
    if (!onUpdateCharacter) return;
    onUpdateCharacter((prev) => ({ ...prev, ...removeCannonPatch(prev, index) }));
  };

  const applyHp = (index, delta) => {
    if (!onUpdateCharacter || !delta) return;
    const cur = Number(cannons[index]?.hpCurrent ?? maxHp);
    const next = clamp(cur + delta, 0, maxHp);
    if (next === cur) return;
    onUpdateCharacter((prev) => ({ ...prev, ...updateCannonHpPatch(prev, index, next) }));
  };

  return (
    <DetailPanel title="Eldritch Cannon" meta={`${cannons.length}/${capacity} active`}>

      <CannonRulesSummary maxHp={maxHp} level={lv} />

      {/* Active cannon boards */}
      <Stack spacing={0.75}>
        {cannons.map((cannon, index) => {
          const cur = Math.min(Number(cannon?.hpCurrent ?? maxHp), maxHp);
          return (
            <Box key={index} sx={cannonBoardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ ...detailTitleSx, fontSize: FONT_SIZES.xs }}>
                  {SIZE_NAMES[cannon?.size] || 'Small'} Cannon {capacity > 1 ? `#${index + 1}` : ''}
                </Typography>
                <Button
                  size="small"
                  onClick={() => dismiss(index)}
                  sx={{ ...dismissButtonSx, ml: 'auto' }}
                >
                  Dismiss
                </Button>
              </Box>
              <Box sx={cannonDefenseSx}>
                <ACDisplay value={CANNON_AC} />
                <DefensesPanel items={CANNON_DEFENSES} sx={{ flex: 1, minWidth: 140 }} />
              </Box>

              {/* HP editor — the shared creature HP box (readout + heal/damage stepper) */}
              <Box sx={{ ...creatureHpBoxSx, mb: 0 }}>
                <HpPoolBar
                  current={cur}
                  max={maxHp}
                  onDelta={(d) => applyHp(index, d)}
                  amount={hpAmt[index] ?? '1'}
                  onAmount={(v) => setHpAmt((prev) => ({ ...prev, [index]: v }))}
                  plusLabel="Repair cannon"
                  minusLabel="Damage cannon"
                  stateLabel="destroyed"
                />
              </Box>

              {/* Firing options grouped by action economy */}
              {['bonus', 'reaction'].map((cat) => {
                const group = firingModes.filter((m) => m.cat === cat);
                if (!group.length) return null;
                return (
                  <Box key={cat}>
                    <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxxs, color: ACTION_COLORS[cat], mb: 0.25 }}>
                      {cat === 'bonus' ? 'Bonus Action' : 'Reaction'}
                    </Typography>
                    <Stack spacing={0.5}>
                      {group.map((mode) => (
                        <CannonActionRow
                          key={mode.key}
                          mode={mode}
                          exhaustionLevel={sheet?.exhaustionLevel}
                          onRoll={onRoll}
                          onShowToast={onShowToast}
                        />
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Stack>

      {/* Activation control */}
      {canAddMore ? (
        <Box sx={{ mt: cannons.length ? 0.75 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
            <ChoiceToggle size="xs" stopPropagation value={size} onChange={setSize} options={[{ value: 'S', label: 'Small' }, { value: 'T', label: 'Tiny' }]} />
            <CostModeToggle costMode={costMode} useLabel="Use" slotLabel="Slot" size="xs" />
          </Box>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            disabled={!canCreate}
            onClick={activate}
            sx={{ fontSize: FONT_SIZES.md, borderColor: uiAlpha(UI_COLORS.accent, OPACITY.strong), color: UI_COLORS.accentText, '&:hover': { borderColor: UI_COLORS.accentText, ...tintedSurfaceSx(UI_COLORS.accentText, { amount: OPACITY.soft, base: UI_COLORS.surfaceRaised }) } }}
          >
            Activate Cannon
          </Button>
          <DetailNote warn={!canCreate}>
            {!canCreate
              ? 'No Long Rest use left and no spell slot to expend — finish a rest.'
              : `Creating spends ${cost === 'slot' ? `a level ${slotLevel} spell slot` : 'the 1/Long Rest use'}.`}
          </DetailNote>
        </Box>
      ) : null}
    </DetailPanel>
  );
}

// One active cannon: an outlined board, so the dark HP box inside stands out
// as it does on the other creature panels.
const cannonBoardSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.5,
  p: 0.75,
  border: 2,
  borderColor: UI_COLORS.edge,
  borderRadius: 1,
};

// AC shield beside the Defenses box, as in the character's header.
const cannonDefenseSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  flexWrap: 'wrap',
};

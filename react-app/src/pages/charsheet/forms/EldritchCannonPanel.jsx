import { useMemo, useState } from 'react';
import {
  Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { getMod, getFinal, getPB } from '../state/calculations.js';
import { getSheetSlots } from '../spells/spellcasting.js';
import {
  consumeSlot,
  lowestAvailableSlotLevel,
} from '../../../shared/character/spells/spellSlots.js';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { RichText } from '../../../shared/content/RichText.jsx';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import HpPoolBar from '../../../shared/character/combat/HpPoolBar.jsx';
import ACDisplay from '../stats/ACDisplay.jsx';
import DefensesPanel from '../stats/DefensesPanel.jsx';
import AttackRollButton from '../actions/AttackRollButton.jsx';
import { panelSx, headerSx, subSx, creatureHpBoxSx, dismissButtonSx } from './BeastStatBlock.jsx';
import { inlineButtonSx } from '../spells/spellsTabStyles.js';
import { ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import {
  CANNON_AC,
  CANNON_DAMAGE_IMMUNITIES,
  CANNON_SIZE_LABEL,
  artificerLevel,
  cannonMaxHp,
  maxCannons,
  cannonDamageDice,
  protectorThpDice,
  getActiveCannons,
  addCannonPatch,
  removeCannonPatch,
  updateCannonHpPatch,
  eldritchCannonRuleGroups,
} from '../../../shared/character/forms/eldritchCannonForm.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';

const CINZEL = '"Cinzel", Georgia, serif';

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
  const { onUpdateCharacter, onUpdateSheet, onRoll, onShowToast } = useSheetActions();
  const C = character;
  const [costMode, setCostMode] = useState('use'); // 'use' | 'slot'
  const [size, setSize] = useState('S');
  const [hpAmt, setHpAmt] = useState({}); // per-cannon step amount

  const lv = artificerLevel(C);
  const intMod = getMod(getFinal(C, 'int'));
  const pb = getPB(C);
  const spellAtk = pb + intMod;
  const dc = 8 + pb + intMod;
  const maxHp = cannonMaxHp(lv);
  const dmgDice = cannonDamageDice(lv);
  const thpFormula = withModifier(protectorThpDice(lv), intMod);

  const cannons = getActiveCannons(C);
  const capacity = maxCannons(lv);
  const canAddMore = cannons.length < capacity;

  const resKey = action?.resKey; // 'eldritch_cannon'
  const usesLeft = resKey ? Number(resources?.[resKey] ?? 0) : 0;
  const regularSlots = useMemo(() => getSheetSlots(C)?.regular || [], [C]);
  const slotLevel = useMemo(() => lowestAvailableSlotLevel(regularSlots, sheet), [regularSlots, sheet]);
  const canUse = usesLeft > 0;
  const canSlot = slotLevel > 0;
  const canCreate = canUse || canSlot;
  // Honor the picked cost but fall back to whichever is actually available.
  const effectiveCost = costMode === 'slot'
    ? (canSlot ? 'slot' : 'use')
    : (canUse ? 'use' : 'slot');

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
    if (!canAddMore || !canCreate || !onUpdateCharacter) return;
    if (effectiveCost === 'slot') {
      if (!consumeSlot(regularSlots, sheet, slotLevel, onUpdateSheet, onUpdateCharacter)) return;
    } else if (typeof onResChange === 'function') {
      if (usesLeft <= 0) return;
      onResChange(resKey, -1);
    }
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
    const next = Math.max(0, Math.min(maxHp, cur + delta));
    if (next === cur) return;
    onUpdateCharacter((prev) => ({ ...prev, ...updateCannonHpPatch(prev, index, next) }));
  };

  return (
    <Box onClick={(e) => e.stopPropagation()} sx={panelSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
        <Typography sx={headerSx} component="span">Eldritch Cannon</Typography>
        <Typography sx={{ ...subSx, ml: 'auto' }}>{cannons.length}/{capacity} active</Typography>
      </Box>

      <CannonRulesSummary maxHp={maxHp} level={lv} />

      {/* Active cannon boards */}
      <Stack spacing={0.8}>
        {cannons.map((cannon, index) => {
          const cur = Math.min(Number(cannon?.hpCurrent ?? maxHp), maxHp);
          return (
            <Box key={index} sx={cannonBoardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <Typography sx={{ ...headerSx, fontSize: '0.62rem' }}>
                  {CANNON_SIZE_LABEL[cannon?.size] || 'Small'} Cannon {capacity > 1 ? `#${index + 1}` : ''}
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
                    <Typography sx={{ fontFamily: CINZEL, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACTION_COLORS[cat], mb: 0.3 }}>
                      {cat === 'bonus' ? 'Bonus Action' : 'Reaction'}
                    </Typography>
                    <Stack spacing={0.4}>
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
        <Box sx={{ mt: cannons.length ? 0.8 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mb: 0.5 }}>
            <ToggleButtonGroup size="small" exclusive value={size} onChange={(e, v) => { e.stopPropagation(); if (v) setSize(v); }}>
              <ToggleButton value="S" sx={toggleSx}>Small</ToggleButton>
              <ToggleButton value="T" sx={toggleSx}>Tiny</ToggleButton>
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={canCreate ? effectiveCost : null}
              onChange={(e, v) => { e.stopPropagation(); if (v) setCostMode(v); }}
            >
              <ToggleButton value="use" disabled={!canUse} sx={toggleSx}>
                {canUse ? `Use (${usesLeft})` : 'Use'}
              </ToggleButton>
              <ToggleButton value="slot" disabled={!canSlot} sx={toggleSx}>
                {canSlot ? `Slot (Lv ${slotLevel})` : 'Slot'}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Button
            fullWidth
            size="small"
            variant="outlined"
            disabled={!canCreate}
            onClick={activate}
            sx={{ fontSize: '0.72rem', borderColor: uiAlpha(UI_COLORS.gold, 0.5), color: UI_COLORS.goldLight, '&:hover': { borderColor: UI_COLORS.goldLight, bgcolor: uiAlpha(UI_COLORS.goldLight, 0.08) } }}
          >
            Activate Cannon
          </Button>
          <Typography sx={{ ...subSx, fontStyle: 'italic', mt: 0.5, color: canCreate ? 'text.secondary' : UI_COLORS.dangerMuted }}>
            {!canCreate
              ? 'No Long Rest use left and no spell slot to expend — finish a rest.'
              : `Creating spends ${effectiveCost === 'slot' ? `a level ${slotLevel} spell slot` : 'the 1/Long Rest use'}.`}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

function CannonRulesSummary({ maxHp, level }) {
  const groups = eldritchCannonRuleGroups(maxHp, level);

  return (
    <ExpandableCard
      containerSx={rulesPanelSx}
      summary={({ toggle, open }) => {
        const Chevron = open ? ChevronDown : ChevronRight;
        return (
          <Box onClick={toggle} sx={rulesToggleSx}>
            <Chevron size={13} color={UI_COLORS.textMuted} style={{ flexShrink: 0 }} />
            <Typography sx={rulesToggleTitleSx}>Cannon Rules</Typography>
            <Typography sx={rulesToggleMetaSx}>Create / Operate / Object</Typography>
          </Box>
        );
      }}
      detailsSx={{ pt: 0.6 }}
      details={(
        <Box sx={rulesSummarySx}>
          {groups.map((group) => (
            <Box key={group.title} sx={rulesGroupSx}>
              <Typography sx={rulesGroupTitleSx}>{group.title}</Typography>
              {group.rows.map(([label, value]) => (
                <Box key={label} sx={rulesRowSx}>
                  <Typography component="span" sx={rulesLabelSx}>{label}</Typography>
                  <Typography component="span" sx={rulesValueSx}>{value}</Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}
    />
  );
}

function CannonActionRow({ mode, exhaustionLevel, onRoll, onShowToast }) {
  const barColor = ACTION_COLORS[mode.cat] || ACTION_COLORS.action;
  return (
    <ExpandableCard
      containerSx={{ overflow: 'hidden' }}
      disabled={!mode.desc}
      summary={({ toggle, disabled, open }) => (
        <Box
          onClick={disabled ? undefined : toggle}
          sx={{
            display: 'flex', alignItems: 'center', gap: '6px', px: '8px', py: '5px',
            border: 1, borderColor: 'divider', borderRadius: open ? '6px 6px 0 0' : 1,
            bgcolor: uiAlpha(UI_COLORS.headerBg, 0.85), cursor: disabled ? 'default' : 'pointer',
          }}
        >
          <Box sx={{ width: 5, height: 22, borderRadius: 1, bgcolor: barColor, flexShrink: 0, opacity: 0.95 }} />
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}>{mode.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
            {mode.attackBonus != null ? (
              <AttackRollButton
                rawBonus={mode.attackBonus}
                exhaustionLevel={exhaustionLevel}
                label={`Cannon: ${mode.name} (Attack)`}
                onRoll={onRoll}
              />
            ) : null}
            <RollerButtons
              rollers={mode.rollers}
              subject={`Cannon: ${mode.name}`}
              onShowToast={onShowToast}
              buttonSx={inlineButtonSx}
            />
          </Box>
        </Box>
      )}
      detailsSx={{
        px: '8px', py: '6px', border: 1, borderTop: 'none', borderColor: 'divider',
        borderRadius: '0 0 6px 6px', bgcolor: uiAlpha(UI_COLORS.headerBg, 0.5),
        fontSize: '0.62rem', color: 'text.secondary',
      }}
      details={mode.desc ? <RichText text={mode.desc} /> : null}
    />
  );
}

// One active cannon: an outlined board, so the dark HP box inside stands out
// as it does on the other creature panels.
const cannonBoardSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.6,
  p: 0.8,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

const toggleSx = {
  fontSize: '0.64rem',
  py: '3px',
  px: '10px',
  textTransform: 'none',
  color: UI_COLORS.goldLight,
  borderColor: uiAlpha(UI_COLORS.gold, 0.4),
  '&.Mui-selected': { bgcolor: uiAlpha(UI_COLORS.goldLight, 0.18), color: UI_COLORS.goldLight },
  '&.Mui-selected:hover': { bgcolor: uiAlpha(UI_COLORS.goldLight, 0.24) },
};

const rulesPanelSx = {
  mb: 0.8,
};

const rulesToggleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  px: '8px',
  py: '5px',
  border: 1,
  borderColor: uiAlpha(UI_COLORS.gold, 0.25),
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.headerBg, 0.58),
  cursor: 'pointer',
  '&:hover': {
    borderColor: uiAlpha(UI_COLORS.gold, 0.45),
    bgcolor: uiAlpha(UI_COLORS.gold, 0.07),
  },
};

const rulesToggleTitleSx = {
  fontFamily: CINZEL,
  fontSize: '0.58rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: UI_COLORS.goldLight,
  textTransform: 'uppercase',
};

const rulesToggleMetaSx = {
  ml: 'auto',
  minWidth: 0,
  fontSize: '0.58rem',
  color: 'text.secondary',
};

const rulesSummarySx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '6px',
};

const rulesGroupSx = {
  minWidth: 0,
  px: '8px',
  py: '6px',
  border: 1,
  borderColor: uiAlpha(UI_COLORS.white, 0.08),
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.headerBg, 0.42),
};

const rulesGroupTitleSx = {
  fontFamily: CINZEL,
  fontSize: '0.54rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: UI_COLORS.goldLight,
  textTransform: 'uppercase',
  mb: 0.25,
};

const rulesRowSx = {
  display: 'grid',
  gridTemplateColumns: '58px minmax(0, 1fr)',
  gap: '6px',
  alignItems: 'baseline',
  py: '3px',
  borderTop: `1px solid ${uiAlpha(UI_COLORS.white, 0.045)}`,
  '&:first-of-type': { borderTop: 0 },
};

const rulesLabelSx = {
  minWidth: 0,
  fontSize: '0.55rem',
  fontWeight: 700,
  color: UI_COLORS.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const rulesValueSx = {
  minWidth: 0,
  fontSize: '0.62rem',
  lineHeight: 1.35,
  color: 'text.secondary',
};

// AC shield beside the Defenses box, as in the character's header.
const cannonDefenseSx = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.45rem',
  flexWrap: 'wrap',
};

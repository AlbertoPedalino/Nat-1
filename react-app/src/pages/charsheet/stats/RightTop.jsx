import { useState, useCallback } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { getInitiative, getPB } from '../../../shared/character/sheet/sheetStats.js';
import { getArmorTrainingInfo } from '../../../shared/character/proficiency/proficiencyQueries.js';
import { getInitiativeAdvantageFromEffects } from '../../../shared/character/sheet/effectBonuses.js';
import { advantageVisual } from './advantageMark.jsx';
import { computeBestArmorClass } from '../../../shared/character/combat/ac.js';
import {
  resolveInitiativeTriggeredResourceRecoveries,
} from '../../../shared/character/combat/initiativeEffects.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import ACDisplay from './ACDisplay.jsx';
import ConditionsBlock from './ConditionsBlock.jsx';
import RemindersBlock from './RemindersBlock.jsx';
import CharacterDefenses from './CharacterDefenses.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { rollD20 } from '../../../shared/character/dice/dice.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { statLabelSx, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { TILE_ACTIVE_INK, tileSx } from '../../../shared/ui/interactive.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

export default function RightTop({ C, sheet, embedded = false, onRoll, onToggleCondition, onClearConditions, effectActions, onSetExhaustion, conditionEntries, onToggleInspiration, resources, setResources, onShowToast }) {
  // Initiative is a DEX check (D20 Test) but rolls its own d20 here (it also fires
  // initiative-triggered recoveries), so the exhaustion −2/level penalty is applied
  // to the modifier directly rather than via rollD20. Adapter-granted bonuses
  // (e.g. Alert feat → +PB) are folded in by getInitiative.
  const initMod = getInitiative(C, sheet);
  const initAdv = getInitiativeAdvantageFromEffects(C);
  const initHasAdv = !!initAdv;
  const initAdvArg = initHasAdv ? true : undefined;
  const initTooltip = initAdv ? `Advantage on Initiative — ${initAdv.source}` : '';
  const [lastInitiativeRoll, setLastInitiativeRoll] = useState(null);
  const [initiativeMessage, setInitiativeMessage] = useState('');

  // `advArg` as rollD20 takes it: true / false / undefined. The ordinary click
  // uses the sheet's own sources; the right-click menu adds one.
  const rollInitiative = useCallback((advArg) => {
    const initMode = advArg === true ? 'adv' : advArg === false ? 'disadv' : null;
    // Advantage keeps the higher of 2d20, disadvantage the lower.
    const roll = rollD20(initMod, { advantage: advArg });
    const d20 = roll.kept;
    const total = roll.total;
    setLastInitiativeRoll({ d20, mod: initMod, total });

    const bonusText = signed(initMod);
    const advText = initMode === 'adv' ? ' (Adv)' : initMode === 'disadv' ? ' (Dis)' : '';
    const recoveryParts = [];

    if (resources && typeof setResources === 'function') {
      const result = resolveInitiativeTriggeredResourceRecoveries(C, resources);
      if (result.resources !== resources) {
        setResources(result.resources);
      }
      recoveryParts.push(...(result.applied || []));
    }

    if (recoveryParts.length) {
      const msg = recoveryParts.map(a => `${a.label}: ${a.resourceLabel || a.resourceKey} ${a.from} → ${a.to}`).join(' • ');
      setInitiativeMessage(msg);
    } else {
      setInitiativeMessage('');
    }

    const dice = roll.rolls;

    const toastDetail = recoveryParts.length
      ? `d20${advText} ${bonusText} = ${total} · ${recoveryParts.map(a => `${a.label}: ${a.resourceLabel || a.resourceKey} ${a.from} → ${a.to}`).join(', ')}`
      : `d20${advText} ${bonusText} = ${total}`;

    if (typeof onShowToast === 'function') {
      onShowToast('Initiative', toastDetail, total, dice, { bonus: initMod, kept: d20, kind: 'initiative' });
    }
  }, [C, resources, setResources, onShowToast, initMod]);

  const inv = sheet?.sheetInventory || [];
  const equippedShield = inv.find(i => i.equipped && i.type === 'S');
  const profSets = useProficiencySets();
  const shieldUnproficient = equippedShield ? !getArmorTrainingInfo(C, equippedShield, null, profSets).trained : false;
  const shieldTrained = !shieldUnproficient;
  const acResult = computeBestArmorClass(C, inv, shieldTrained);
  const ac = acResult?.value ?? 10;
  const acSource = acResult?.source;
  const showAcBadge = acResult?.sourceType === 'formula';

  // Two even columns on a wide sheet (one when embedded, its panel being
  // narrow): Conditions beside Reminders, then the stat tiles (AC, Initiative,
  // Proficiency Bonus, Inspiration) under Conditions and Defenses under
  // Reminders, right above the tabs. A sheet without reminders gives
  // Conditions the whole row.
  return (
    <Box sx={{ ...rightTopGridSx, gridTemplateColumns: embedded ? '1fr' : { xs: '1fr', md: '1fr 1fr' } }}>
      <Box sx={{ display: 'flex', minWidth: 0, ...(effectActions ? null : { gridColumn: '1 / -1' }) }}>
        <ConditionsBlock sheet={sheet} onToggle={onToggleCondition} onClear={onClearConditions} onSetExhaustion={onSetExhaustion} conditionEntries={conditionEntries} />
      </Box>
      {effectActions ? (
        <Box sx={{ display: 'flex', minWidth: 0 }}>
          <RemindersBlock sheet={sheet} actions={effectActions} />
        </Box>
      ) : null}
      <Box sx={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'flex-start', minWidth: 0 }}>
        <ACDisplay value={ac} shieldUnproficient={shieldUnproficient} source={acSource} showBadge={showAcBadge} badgeLabel={acSource} />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
          <Tooltip title={initTooltip}>
            <RollModeArea
              sources={{ adv: initHasAdv, disadv: false }}
              onPick={rollInitiative}
              onClick={() => rollInitiative(initAdvArg)}
            >
              <SquareStat value={signed(initMod)} label="Initiative" clickable />
            </RollModeArea>
          </Tooltip>
          {initHasAdv && (() => {
            const v = advantageVisual(true, false);
            const Icon = v.Icon;
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                <Icon size={ICON_SIZES.xxs} color={v.color} />
                <Typography sx={{ fontSize: FONT_SIZES.xxxs, color: v.color, fontWeight: FONT_WEIGHTS.bold, letterSpacing: LETTER_SPACINGS.md }}>{v.label}</Typography>
              </Box>
            );
          })()}
          {lastInitiativeRoll && (
            <Typography variant="caption" sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary', textAlign: 'center', lineHeight: LINE_HEIGHTS.snug }}>
              Last: <Box component="span" sx={{ fontWeight: FONT_WEIGHTS.bold, color: UI_COLORS.accentText }}>{lastInitiativeRoll.total}</Box> ({lastInitiativeRoll.d20}{lastInitiativeRoll.mod >= 0 ? ` + ${lastInitiativeRoll.mod}` : ` - ${Math.abs(lastInitiativeRoll.mod)}`})
            </Typography>
          )}
          {initiativeMessage && (
            <Typography variant="caption" sx={{ fontSize: FONT_SIZES.xxxs, color: UI_COLORS.success, textAlign: 'center', lineHeight: LINE_HEIGHTS.tight, maxWidth: 90, wordBreak: 'break-word' }}>
              {initiativeMessage}
            </Typography>
          )}
        </Box>
        <SquareStat value={signed(getPB(C))} label="Prof. Bonus" />
        <InspirationBlock sheet={sheet} onToggle={onToggleInspiration} />
      </Box>
      <Box sx={{ display: 'flex', minWidth: 0 }}>
        <CharacterDefenses C={C} activeConditions={sheet?.activeConditions || []} />
      </Box>
    </Box>
  );
}

const rightTopGridSx = {
  display: 'grid',
  gap: '0.4rem',
  width: '100%',
  alignItems: 'stretch',
};

// Initiative, Proficiency Bonus and Inspiration: the same square tile, a figure
// (or Inspiration's spark) over its name.
function SquareStat({ value, label, clickable, active, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        ...tileSx({ clickable, active }),
        width: 62, height: 62,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
      {typeof value === 'string' || typeof value === 'number'
        ? <Typography sx={statValueSx}>{value}</Typography>
        : value}
      <Typography sx={{ ...statLabelSx, mt: 0.25, ...(active ? { color: TILE_ACTIVE_INK } : null) }}>{label}</Typography>
    </Box>
  );
}

function InspirationBlock({ sheet, onToggle }) {
  const insp = sheet.sheetInspiration;
  return (
    <SquareStat
      clickable
      active={insp}
      onClick={onToggle}
      label={insp ? 'Insp.' : 'No Insp.'}
      value={<GAME_ICONS.inspiration size={ICON_SIZES.xxl} style={{ color: insp ? TILE_ACTIVE_INK : UI_COLORS.textSecondary }} />}
    />
  );
}

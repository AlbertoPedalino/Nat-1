import { useCallback, useState } from 'react';
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
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { inkOn } from '../../../shared/ui/pressable.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import StatTile from './StatTile.jsx';
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
  // The last result stays on the tile: the roll log scrolls on.
  const [lastInitiative, setLastInitiative] = useState(null);

  // `advArg` as rollD20 takes it: true / false / undefined. The ordinary click
  // uses the sheet's own sources; the right-click menu adds one.
  const rollInitiative = useCallback((advArg) => {
    const initMode = advArg === true ? 'adv' : advArg === false ? 'disadv' : null;
    // Advantage keeps the higher of 2d20, disadvantage the lower.
    const roll = rollD20(initMod, { advantage: advArg });
    const d20 = roll.kept;
    const total = roll.total;
    setLastInitiative(total);

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
  // Reminders, right above the tabs. In one column (a phone, an embedded
  // sheet) Defenses comes straight under Reminders and the tiles close the
  // block. A sheet without reminders gives Conditions the whole row.
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
      <Box sx={{ ...statRowSx, order: embedded ? 1 : { xs: 1, md: 0 } }}>
        <ACDisplay value={ac} shieldUnproficient={shieldUnproficient} source={acSource} showBadge={showAcBadge} badgeLabel={acSource} />
        <Tooltip title={initTooltip}>
          <RollModeArea
            sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
            sources={{ adv: initHasAdv, disadv: false }}
            onPick={rollInitiative}
            onClick={() => rollInitiative(initAdvArg)}
          >
            <StatTile tone={PANEL_TONES.initiative} label="Initiative" value={<InitiativeFigure value={signed(initMod)} advantage={initHasAdv} last={lastInitiative} />} clickable />
          </RollModeArea>
        </Tooltip>
        <StatTile tone={PANEL_TONES.proficiencyBonus} label="Prof. Bonus" value={signed(getPB(C))} />
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

// AC, Initiative, Proficiency Bonus and Inspiration: four even tiles filling
// their cell as tall as Defenses beside them.
const statRowSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '0.45rem',
  alignItems: 'stretch',
  minWidth: 0,
};

// Initiative's figure, with the advantage mark in its corner when the sheet
// grants it (the tooltip says from what) and the last result along its foot,
// laid over the tile so it never makes it taller.
function InitiativeFigure({ value, advantage, last }) {
  const mark = advantage ? advantageVisual(true, false) : null;
  return (
    <>
      <Typography sx={statValueSx}>{value}</Typography>
      {mark ? <mark.Icon size={ICON_SIZES.sm} color={mark.color} style={{ position: 'absolute', top: 4, right: 4 }} /> : null}
      {last != null ? (
        <Typography sx={lastInitiativeSx}>
          Last <Box component="span" sx={{ color: PANEL_TONES.initiative }}>{last}</Box>
        </Typography>
      ) : null}
    </>
  );
}

const lastInitiativeSx = {
  ...TEXT_STYLES.label,
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 3,
  textAlign: 'center',
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
};

function InspirationBlock({ sheet, onToggle }) {
  const insp = sheet.sheetInspiration;
  return (
    <StatTile
      tone={PANEL_TONES.inspiration}
      clickable
      active={insp}
      onClick={onToggle}
      label="Inspiration"
      value={<GAME_ICONS.inspiration size={ICON_SIZES.hero} style={{ color: insp ? inkOn(PANEL_TONES.inspiration) : UI_COLORS.textMuted }} />}
    />
  );
}

import { useState, useCallback } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { getInitiative, getPB } from '../../../shared/character/sheet/sheetStats.js';
import { getConditionsWithEffect } from '../../../shared/character/combat/conditions.js';
import { getArmorTrainingInfo } from '../../../shared/character/proficiency/proficiencyQueries.js';
import {
  collectResolvedResistanceItems,
  collectResolvedImmunityItems,
} from '../../../shared/character/sheet/sheetDefenses.js';
import { getInitiativeAdvantageFromEffects } from '../../../shared/character/sheet/effectBonuses.js';
import { advantageVisual } from './advantageMark.jsx';
import {
  collectItemResistanceItems,
  collectItemImmunityItems,
  collectItemConditionImmunityItems,
  characterItemEffects,
} from '../../../shared/character/inventory/itemEffects.js';
import { computeBestArmorClass } from '../../../shared/character/combat/ac.js';
import {
  resolveInitiativeTriggeredResourceRecoveries,
} from '../../../shared/character/combat/initiativeEffects.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import ACDisplay from './ACDisplay.jsx';
import ConditionsBlock from './ConditionsBlock.jsx';
import RemindersBlock from './RemindersBlock.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { rollD20 } from '../../../shared/character/dice/dice.js';
import DefensesPanel from './DefensesPanel.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { sectionLabelSx, statLabelSx, statValueSx } from '../../../shared/ui/PanelHeader.jsx';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

export default function RightTop({ C, sheet, onRoll, onToggleCondition, onClearConditions, effectActions, onSetExhaustion, conditionEntries, onToggleInspiration, resources, setResources, onShowToast }) {
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
      onShowToast('Initiative', toastDetail, total, dice, { bonus: initMod, kept: d20 });
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

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: '0.45rem', mb: '0.4rem', flexWrap: 'wrap' }}>
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
        <DefensesBlock C={C} activeConditions={sheet?.activeConditions || []} />
      </Box>
      <ConditionsBlock sheet={sheet} onToggle={onToggleCondition} onClear={onClearConditions} onSetExhaustion={onSetExhaustion} conditionEntries={conditionEntries} />
      {effectActions ? <RemindersBlock sheet={sheet} actions={effectActions} /> : null}
    </Box>
  );
}

function SquareStat({ value, label, clickable }) {
  return (
    <Box
      sx={{
        width: 62, height: 62, borderRadius: 1, border: 2, borderColor: 'divider',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        bgcolor: UI_COLORS.surfaceHeader,
        ...(clickable ? { cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } } : {}),
      }}>
      <Typography sx={statValueSx}>{value}</Typography>
      <Typography sx={{ ...statLabelSx, mt: 0.25 }}>{label}</Typography>
    </Box>
  );
}

function InspirationBlock({ sheet, onToggle }) {
  const insp = sheet.sheetInspiration;
  return (
    <Box onClick={onToggle} sx={{ minWidth: 90, maxWidth: 110, bgcolor: UI_COLORS.surfaceHeader, border: 1, borderColor: insp ? 'primary.main' : 'divider', borderRadius: 1, p: '0.4rem 0.62rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.25, cursor: 'pointer', '&:hover': { borderColor: 'primary.main' }, ...(insp ? { bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.fill) } : {}) }}>
      <Sparkles size={ICON_SIZES.xl} style={{ color: insp ? UI_COLORS.accentText : 'text.secondary', filter: insp ? `drop-shadow(0 0 6px ${uiAlpha(UI_COLORS.accent, OPACITY.strong)})` : 'none' }} />
      <Typography sx={{ ...sectionLabelSx, color: insp ? 'primary.main' : 'text.secondary', textAlign: 'center' }}>
        {insp ? 'Insp.' : 'No Insp.'}
      </Typography>
    </Box>
  );
}

function DefensesBlock({ C, activeConditions = [] }) {
  const itemEffects = characterItemEffects(C);
  // Conditions granting resistance to all damage (e.g. Petrified).
  const conditionResistAll = getConditionsWithEffect(activeConditions, 'resistAllDmg')
    .map((source) => ({ type: 'All damage', kind: 'Resist', source }));
  const advSaves = [...itemEffects.advantageOnSaveAgainst.entries()].flatMap(([target, sources]) =>
    sources.map((src) => ({ type: `Save vs ${target}`, kind: 'Adv', source: src })),
  );
  const attackerDisadv = (itemEffects.disadvantageOnAttackersAgainstYou || []).map((entry) => ({
    type: 'Attackers DIS', kind: '', source: entry.source, note: entry.note,
  }));
  const passiveTraits = (itemEffects.passiveTraits || []).map((entry) => ({
    type: entry.text, kind: 'Trait', source: entry.source,
  }));
  const all = [
    ...conditionResistAll,
    ...collectResolvedResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectItemResistanceItems(C).map((item) => ({ type: item.label, kind: 'Resist', source: item.source })),
    ...collectResolvedImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemImmunityItems(C).map((item) => ({ type: item.label, kind: 'Immune', source: item.source })),
    ...collectItemConditionImmunityItems(C).map((item) => ({ type: item.label, kind: 'Cond. Immune', source: item.source })),
    ...advSaves,
    ...attackerDisadv,
    ...passiveTraits,
  ];

  return <DefensesPanel items={all} sx={{ flex: 1, minWidth: 140 }} />;
}

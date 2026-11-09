import { Box, Chip, Paper, Tooltip, Typography } from '@mui/material';
import { Footprints, AlertCircle } from 'lucide-react';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { getFinal, exhaustionSpeedPenalty } from '../../../shared/character/sheet/sheetStats.js';
import { getSpeedZeroConditions } from '../../../shared/character/combat/conditions.js';
import { collectMovementEffects } from '../../../shared/character/sheet/sheetEffects.js';
import { effectSummary, effectTitle } from '../../../shared/character/sheet/sheetEffectText.js';
import { getSpeedBonus } from '../../../shared/character/sheet/effectBonuses.js';
import { characterItemEffects } from '../../../shared/character/inventory/itemEffects.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import {
  carryCapacity,
  formatWeight,
  totalCarriedWeight,
} from '../../../shared/character/inventory/weight.js';
import { isWildShaped, wildShapeSpeed } from '../../../shared/character/forms/wildShapeForm.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import PanelHeader from '../../../shared/ui/PanelHeader.jsx';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';

const EXTRA_SPEED_MODES = ['burrow', 'climb', 'fly', 'swim'];

// 5etools marks a mode "equal to your Speed" with `true` (e.g. Dhampir climb).
function normalizeSpeed(speed) {
  if (typeof speed === 'number') return { walk: speed };
  if (!speed || typeof speed !== 'object') return { walk: 30 };
  const walk = typeof speed.walk === 'number' && speed.walk > 0 ? speed.walk : 30;
  const out = { walk };
  EXTRA_SPEED_MODES.forEach((mode) => {
    const value = speed[mode];
    if (typeof value === 'number' && value > 0) out[mode] = value;
    else if (value === true) out[mode] = walk;
  });
  return out;
}

function speedLabel(key) {
  return key === 'walk' ? 'Walk' : capitalize(key);
}

export default function Movement({ C, sheet }) {
  const inventory = sheet?.sheetInventory || C?.inventory || [];
  const profSets = useProficiencySets();
  // Wild Shape: the beast's speeds replace yours; armor (merged) and carried
  // weight do not slow the beast.
  const shaped = isWildShaped(C);
  const penalties = getEquippedArmorPenalties(C, inventory, profSets);
  const baseSpeeds = normalizeSpeed(wildShapeSpeed(C) ?? C?.speciesSnapshot?.speed);
  const speedPenalty = penalties.speedPenalty || 0;
  const maxCarry = carryCapacity(getFinal(C, 'str'));
  const carriedWeight = totalCarriedWeight(inventory, sheet?.sheetCurrency);
  const overloaded = !shaped && carriedWeight > maxCarry;
  const speedZeroConditions = getSpeedZeroConditions(sheet?.activeConditions || []);
  const speedZero = speedZeroConditions.length > 0;
  const exhaustionLevel = sheet?.exhaustionLevel || 0;
  const exhaustionPenalty = exhaustionSpeedPenalty(exhaustionLevel);
  const movementEffects = collectMovementEffects(C).filter((effect) => {
    if (String(effect.type || '').toLowerCase() === 'speed' && typeof effect.value === 'number') {
      return getSpeedBonus(C) > 0;
    }
    return true;
  });
  const runtimeSpeedBonus = getSpeedBonus(C);
  const itemEffects = characterItemEffects(C);
  // Compose modes referenced by `equal` rules even if they aren't in baseSpeeds.
  const allModes = new Set(Object.keys(baseSpeeds));
  Object.keys(itemEffects.speedEqual || {}).forEach((mode) => allModes.add(mode));
  const entries = [...allModes].map((key) => {
    const value = baseSpeeds[key] || 0;
    const equal = itemEffects.speedEqual[key];
    const equalSource = equal ? (baseSpeeds[equal.from] || 0) : 0;
    const baseAfterEqual = Math.max(value, equalSource);
    const itemOverride = itemEffects.speedOverride[key];
    const baseAfterOverride = itemOverride ? Math.max(baseAfterEqual, itemOverride.value) : baseAfterEqual;
    const itemBonus = itemEffects.speedBonus[key] || 0;
    const subtotal = baseAfterOverride + speedPenalty + runtimeSpeedBonus + itemBonus;
    const multiplier = itemEffects.speedMultiplier[key]?.value || 1;
    const computed = subtotal * multiplier - exhaustionPenalty;
    return {
      key,
      base: value,
      final: speedZero ? 0 : overloaded ? clamp(computed, 0, 5) : Math.max(0, computed),
    };
  });
  const hasPenalty = speedPenalty < 0 || overloaded || speedZero || exhaustionPenalty > 0;
  const reasons = [
    speedZero ? `${speedZeroConditions.join(', ')}: speed 0` : null,
    overloaded ? `Over carry: speed 5 ft (${formatWeight(carriedWeight)} / ${formatWeight(maxCarry)} lb)` : null,
    exhaustionPenalty > 0 ? `Exhaustion ${exhaustionLevel}: −${exhaustionPenalty} ft` : null,
    speedPenalty < 0 ? `Armor STR requirement: ${speedPenalty} ft` : null,
  ].filter(Boolean);
  const reason = reasons.join(' • ');

  return (
    <Paper variant="outlined" sx={{ mb: '0.6rem', overflow: 'hidden' }}>
      <PanelHeader icon={Footprints} title="Movement" tone={hasPenalty ? 'warning.main' : 'primary.main'}>
        {hasPenalty ? (
          <Tooltip title={reason}>
            <AlertCircle size={ICON_SIZES.xs} style={{ color: UI_COLORS.penalty, marginLeft: 'auto' }} />
          </Tooltip>
        ) : null}
      </PanelHeader>
      <Box sx={{ p: '0.55rem 0.8rem', display: 'grid', gap: 0.25 }}>
        {entries.map((entry) => (
          <Box key={entry.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.25, bgcolor: UI_COLORS.surfaceHeader, border: 1, borderColor: hasPenalty ? 'warning.main' : 'divider', borderRadius: 1 }}>
            <Typography sx={{ fontSize: FONT_SIZES.md, color: 'text.secondary' }}>{speedLabel(entry.key)}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lead, color: hasPenalty ? UI_COLORS.penaltyText : UI_COLORS.accentText, lineHeight: LINE_HEIGHTS.none }}>
                {entry.final}
              </Typography>
              <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary' }}>ft</Typography>
            </Box>
          </Box>
        ))}
        {movementEffects.length ? (
          <Box sx={{ display: 'grid', gap: 0.25, mt: 0.25 }}>
            {movementEffects.map((effect, index) => (
              <Chip
                key={`${effect.ownerName}-${effect.type}-${index}`}
                size="small"
                label={`${effectTitle(effect)}${effectSummary(effect) ? `: ${effectSummary(effect)}` : ''}`}
                variant="outlined"
                sx={{ height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xxxs, color: UI_COLORS.accentText, borderColor: uiAlpha(UI_COLORS.accentText, OPACITY.edge), justifyContent: 'flex-start' }}
              />
            ))}
          </Box>
        ) : null}
        {hasPenalty ? (
          <Chip size="small" label={reason} variant="outlined" sx={{ height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xxxs, color: UI_COLORS.penaltyText, borderColor: uiAlpha(UI_COLORS.penaltyText, OPACITY.edge), justifyContent: 'flex-start' }} />
        ) : null}
      </Box>
    </Paper>
  );
}

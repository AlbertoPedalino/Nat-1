import { Box, Typography, Tooltip } from '@mui/material';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { getFinal, getMod, effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { describeCheckDisadvantage } from '../../../shared/character/combat/conditions.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ABILITIES, ABILITY_ABBREVIATIONS, ABILITY_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { sheetBoxSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

export default function AbilityScores({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);
  const activeConditions = sheet?.activeConditions || [];

  return (
    <Box sx={{
      ...sheetBoxSx, height: '100%', p: '0.45rem',
    }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(6,minmax(62px,1fr))' },
        gap: '0.6rem', minWidth: 0,
      }}>
        {ABILITIES.map(s => {
          const val = getFinal(C, s);
          const mod = getMod(val);
          const shownMod = effectiveD20Modifier(mod, sheet?.exhaustionLevel);
          const armorDisadv = armorPenalties.hasPenalty && armorPenalties.disadvantageOn.includes(`${s}-checks`);
          const checkDisadv = describeCheckDisadvantage(activeConditions, armorDisadv);
          const { conditional } = checkDisadv;
          const hasDisadv = checkDisadv.has;
          const disadvReason = checkDisadv.reason;
          const condNotes = conditional.map((c) => `${c.source} (${c.note})`);
          const situational = condNotes.length ? ` • Situational: ${condNotes.join('; ')}` : '';
          // Solid disadvantage drives the roll; a purely situational one is a
          // hint only.
          const visual = hasDisadv
            ? advantageVisual(false, true)
            : (condNotes.length ? conditionalDisadvantageVisual() : null);
          const tooltipText = hasDisadv
            ? `Disadvantage: ${disadvReason}${situational}`
            : `Situational disadvantage: ${condNotes.join('; ')}`;
          const advArg = hasDisadv ? false : undefined;
          return (
            <RollModeArea key={s} onClick={() => onRoll(mod, ABILITY_NAMES[s] + ' Check', advArg)}
              sources={{ adv: false, disadv: hasDisadv }}
              onPick={(picked) => onRoll(mod, ABILITY_NAMES[s] + ' Check', picked)}
              sx={{
                bgcolor: 'background.paper', border: 1, borderColor: advArg === false ? 'warning.main' : 'divider', borderRadius: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', p: '0.4rem 0.25rem',
                cursor: 'pointer', transition: 'border-color 0.15s',
                '&:hover': { borderColor: 'primary.main' },
              }}>
              <Typography sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxxs, color: 'text.secondary', mb: 0.25 }}>
                {ABILITY_ABBREVIATIONS[s]}
              </Typography>
              <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.heading, color: UI_COLORS.accentText, lineHeight: 1 }}>
                {signed(shownMod)}
              </Typography>
              <Box sx={{
                ...SURFACES.panel,
                ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxs, color: 'text.secondary',
                borderRadius: '50%',
                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25,
              }}>
                {val}
              </Box>
              {visual ? (
                <Tooltip title={tooltipText}>
                  <visual.Icon size={12} style={{ color: visual.color, marginTop: '2px' }} />
                </Tooltip>
              ) : null}
            </RollModeArea>
          );
        })}
      </Box>
    </Box>
  );
}

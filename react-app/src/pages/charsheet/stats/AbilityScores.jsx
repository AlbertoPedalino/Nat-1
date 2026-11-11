import { Box, Typography, Tooltip } from '@mui/material';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { getAbilityCheckBonus, getFinal, effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { describeCheckDisadvantage } from '../../../shared/character/combat/conditions.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ABILITIES, ABILITY_ABBREVIATIONS, ABILITY_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { COLUMN_RULE_SX } from '../../../shared/ui/interactive.js';
import { ROLL_FIGURE_MARK_STYLE } from '../../../shared/ui/pressable.js';
import StatTile from './StatTile.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';

export default function AbilityScores({ C, sheet, onRoll }) {
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);
  const activeConditions = sheet?.activeConditions || [];

  return (
    <Panel icon={GAME_ICONS.abilityScores} title="Ability Scores" tone={PANEL_TONES.abilityScores} sx={{ height: '100%' }} bodySx={{ p: '0.45rem' }}>
      <Box sx={{
        display: 'grid', gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(6,minmax(62px,1fr))' },
        gap: '0.6rem', minWidth: 0,
      }}>
        {ABILITIES.map(s => {
          const val = getFinal(C, s);
          const mod = getAbilityCheckBonus(C, s);
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
            <RollModeArea key={s} onClick={() => onRoll(mod, ABILITY_NAMES[s] + ' Check', advArg, { kind: 'abilityCheck' })}
              sources={{ adv: false, disadv: hasDisadv }}
              onPick={(picked) => onRoll(mod, ABILITY_NAMES[s] + ' Check', picked, { kind: 'abilityCheck' })}
              sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* A stat tile: its name in the bar, then two thirds for the
                  score and one for the modifier the check rolls. */}
              <StatTile
                tone={advArg === false ? UI_COLORS.warning : PANEL_TONES.abilityScores}
                label={ABILITY_ABBREVIATIONS[s]}
                clickable
                bodySx={{ alignItems: 'stretch' }}
                value={(
                  <Box sx={splitSx}>
                    <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.heading, color: 'text.primary', lineHeight: LINE_HEIGHTS.none }}>
                      {val}
                    </Typography>
                    <Box sx={modifierCellSx}>
                      <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lead, color: UI_COLORS.accentText, lineHeight: LINE_HEIGHTS.none }}>
                        {signed(shownMod)}
                      </Typography>
                      {visual ? (
                        <Tooltip title={tooltipText}>
                          <visual.Icon size={ICON_SIZES.xs} style={{ ...ROLL_FIGURE_MARK_STYLE, top: 2, right: 2, color: visual.color }} />
                        </Tooltip>
                      ) : null}
                    </Box>
                  </Box>
                )}
              />
            </RollModeArea>
          );
        })}
      </Box>
    </Panel>
  );
}

// Score | modifier, two thirds and one, filling the tile's body.
const splitSx = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  alignItems: 'center',
  justifyItems: 'center',
  width: '100%',
  py: 0.5,
};

const modifierCellSx = {
  ...COLUMN_RULE_SX,
  position: 'relative',
  alignSelf: 'stretch',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

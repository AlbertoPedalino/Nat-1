import { Box, Typography, Tooltip } from '@mui/material';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { getAbilityCheckBonus, getFinal, effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { describeCheckDisadvantage } from '../../../shared/character/combat/conditions.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { advantageVisual, conditionalDisadvantageVisual } from './advantageMark.jsx';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ABILITIES, ABILITY_NAMES } from '../../../shared/content/rulesVocabulary.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { COLUMN_RULE_SX } from '../../../shared/ui/interactive.js';
import { ROLL_FIGURE_MARK_STYLE } from '../../../shared/ui/pressable.js';
import StatTile from './StatTile.jsx';
import { sheetResponsive } from '../layout/layout.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { useStyleShapes } from '../../../shared/ui/themeIds.js';
import { drawsAbilities } from '../../../shared/ui/abilityDrawing.js';

export default function AbilityScores({ C, sheet, embedded = false, onRoll }) {
  const profSets = useProficiencySets();
  const armorPenalties = getEquippedArmorPenalties(C, sheet?.sheetInventory || C?.inventory || [], profSets);
  const activeConditions = sheet?.activeConditions || [];
  const { drawing, figures } = useStyleShapes().abilities;

  return (
    <Panel icon={GAME_ICONS.abilityScores} title="Ability Scores" tone={PANEL_TONES.abilityScores} sx={{ height: '100%' }} bodySx={{ p: '0.45rem' }}>
      <Box sx={{
        // Two rows of three on a phone and in an embedded sheet, one row of six
        // where the sheet has the width.
        display: 'grid', gridTemplateColumns: sheetResponsive(embedded, { xs: 'repeat(3,1fr)', sm: 'repeat(6,minmax(62px,1fr))' }),
        gap: '0.6rem', minWidth: 0,
        // Drawn scores lean: room between them and at the row's ends.
        ...(drawsAbilities(drawing) ? DRAWN_ROW_SX : null),
      }}>
        {ABILITIES.map((s, place) => {
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
                // A tile's name is in the heading's blackletter, which does not read
                // in capitals: Str, not STR.
                label={capitalize(s)}
                crest
                place={place}
                clickable
                bodySx={{ alignItems: 'stretch' }}
                value={(
                  <AbilityFigures
                    layout={figures}
                    score={val}
                    modifier={signed(shownMod)}
                    mark={visual ? (
                      <Tooltip title={tooltipText}>
                        <visual.Icon size={ICON_SIZES.xs} style={{ ...ROLL_FIGURE_MARK_STYLE, top: 2, right: 2, color: visual.color }} />
                      </Tooltip>
                    ) : null}
                  />
                )}
              />
            </RollModeArea>
          );
        })}
      </Box>
    </Panel>
  );
}

// A score and the modifier its check rolls, as the style lays them (shapes.js
// abilities.figures): the score beside its modifier, two thirds and one
// ('split'), or the modifier large over the score ('stacked'). `mark` is laid
// on the modifier's corner (disadvantage).
function AbilityFigures({ layout, score, modifier, mark }) {
  if (layout === 'stacked') {
    return (
      <>
        <Box sx={stackedModifierSx}>
          <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.display, color: 'text.primary', lineHeight: LINE_HEIGHTS.none }}>{modifier}</Typography>
          {mark}
        </Box>
        <Typography component="div" sx={{ ...TEXT_STYLES.label, fontSize: FONT_SIZES.xxs, color: 'text.secondary', lineHeight: LINE_HEIGHTS.none }}>
          score
          <Box component="span" sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.body, color: UI_COLORS.secondaryText, ml: 0.5 }}>{score}</Box>
        </Typography>
      </>
    );
  }
  return (
    <Box sx={splitSx}>
      <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.heading, color: 'text.primary', lineHeight: LINE_HEIGHTS.none }}>
        {score}
      </Typography>
      <Box sx={modifierCellSx}>
        <Typography sx={{ ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lead, color: UI_COLORS.accentText, lineHeight: LINE_HEIGHTS.none }}>
          {modifier}
        </Typography>
        {mark}
      </Box>
    </Box>
  );
}

// A row of drawn scores: they lean and sink, so room between them, at the
// row's ends and under it.
const DRAWN_ROW_SX = { columnGap: '1rem', rowGap: '1.25rem', px: 1, pt: 0.75, pb: 1, alignItems: 'end' };

// The modifier of a stacked score: the figure its check rolls, with room
// either side for the mark on its corner.
const stackedModifierSx = { position: 'relative', px: 1.25, mt: 0.25, mb: 0.25 };

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

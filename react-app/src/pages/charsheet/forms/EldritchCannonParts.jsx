import { Box, Typography } from '@mui/material';
import { cornerRadius } from '../../../shared/ui/radius.js';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { RichText } from '../../../shared/content/RichText.jsx';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import AttackRollButton from '../actions/AttackRollButton.jsx';
import { inlineButtonSx } from '../spells/spellsTabStyles.js';
import { ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import { eldritchCannonRuleGroups } from '../../../shared/character/forms/eldritchCannonForm.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { CARD_PART_RULE_SX } from '../../../shared/ui/interactive.js';

// The cannon's rules at a glance, folded under the active boards.
export function CannonRulesSummary({ maxHp, level }) {
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
      detailsSx={{ pt: 0.5 }}
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

// One firing option of an active cannon, tinted by its action type.
export function CannonActionRow({ mode, exhaustionLevel, onRoll, onShowToast }) {
  const barColor = ACTION_COLORS[mode.cat] || ACTION_COLORS.action;
  return (
    <ExpandableCard
      containerSx={{ overflow: 'hidden' }}
      disabled={!mode.desc}
      summary={({ toggle, disabled, open }) => (
        <Box
          onClick={disabled ? undefined : toggle}
          sx={{
            ...SURFACES.panel,
            display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.75,
            borderRadius: open ? '6px 6px 0 0' : 1,
            cursor: disabled ? 'default' : 'pointer',
          }}
        >
          <Box sx={{ width: 5, height: 22, borderRadius: 1, bgcolor: barColor, flexShrink: 0, opacity: OPACITY.solid }} />
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: 'text.primary' }}>{mode.name}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
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
        ...SURFACES.panel,
        px: 1, py: 0.75, borderTop: 'none', borderRadius: cornerRadius(0, 0, 0.75, 0.75), fontSize: FONT_SIZES.xs, color: 'text.secondary',
      }}
      details={mode.desc ? <RichText text={mode.desc} /> : null}
    />
  );
}

const rulesPanelSx = {
  mb: 0.75,
};

const rulesToggleSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  px: 1,
  py: 0.75,
  border: 2,
  borderColor: UI_COLORS.edge,
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.surfaceHeader, OPACITY.strong),
  cursor: 'pointer',
  '&:hover': {
    borderColor: uiAlpha(UI_COLORS.accent, OPACITY.edge),
    bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.soft),
  },
};

const rulesToggleTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxs,
  color: UI_COLORS.accentText,
};

const rulesToggleMetaSx = {
  ml: 'auto',
  minWidth: 0,
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
};

const rulesSummarySx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 0.75,
};

const rulesGroupSx = {
  minWidth: 0,
  px: 1,
  py: 0.75,
  border: 2,
  borderColor: UI_COLORS.edge,
  borderRadius: 1,
  bgcolor: uiAlpha(UI_COLORS.surfaceHeader, OPACITY.edge),
};

const rulesGroupTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxs,
  color: UI_COLORS.accentText,
  mb: 0.25,
};

const rulesRowSx = {
  display: 'grid',
  gridTemplateColumns: '58px minmax(0, 1fr)',
  gap: 0.75,
  alignItems: 'baseline',
  py: 0.5,
  ...CARD_PART_RULE_SX,
  '&:first-of-type': { borderTop: 0 },
};

const rulesLabelSx = {
  minWidth: 0,
  fontSize: FONT_SIZES.xxs,
  ...TEXT_STYLES.label,
  color: UI_COLORS.textMuted,
};

const rulesValueSx = {
  minWidth: 0,
  fontSize: FONT_SIZES.xs,
  lineHeight: LINE_HEIGHTS.normal,
  color: 'text.secondary',
};

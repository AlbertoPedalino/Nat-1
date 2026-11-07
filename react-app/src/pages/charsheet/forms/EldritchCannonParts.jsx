import { Box, Typography } from '@mui/material';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ExpandableCard } from '../../../shared/ui/ExpandableCard.jsx';
import { RichText } from '../../../shared/content/RichText.jsx';
import RollerButtons from '../../../shared/character/dice/RollerButtons.jsx';
import AttackRollButton from '../actions/AttackRollButton.jsx';
import { inlineButtonSx } from '../spells/spellsTabStyles.js';
import { ACTION_COLORS } from '../../../shared/ui/entityColors.js';
import { eldritchCannonRuleGroups } from '../../../shared/character/forms/eldritchCannonForm.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

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
  fontFamily: UI_FONTS.display,
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
  fontFamily: UI_FONTS.display,
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

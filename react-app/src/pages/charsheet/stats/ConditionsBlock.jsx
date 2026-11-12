import { useState } from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { ChevronDown, ListChecks, X } from 'lucide-react';
import { EXHAUSTION_KEY, EXHAUSTION_MAX } from '../../../shared/character/combat/conditions.js';
import { CONDITIONS } from '../../../shared/character/combat/conditions.js';
import {
  CONDITION_ACCENT as COND_ACCENT,
  ConditionCard,
  ConditionPill,
  ConditionToggleGrid,
} from '../../../shared/character/combat/ConditionChips.jsx';
import { useOpenConditionCards } from '../../../shared/character/combat/useOpenConditionCards.js';
import { UI_COLORS, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { PANEL_TONES } from '../../../shared/ui/entityColors.js';
import { inkShadow } from '../../../shared/ui/shadows.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import DisclosureButton from '../../../shared/ui/DisclosureButton.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import { actionButtonToneSx } from '../../../shared/ui/actionButton.js';

const DEAD_ACCENT = UI_COLORS.dangerStrong;

// The sheet's pills sit in a panel rather than an initiative row, so they run
// smaller than the encounter's.
const pillSx = { fontSize: FONT_SIZES.xxxs };

// Exhaustion is graded 1–6: a stepper pill instead of a plain toggle. − at level
// 1 removes it (level 0), so it is never disabled; + caps at 6 (death, shown
// red). The label between the buttons still expands the description card like
// other pills.
function ExhaustionPill({ level, onSet, hasDesc, isOpen, onToggle }) {
  const dead = level >= EXHAUSTION_MAX;
  const accent = dead ? DEAD_ACCENT : COND_ACCENT;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, height: CONTROL_HEIGHTS.sm, px: 0.5, border: 2, borderColor: accent, borderRadius: 999, bgcolor: alpha(accent, isOpen ? OPACITY.line : OPACITY.fill), boxShadow: isOpen ? inkShadow(accent, 2) : 'none' }}>
      <CountStepper
        size={14}
        tone={accent}
        label="exhaustion"
        canIncrease={!dead}
        onStep={(delta) => onSet(level + delta)}
        sx={{ gap: 0.25 }}
        value={(
          <Typography component="span" onClick={hasDesc ? onToggle : undefined}
            sx={{ fontSize: FONT_SIZES.xxxs, fontWeight: FONT_WEIGHTS.bold, color: accent, px: 0.25, userSelect: 'none', cursor: hasDesc ? 'pointer' : 'default' }}>
            {dead ? '☠ Exhaustion 6' : `Exhaustion ${level}`}
          </Typography>
        )}
      />
      {hasDesc ? (
        <ChevronDown size={ICON_SIZES.xxs} style={{ color: accent, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }} />
      ) : null}
    </Box>
  );
}

export default function ConditionsBlock({ sheet, onToggle, onClear, onSetExhaustion, conditionEntries }) {
  const [open, setOpen] = useState(false);
  const active = CONDITIONS.filter((c) => sheet.activeConditions.includes(c.key));
  const cards = useOpenConditionCards(active.map((c) => c.key), conditionEntries);
  const openCards = active.filter((c) => cards.openKeys.includes(c.key));

  return (
    <Panel icon={GAME_ICONS.conditions} title="Conditions" tone={PANEL_TONES.conditions} sx={{ flex: 1, minWidth: 140 }} bodySx={{ p: '0.4rem 0.62rem' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {active.length === 0 && <TagChip label="— None" />}
          {active.map((c) => (
            c.key === EXHAUSTION_KEY ? (
              <ExhaustionPill
                key={c.key}
                level={sheet.exhaustionLevel || 0}
                onSet={onSetExhaustion}
                hasDesc={cards.hasDesc(c.key)}
                isOpen={cards.isOpen(c.key)}
                onToggle={() => cards.toggleCard(c.key)}
              />
            ) : (
              <ConditionPill
                key={c.key}
                label={c.label}
                hasDesc={cards.hasDesc(c.key)}
                isOpen={cards.isOpen(c.key)}
                onToggle={() => cards.toggleCard(c.key)}
                onRemove={() => onToggle(c.key)}
                sx={pillSx}
              />
            )
          ))}
        </Box>

        {openCards.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {openCards.map((c) => (
              <ConditionCard key={c.key} label={c.label} entries={conditionEntries[c.key]} onClose={() => cards.toggleCard(c.key)} />
            ))}
          </Box>
        )}

        <Box>
          {/* The count stays in the name even at nought: "Manage (0)". */}
          <DisclosureButton
            open={open}
            onToggle={() => setOpen(!open)}
            icon={<ListChecks size={ICON_SIZES.xs} />}
            label={`Manage (${active.length})`}
          />
          <CollapsibleBody open={open}>
            <Box>
              <ConditionToggleGrid
                conditions={CONDITIONS}
                active={sheet.activeConditions}
                onToggle={onToggle}
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))', gap: 0.25, mt: 0.5 }}
                chipSx={{ fontSize: FONT_SIZES.xxxs }}
              />
              {active.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<X size={ICON_SIZES.xs} />}
                  onClick={onClear}
                  sx={{ mt: 0.5, fontSize: FONT_SIZES.xxxs, py: 0.25, lineHeight: LINE_HEIGHTS.normal, ...actionButtonToneSx(UI_COLORS.dangerDeep) }}
                >
                  Clear all
                </Button>
              )}
            </Box>
          </CollapsibleBody>
        </Box>
      </Box>
    </Panel>
  );
}

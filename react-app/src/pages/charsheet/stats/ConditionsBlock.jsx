import { useState } from 'react';
import { Box, Typography, Chip, Button, alpha } from '@mui/material';
import { ChevronDown, ListChecks, X, Minus, Plus } from 'lucide-react';
import { EXHAUSTION_KEY, EXHAUSTION_MAX } from '../../../shared/character/combat/conditions.js';
import { CONDITIONS } from '../../../shared/character/combat/conditions.js';
import {
  CONDITION_ACCENT as COND_ACCENT,
  ConditionCard,
  ConditionPill,
  ConditionToggleGrid,
} from '../../../shared/character/combat/ConditionChips.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { sheetBoxSx, sheetBoxTitleSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';

const DEAD_ACCENT = UI_COLORS.dangerStrong;

// The sheet's pills sit in a panel rather than an initiative row, so they run
// smaller than the encounter's.
const pillSx = { fontSize: FONT_SIZES.xxxs };

// Exhaustion is graded 1–6: a stepper pill instead of a plain toggle. − at level
// 1 removes it (level 0); + caps at 6 (death, shown red). The label still expands
// the description card like other pills.
function ExhaustionPill({ level, onSet, hasDesc, isOpen, onToggle }) {
  const dead = level >= EXHAUSTION_MAX;
  const accent = dead ? DEAD_ACCENT : COND_ACCENT;
  const StepButton = ({ label, onClick, disabled, children }) => (
    <Box component="button" type="button" aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      sx={{ display: 'inline-flex', p: 0, border: 0, bgcolor: 'transparent', color: accent, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? OPACITY.line : 1 }}>
      {children}
    </Box>
  );
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, height: CONTROL_HEIGHTS.sm, px: 0.5, border: 1, borderColor: accent, borderRadius: 999, bgcolor: alpha(accent, isOpen ? OPACITY.line : OPACITY.fill), boxShadow: isOpen ? `0 0 0 1px ${accent}` : 'none' }}>
      <StepButton label="Decrease exhaustion" onClick={() => onSet(level - 1)}><Minus size={ICON_SIZES.xxs} /></StepButton>
      <Typography component="span" onClick={hasDesc ? onToggle : undefined}
        sx={{ fontSize: FONT_SIZES.xxxs, fontWeight: FONT_WEIGHTS.bold, color: accent, px: 0.25, userSelect: 'none', cursor: hasDesc ? 'pointer' : 'default' }}>
        {dead ? '☠ Exhaustion 6' : `Exhaustion ${level}`}
      </Typography>
      <StepButton label="Increase exhaustion" onClick={() => onSet(level + 1)} disabled={dead}><Plus size={ICON_SIZES.xxs} /></StepButton>
      {hasDesc ? (
        <ChevronDown size={ICON_SIZES.xxs} style={{ color: accent, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }} />
      ) : null}
    </Box>
  );
}

export default function ConditionsBlock({ sheet, onToggle, onClear, onSetExhaustion, conditionEntries }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const active = CONDITIONS.filter((c) => sheet.activeConditions.includes(c.key));
  const toggleCard = (key) => setExpanded((prev) => (
    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
  ));
  // Derive open cards from the live active list so a removed condition's card
  // disappears automatically (no stale-state pruning needed).
  const openCards = active.filter((c) => expanded.includes(c.key) && conditionEntries?.[c.key]?.length);

  return (
    <Box sx={{ ...sheetBoxSx, flex: 1, minWidth: 140, p: '0.4rem 0.62rem' }}>
      <Typography sx={sheetBoxTitleSx}>Conditions</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
          {active.length === 0 && <Chip size="small" label="— None" variant="outlined" sx={{ fontSize: FONT_SIZES.xxxs, borderStyle: 'dashed' }} />}
          {active.map((c) => (
            c.key === EXHAUSTION_KEY ? (
              <ExhaustionPill
                key={c.key}
                level={sheet.exhaustionLevel || 0}
                onSet={onSetExhaustion}
                hasDesc={!!conditionEntries?.[c.key]?.length}
                isOpen={expanded.includes(c.key)}
                onToggle={() => toggleCard(c.key)}
              />
            ) : (
              <ConditionPill
                key={c.key}
                label={c.label}
                hasDesc={!!conditionEntries?.[c.key]?.length}
                isOpen={expanded.includes(c.key)}
                onToggle={() => toggleCard(c.key)}
                onRemove={() => onToggle(c.key)}
                sx={pillSx}
              />
            )
          ))}
        </Box>

        {openCards.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {openCards.map((c) => (
              <ConditionCard key={c.key} label={c.label} entries={conditionEntries[c.key]} onClose={() => toggleCard(c.key)} />
            ))}
          </Box>
        )}

        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: '3px 6px' }}>
          <Box
            component="button"
            type="button"
            onClick={() => setOpen(!open)}
            sx={{ width: '100%', bgcolor: 'transparent', border: 0, p: '2px 3px', borderRadius: 0.375, cursor: 'pointer', ...TEXT_STYLES.title, fontSize: FONT_SIZES.xxs, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, userSelect: 'none', '&:hover': { bgcolor: uiAlpha(UI_COLORS.white, OPACITY.wash), color: 'text.primary' } }}
          >
            <ListChecks size={ICON_SIZES.xs} /> Manage ({active.length})
            <ChevronDown size={ICON_SIZES.xs} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </Box>
          {open && (
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
                  sx={{ mt: 0.5, fontSize: FONT_SIZES.xxxs, py: 0.25, lineHeight: LINE_HEIGHTS.normal, color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: UI_COLORS.dangerDeep, color: UI_COLORS.dangerDeep, bgcolor: uiAlpha(UI_COLORS.dangerDeep, OPACITY.soft) } }}
                >
                  Clear all
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

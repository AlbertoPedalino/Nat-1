import { useState } from 'react';
import { Box, Typography, Chip, Button, alpha } from '@mui/material';
import { ChevronDown, ListChecks, X, Minus, Plus } from 'lucide-react';
import { EXHAUSTION_MAX } from '../logic/calculations.js';
import { CONDITIONS } from '../../../shared/character/conditions.js';
import {
  CONDITION_ACCENT as COND_ACCENT,
  ConditionCard,
  ConditionPill,
} from '../../../shared/character/ConditionChips.jsx';

const DEAD_ACCENT = '#e5484d';

// The sheet's pills sit in a panel rather than an initiative row, so they run
// smaller than the encounter's.
const pillSx = { fontSize: '0.5rem' };

// Exhaustion is graded 1–6: a stepper pill instead of a plain toggle. − at level
// 1 removes it (level 0); + caps at 6 (death, shown red). The label still expands
// the description card like other pills.
function ExhaustionPill({ level, onSet, hasDesc, isOpen, onToggle }) {
  const dead = level >= EXHAUSTION_MAX;
  const accent = dead ? DEAD_ACCENT : COND_ACCENT;
  const StepButton = ({ label, onClick, disabled, children }) => (
    <Box component="button" type="button" aria-label={label} disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      sx={{ display: 'inline-flex', p: 0, border: 0, bgcolor: 'transparent', color: accent, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1 }}>
      {children}
    </Box>
  );
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: 20, px: '3px', border: 1, borderColor: accent, borderRadius: '11px', bgcolor: alpha(accent, isOpen ? 0.3 : 0.14), boxShadow: isOpen ? `0 0 0 1px ${accent}` : 'none' }}>
      <StepButton label="Decrease exhaustion" onClick={() => onSet(level - 1)}><Minus size={11} /></StepButton>
      <Typography component="span" onClick={hasDesc ? onToggle : undefined}
        sx={{ fontSize: '0.5rem', fontWeight: 700, color: accent, px: '1px', userSelect: 'none', cursor: hasDesc ? 'pointer' : 'default' }}>
        {dead ? '☠ Exhaustion 6' : `Exhaustion ${level}`}
      </Typography>
      <StepButton label="Increase exhaustion" onClick={() => onSet(level + 1)} disabled={dead}><Plus size={11} /></StepButton>
      {hasDesc ? (
        <ChevronDown size={10} style={{ color: accent, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', cursor: 'pointer' }}
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
    <Box sx={{ flex: 1, minWidth: 140, bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, p: '0.4rem 0.62rem' }}>
      <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'primary.main', mb: 0.4 }}>Conditions</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
          {active.length === 0 && <Chip size="small" label="— None" variant="outlined" sx={{ fontSize: '0.5rem', borderStyle: 'dashed' }} />}
          {active.map((c) => (
            c.key === 'exhaustion' ? (
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
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
            sx={{ width: '100%', bgcolor: 'transparent', border: 0, p: '2px 3px', borderRadius: '3px', cursor: 'pointer', fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.56rem', color: 'text.secondary', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 0.5, userSelect: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: 'text.primary' } }}
          >
            <ListChecks size={12} /> Manage ({active.length})
            <ChevronDown size={12} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </Box>
          {open && (
            <Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(108px,1fr))', gap: 0.25, mt: 0.5 }}>
                {CONDITIONS.map((c) => {
                  const isOn = sheet.activeConditions.includes(c.key);
                  return (
                    <Chip key={c.key} size="small" label={c.label} variant={isOn ? 'filled' : 'outlined'}
                      onClick={() => onToggle(c.key)}
                      sx={{ fontSize: '0.5rem', cursor: 'pointer', justifyContent: 'flex-start', '&:hover': { boxShadow: `0 0 0 1px ${isOn ? COND_ACCENT : 'rgba(255,255,255,0.25)'}` }, ...(isOn ? { color: COND_ACCENT, bgcolor: alpha(COND_ACCENT, 0.14) } : {}) }} />
                  );
                })}
              </Box>
              {active.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<X size={12} />}
                  onClick={onClear}
                  sx={{ mt: 0.6, fontSize: '0.5rem', py: 0.1, lineHeight: 1.4, color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: '#a04848', color: '#a04848', bgcolor: 'rgba(160,72,72,0.08)' } }}
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

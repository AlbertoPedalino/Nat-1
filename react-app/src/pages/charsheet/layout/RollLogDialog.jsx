import { Box, Button, Typography } from '@mui/material';
import { Dices, Trash2 } from 'lucide-react';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import RollActorLabel from '../../../shared/character/dice/RollActorLabel.jsx';
import RollCalculation from '../../../shared/character/dice/RollCalculation.jsx';
import { rollOutcome } from '../../../shared/character/dice/rollLogPresentation.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

function cleanFormula(detail) {
  if (!detail) return '';
  return detail.replace(/\s*=\s*\d+$/, '');
}

function splitLabel(label, detail) {
  const result = { clean: label || '', suffix: '' };
  if (!label || !detail) return result;
  const cleaned = cleanFormula(detail);
  if (!cleaned) return result;
  const idx = label.toLowerCase().lastIndexOf(cleaned.toLowerCase());
  if (idx >= 0) {
    result.clean = label.slice(0, idx).replace(/[\s\-–—]+$/, '');
    result.suffix = label.slice(idx).trim();
  }
  return result;
}

const ROLL_LOG_SX = {
  entry: {
    border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.5, mb: 0.4,
    bgcolor: uiAlpha(UI_COLORS.headerBg, 0.6),
  },
  label: { fontFamily: UI_FONTS.display, fontSize: '0.7rem', color: 'text.primary', fontWeight: 700, letterSpacing: '0.04em', mb: 0.15 },
  formula: { fontSize: '0.6rem', color: 'text.secondary', fontFamily: UI_FONTS.mono, lineHeight: 1.2 },
  empty: { fontSize: '0.75rem', color: 'text.secondary', fontStyle: 'italic', textAlign: 'center', py: 3 },
};

// The sheet's roll log: the last fifty rolls, newest first.
export default function RollLogDialog({
  open, onClose, rollLog, onClear,
}) {
  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      title="Roll Log"
      icon={<Dices size={20} />}
      headerRight={rollLog?.length > 0 ? (
        <Button size="small" variant="text" startIcon={<Trash2 size={12} />}
          onClick={() => onClear?.()}
          sx={{ fontSize: '0.6rem', color: 'text.secondary', minWidth: 0, p: 0.3 }}>
          Clear
        </Button>
      ) : null}
      actions={(
        <Button onClick={onClose} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
          Close
        </Button>
      )}
    >
      {!rollLog?.length ? (
          <Typography sx={ROLL_LOG_SX.empty}>No rolls yet. Make an ability check, save, or attack to see it here.</Typography>
        ) : (
          rollLog.slice(0, 50).map((entry, i) => {
            const formulaText = cleanFormula(entry.detail);
            const labelParts = splitLabel(entry.label, formulaText);
            const extra = labelParts.suffix
              ? labelParts.suffix.replace(formulaText, '').trim()
              : '';
            const outcome = rollOutcome(entry);
            const { isCrit, isFail } = outcome;
            return (
            <Box key={entry.timestamp + '-' + i} sx={{
              ...ROLL_LOG_SX.entry, display: 'flex', gap: 0.5,
            }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <RollActorLabel entry={entry} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.15 }}>
                  <Typography sx={{ ...ROLL_LOG_SX.label, mb: 0 }}>{labelParts.clean}</Typography>
                </Box>
                {(isCrit || isFail) && (
                  <Typography sx={{ fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.08em', color: outcome.color, fontFamily: UI_FONTS.display, mb: 0.15 }}>
                    {isCrit ? 'NATURAL 20!' : 'NATURAL 1'}
                  </Typography>
                )}
                <RollCalculation entry={entry} />
                {extra ? <Typography sx={ROLL_LOG_SX.formula}>{extra}</Typography> : null}
                {entry.note ? <Typography sx={ROLL_LOG_SX.formula}>{entry.note}</Typography> : null}
              </Box>
            </Box>
            );
          })
        )}
    </SheetDialog>
  );
}

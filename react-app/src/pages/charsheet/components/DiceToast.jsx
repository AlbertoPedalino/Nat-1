import { useEffect } from 'react';
import { Box, Chip, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';

const FONT = '"Cinzel", Georgia, serif';

const MODE_CHIP = {
  advantage:    { label: 'ADV', color: '#58b879', borderColor: 'rgba(88,184,121,0.55)', bgColor: 'rgba(88,184,121,0.14)' },
  disadvantage: { label: 'DIS', color: '#d69245', borderColor: 'rgba(214,146,69,0.55)', bgColor: 'rgba(214,146,69,0.14)' },
};

const toastRootSx = {
  position: 'fixed', bottom: '1.2rem', right: '1.2rem', zIndex: 999,
  bgcolor: 'rgba(26,23,19,0.97)', border: 2, borderColor: 'divider', borderRadius: 2,
  p: '1rem 1.2rem', minWidth: 240, maxWidth: 340,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  backdropFilter: 'blur(8px)',
};

const modeChipSx = (chip) => ({
  height: 20, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em',
  borderRadius: 1, mb: 0.3, color: chip.color, borderColor: chip.borderColor,
  bgcolor: chip.bgColor, '& .MuiChip-label': { px: 0.5 },
});

function diceColor(value, faces) {
  if (value >= (faces || 20)) return '#edd48a';
  if (value <= 1) return '#de675f';
  return 'text.primary';
}

function formatBonus(n) {
  const b = Number(n) || 0;
  return b >= 0 ? `+${b}` : `${b}`;
}

function resolveToastLayout(toast) {
  const rolls = toast.rolls || [];
  const d20s = rolls.filter((r) => r.faces === 20);
  const keptD20 = d20s.find((r) => r.kept) || d20s[0];

  const mode = toast.meta?.mode;
  const bonus = toast.meta?.bonus;
  const hasBonus = Number.isFinite(bonus);
  const formulaMod = d20s.length === 0 && rolls.length > 0
    ? String(toast.detail || '').match(/([+-]\d+)$/)?.[1] || null
    : null;

  const modifier = hasBonus ? formatBonus(bonus) : formulaMod;

  const isCrit = keptD20?.v >= 20;
  const isFail = keptD20?.v <= 1;
  let totalColor = 'text.primary';
  if (isCrit) totalColor = '#edd48a';
  else if (isFail) totalColor = '#de675f';

  return {
    label: toast.label,
    modeChip: MODE_CHIP[mode] || null,
    isCrit,
    isFail,
    dice: rolls.map((r) => ({
      value: r.v,
      faces: r.faces,
      color: diceColor(r.v, r.faces),
      dimmed: r.kept === false,
    })),
    modifier,
    total: toast.total != null && toast.total !== '' ? toast.total : null,
    totalColor,
  };
}

export default function DiceToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const layout = resolveToastLayout(toast);

  return (
    <Box sx={{
      ...toastRootSx,
      ...(layout.isCrit ? { borderColor: '#edd48a', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(237,212,138,0.25)' } : {}),
      ...(layout.isFail ? { borderColor: '#de675f', boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(222,103,95,0.25)' } : {}),
    }}>
      <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 6, right: 8, color: 'text.secondary' }}>
        <X size={14} />
      </IconButton>

      <Typography sx={{ fontFamily: FONT, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', mb: 0.3 }}>
        {layout.label}
      </Typography>

      {layout.isCrit && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: '#edd48a', mb: 0.3 }}>
          NATURAL 20!
        </Typography>
      )}
      {layout.isFail && (
        <Typography sx={{ fontFamily: FONT, fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.1em', color: '#de675f', mb: 0.3 }}>
          NATURAL 1
        </Typography>
      )}

      {layout.modeChip && (
        <Chip size="small" label={layout.modeChip.label} variant="outlined" sx={modeChipSx(layout.modeChip)} />
      )}

      {(layout.dice.length > 0 || layout.modifier) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, my: 0.4, alignItems: 'center' }}>
          {layout.dice.map((d, i) => (
            <Box key={i} sx={{
              bgcolor: d.dimmed ? 'rgba(46,42,34,1)' : 'rgba(202,165,80,0.16)',
              border: 1, borderColor: d.dimmed ? 'divider' : 'primary.main', borderRadius: 1,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontSize: '0.875rem', fontWeight: 700,
              opacity: d.dimmed ? 0.35 : 1, color: d.color,
            }}>
              {d.value}
            </Box>
          ))}
          {layout.modifier && (
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', fontFamily: FONT, fontWeight: 700, ml: 0.3 }}>
              {layout.modifier}
            </Typography>
          )}
        </Box>
      )}

      {layout.total != null && (
        <Typography sx={{
          fontFamily: FONT, fontWeight: 900, lineHeight: 1, textAlign: 'center', my: 0.3,
          fontSize: (layout.isCrit || layout.isFail) ? '2rem' : '1.5rem',
          color: layout.totalColor,
        }}>
          {layout.total}
        </Typography>
      )}
    </Box>
  );
}

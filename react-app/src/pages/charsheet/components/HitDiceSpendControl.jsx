import { Box, Typography } from '@mui/material';
import PipButton from '../../../shared/character/PipButton.jsx';

// Interactive Hit Dice pips for the Short Rest dialog. Mirrors the look of
// the old standalone Hit Dice panel: hollow pips are dice already used,
// filled pips are available, highlighted pips are queued to spend on this
// rest. Click a pip to set how many dice to spend (click the last queued
// pip again to decrement).
export default function HitDiceSpendControl({ pool, value, onChange, conMod }) {
  const setCount = (n) => onChange(Math.max(0, Math.min(n, pool.remaining)));

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1, bgcolor: 'rgba(35,32,26,0.72)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: 'primary.main', flex: 1 }}>
          {pool.label} d{pool.faces}
        </Typography>
        <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary' }}>
          {pool.remaining}/{pool.total} left
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {Array.from({ length: pool.total }, (_, i) => {
          const used = i >= pool.remaining;
          const spending = !used && i < value;
          return (
            <PipButton
              key={i}
              onClick={used ? undefined : () => setCount(value === i + 1 ? i : i + 1)}
              aria-label={`${pool.label}: spend ${i + 1} of ${pool.remaining}`}
              title={used ? 'Already used' : spending ? 'Will spend' : 'Available'}
              sx={{
                fontSize: '0.66rem',
                borderColor: spending ? '#caa550' : used ? 'divider' : 'rgba(202,165,80,0.5)',
                color: spending ? '#1a1713' : used ? 'text.disabled' : 'primary.main',
                bgcolor: spending ? '#caa550' : used ? 'rgba(35,32,26,1)' : 'rgba(202,165,80,0.14)',
                opacity: used ? 0.35 : 1,
              }}
            >
              {used ? '○' : '●'}
            </PipButton>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: '0.66rem', color: 'text.secondary', textAlign: 'right', mt: 0.5 }}>
        Spend: {value}d{pool.faces}{conMod >= 0 ? '+' : ''}{conMod} each
      </Typography>
    </Box>
  );
}

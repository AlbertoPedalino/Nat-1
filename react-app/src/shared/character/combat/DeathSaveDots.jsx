import { Box, Typography } from '@mui/material';

const TRACKS = [
  { type: 'success', label: 'Success', short: 'S' },
  { type: 'fail', label: 'Failure', short: 'F' },
];

// Three success and three failure dots, each a button that sets that count
// (the same dot again takes one back, as the callers' setters do).
// `deathSaves` is { success, fail }; `colors` maps each track to a theme colour.
export default function DeathSaveDots({
  deathSaves, onChange, disabled = false, size = 13, shortLabels = false,
  colors = { success: 'success.main', fail: 'error.main' }, gap = 1,
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap }}>
      {TRACKS.map(({ type, label, short }) => (
        <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          <Typography
            component="span"
            sx={shortLabels
              ? { fontSize: '0.7rem', color: colors[type], mr: 0.2 }
              : { fontSize: '0.55rem', color: 'text.secondary', mr: 0.1 }}
          >
            {shortLabels ? short : label}
          </Typography>
          {[1, 2, 3].map((value) => {
            const active = Number(deathSaves?.[type] || 0) >= value;
            return (
              <Box
                key={value}
                component="button"
                type="button"
                aria-label={`${label} ${value}`}
                disabled={disabled}
                data-active={active ? 'true' : 'false'}
                onClick={() => onChange(type, value)}
                sx={{
                  width: size,
                  height: size,
                  p: 0,
                  border: '1px solid',
                  borderColor: colors[type],
                  borderRadius: '50%',
                  bgcolor: active ? colors[type] : 'transparent',
                  cursor: 'pointer',
                  '&:disabled': { cursor: 'default', opacity: 0.45 },
                }}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

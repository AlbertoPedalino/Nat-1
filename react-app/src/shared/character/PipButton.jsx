import { Box } from '@mui/material';

// Accessible pip/dot used across the sheet (hit dice, resource dots,
// free-cast dots). When given an `onClick` it renders a native <button>
// so it gets keyboard activation, focus ring and ARIA for free; otherwise
// it renders a non-interactive <span> (a status indicator, not a fake
// button). Visual state (fill/border colors) stays with the caller via
// `sx` — the sheet uses two inverse fill conventions, so this primitive
// owns structure + a11y, not color semantics.
export default function PipButton({ size = 20, round = false, onClick, sx, ...props }) {
  const interactive = typeof onClick === 'function';
  return (
    <Box
      component={interactive ? 'button' : 'span'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        flexShrink: 0,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 1,
        borderRadius: round ? '50%' : '3px',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background-color 0.12s, border-color 0.12s',
        ...(interactive ? {
          '&:disabled': { cursor: 'default' },
          '&:focus-visible': { outline: '2px solid #edd48a', outlineOffset: '1px' },
          '&:hover:not(:disabled)': { borderColor: '#edd48a' },
        } : {}),
        ...sx,
      }}
      {...props}
    />
  );
}

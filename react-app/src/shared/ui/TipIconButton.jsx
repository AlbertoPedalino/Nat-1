import { Box, IconButton, Tooltip } from '@mui/material';

// An icon button that says what it does: the tooltip over it is its name for
// a screen reader too (`ariaLabel` only when the two must differ). A disabled
// button still shows its tooltip, through a span that takes the pointer for
// it. `danger` marks one that removes something (delete, remove, unlink,
// leave): every such button wears the same red, so a restyle of what
// destroys is made here. Every other prop is the IconButton's.
export default function TipIconButton({
  title, ariaLabel, placement, arrow, disabled = false, danger = false, children, ...buttonProps
}) {
  const button = (
    <IconButton
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
      disabled={disabled}
      {...(danger ? { color: 'error' } : null)}
      {...buttonProps}
    >
      {children}
    </IconButton>
  );
  return (
    <Tooltip title={title} placement={placement} arrow={arrow}>
      {disabled ? <Box component="span" sx={{ display: 'inline-flex' }}>{button}</Box> : button}
    </Tooltip>
  );
}

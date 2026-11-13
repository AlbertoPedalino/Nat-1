import { Chip } from '@mui/material';
import { X } from 'lucide-react';
import { OPACITY } from '../../ui/colors.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import { markerDensitySx, markerOnHoverSx, markerOnSx } from './markerChipStyles.js';

// A marker ON a creature — a condition, a reminder — the one chip both are
// drawn with, on the sheet, in the encounter builder and in the map's piece
// menu. Its look is markerOnSx in its accent, the same whether it does
// something when clicked (a condition opens its rules card) or not (a
// reminder), so the two kinds read as one family.
//
// `onClick` makes the body act; `onRemove` adds the ×, named by `removeLabel`;
// `dimmed` quiets one that cannot be changed here; `density` sizes it for its
// surface (MARKER_DENSITY). Anything else reaches the Chip, so a Tooltip can
// wrap it.
export default function MarkerChip({
  label, accent, open = false, icon, onClick, onRemove, removeLabel, dimmed = false, density, ...rest
}) {
  return (
    <Chip
      {...rest}
      size="small"
      label={label}
      icon={icon}
      onClick={onClick}
      onDelete={onRemove}
      deleteIcon={onRemove ? <X size={ICON_SIZES.xs} aria-label={removeLabel} /> : undefined}
      sx={[
        markerOnSx(accent, { open }),
        onClick ? markerOnHoverSx(accent) : { cursor: 'default' },
        dimmed ? { opacity: OPACITY.heavy } : null,
        markerDensitySx(density),
      ]}
    />
  );
}

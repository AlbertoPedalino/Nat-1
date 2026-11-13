import { Button } from '@mui/material';
import { Plus } from 'lucide-react';
import { ICON_SIZES } from './iconSizes.js';

// Every button that adds or creates something (a spell, a custom item, a new
// encounter, a scene, a tool, a note): the + and its label, one look across
// the app. `main` is the screen's or the dialog's own action, filled in the
// accent (Create, Add to encounter, New scene); without it the button is a
// secondary one, outlined (Custom item, Multiclass, Add tool).
// Its icon follows its size. Everything else (onClick, disabled, size, sx for
// placement) passes through.
export default function AddButton({ main = false, size = 'small', children, ...props }) {
  return (
    <Button
      variant={main ? 'contained' : 'outlined'}
      size={size}
      startIcon={<Plus size={size === 'small' ? ICON_SIZES.sm : ICON_SIZES.md} />}
      {...props}
    >
      {children}
    </Button>
  );
}

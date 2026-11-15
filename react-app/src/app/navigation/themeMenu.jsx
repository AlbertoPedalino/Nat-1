import { useState } from 'react';
import { Divider, MenuItem } from '@mui/material';
import { Palette } from 'lucide-react';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import ThemeDialog from './ThemeDialog.jsx';

// The theme in the top bar's account menu (CloudMenu's `extraItems`): one item,
// Theme, that closes the menu and opens the theme panel (ThemeDialog: the
// colours and the styles). `items(close)` are the menu's; `dialog` is the
// panel, drawn outside the menu, which goes away when it closes.
export function useThemeMenu() {
  const [open, setOpen] = useState(false);
  const items = (closeMenu) => [
    <Divider key="theme-divider" />,
    <MenuItem key="theme" onClick={() => { closeMenu(); setOpen(true); }}>
      <Palette size={ICON_SIZES.sm} style={{ marginRight: 8 }} /> Theme
    </MenuItem>,
  ];
  const dialog = <ThemeDialog open={open} onClose={() => setOpen(false)} />;
  return { items, dialog };
}

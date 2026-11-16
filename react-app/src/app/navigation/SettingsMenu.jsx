import { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Palette, Settings } from 'lucide-react';
import TopBarButton from '../../shared/ui/TopBarButton.jsx';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import ThemeDialog from './ThemeDialog.jsx';

// The top bar's settings: a gear (icon only on a phone) that opens a menu of
// the viewer's preferences, there whether or not anyone is signed in. Today
// one item, Theme, that closes the menu and opens the theme panel
// (ThemeDialog: the look and the dice); a new preference is one more item here.
export default function SettingsMenu() {
  const [anchor, setAnchor] = useState(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const close = () => setAnchor(null);
  return (
    <>
      <TopBarButton
        icon={Settings}
        label="Settings"
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        active={Boolean(anchor)}
        onClick={(e) => setAnchor(e.currentTarget)}
      />
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { close(); setThemeOpen(true); }}>
          <Palette size={ICON_SIZES.sm} style={{ marginRight: 8 }} /> Theme
        </MenuItem>
      </Menu>
      <ThemeDialog open={themeOpen} onClose={() => setThemeOpen(false)} />
    </>
  );
}

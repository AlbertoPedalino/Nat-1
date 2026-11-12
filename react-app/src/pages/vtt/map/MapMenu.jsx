import { Button, Divider, Menu, Stack } from '@mui/material';
import { MAP_PAPER_SX } from '../../../shared/ui/mapPaper.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import ToggleRow from '../../../shared/ui/ToggleRow.jsx';
import { useMenuPlacement } from './menuPlacement.js';

// Every menu on the battle map, on the map's paper (shared/ui/mapPaper.js),
// so the piece menu, the drawing menu and the top bar's drop-downs are one
// surface. Two kinds:
//   - `point` ({ x, y }): a menu of controls opened where the map was pressed
//     (a right-click or a long press on a piece or a mark), placed by
//     useMenuPlacement so a touch keyboard never shoves it about. Its
//     children are laid out as a compact form;
//   - `anchorEl`: a list of MenuItems dropping from a button of the map's bar
//     (Live, the scene switcher, initiative). Passing the prop at all, null
//     while closed, picks this kind, so a closing menu keeps its layout.
// It is open while it has its point or its anchor. `width` fixes the paper's
// width, `minWidth` and `maxHeight` bound it; inside the visible window
// always, not 100vh: on a phone 100vh is taller than the screen while the
// browser bar shows, and a menu that tall is pushed up past the top edge (32px
// leaves Popover's 16px margins). `id` names it for the button's
// aria-controls.
export default function MapMenu({
  point = null, anchorEl, onClose, width, minWidth, maxHeight = 'calc(100% - 32px)', id, children,
}) {
  const atPoint = anchorEl === undefined;
  const placement = useMenuPlacement(atPoint ? point : null);
  return (
    <Menu
      id={id}
      open={Boolean(anchorEl || point)}
      onClose={onClose}
      {...(atPoint ? placement.menuProps : { anchorEl })}
      slotProps={{
        transition: atPoint ? placement.transitionProps : undefined,
        paper: {
          sx: [
            MAP_PAPER_SX,
            { width, minWidth, maxHeight, maxWidth: 'calc(100vw - 16px)' },
            atPoint && FORM_PAPER_SX,
          ],
        },
      }}
    >
      {atPoint ? <Stack spacing={0.75} sx={FORM_SX}>{children}</Stack> : children}
    </Menu>
  );
}

// A form menu pads its own content; the list's padding would double it.
const FORM_PAPER_SX = { '& .MuiMenu-list': { p: 0 } };
const FORM_SX = { px: 1, py: 0.75 };

// The last row of a form menu, under a rule: Done, which only closes it, then
// what can be done to the thing (Sheet, Stat block, Delete). `actions` are
// [{ label, icon, onClick, color }]; each closes the menu after its own
// `onClick`. Done takes the room the others leave.
export function MenuFooterActions({ onClose, actions = [] }) {
  return (
    <>
      <Divider />
      <Stack direction="row" spacing={0.5}>
        <Button size="small" variant="outlined" onClick={onClose} sx={[footerButtonSx, { flex: 1 }]}>Done</Button>
        {actions.map(({ label, icon: Icon, onClick, color }) => (
          <Button
            key={label}
            size="small"
            variant="outlined"
            color={color}
            startIcon={Icon ? <Icon size={ICON_SIZES.sm} /> : null}
            onClick={() => { onClick(); onClose(); }}
            sx={footerButtonSx}
          >
            {label}
          </Button>
        ))}
      </Stack>
    </>
  );
}

const footerButtonSx = {
  minHeight: CONTROL_HEIGHTS.lg,
  py: 0.25,
  fontSize: FONT_SIZES.xs,
};

// Whether the table sees a piece or a mark at all: the GM's tick at the top of
// either menu. `onChange` gets the new state.
export function HiddenFromPlayersToggle({ checked, onChange }) {
  return (
    <ToggleRow dense control="checkbox" label="Hidden from the players" checked={checked} onChange={onChange} />
  );
}

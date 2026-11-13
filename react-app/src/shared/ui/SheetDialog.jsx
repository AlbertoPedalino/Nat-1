import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Stack, Typography } from '@mui/material';
import { X } from 'lucide-react';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { panelTitleBarSx, panelTitleSx } from './PanelHeader.jsx';
import { UI_SHADOWS } from './shadows.js';
import { TEXT_STYLES } from './textStyles.js';
import { SURFACES } from './surfaces.js';
import { ICON_SIZES } from './iconSizes.js';
import { CARD_PART_RULE_SX } from './interactive.js';
import CornerCloseButton from './CornerCloseButton.jsx';
import Caption from './Caption.jsx';
import { useIsPhone } from './useIsPhone.js';
import { MAP_PAPER_SX } from './mapPaper.js';

// Dialog chrome that matches the panels (the header-tint bar over an ink line,
// uppercase display title) so dialogs feel native to the sheet rather than
// like plain MUI popups. Buttons use the sheet's small display scale. Single source for every sheet dialog; pass `headerRight` for
// title-bar extras (counts, a Clear button) and `actions` for the button bar.
// Without a `title` there is no bar, for content that carries its own (a
// statblock, a compendium entry); `showClose` then puts the close button in
// the content's corner (a CornerCloseButton, named by `closeLabel`).
// `phoneFullScreen` is for a dialog that is a whole tool (a negotiation, the
// fumble tables): it fills a phone's screen and tightens its content's
// padding there, so the tool keeps its width.
// `surface`: what the dialog is laid on. 'sheet' (the default) is the raised
// paper with a solid body; 'map' is the battle map's glass (MAP_PAPER_SX)
// with the content and the action bar left clear, for every dialog opened
// over the board. The title bar, the padding and the buttons are the same on
// both, so a map dialog changes with every other one.

const paperSx = {
  ...SURFACES.panel,
  backgroundImage: 'none',
  boxShadow: UI_SHADOWS.overlay,
};

const titleSx = {
  ...panelTitleBarSx(),
  color: 'primary.main',
  py: 1,
};

// Lettered like a panel's title.
const titleTextSx = {
  ...panelTitleSx,
  lineHeight: LINE_HEIGHTS.snug,
};

// The way out of a dialog without doing anything: a quiet text button, first
// in the action bar, the same in every dialog.
export function CancelButton({ onClick, disabled, autoFocus, children = 'Cancel' }) {
  return (
    <Button onClick={onClick} disabled={disabled} autoFocus={autoFocus} sx={{ color: 'text.secondary' }}>
      {children}
    </Button>
  );
}

// The title of a section inside a dialog's content.
export const dialogSectionTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.md,
  color: 'primary.main',
};

// A section of a dialog's content: its title, the line under it that says how
// it works (`hint`), then what it holds. `sx` frames or places it.
export function DialogSection({ title, hint, children, sx }) {
  return (
    <Box sx={sx}>
      <Stack spacing={0.5}>
        <Typography sx={dialogSectionTitleSx}>{title}</Typography>
        {hint ? <Caption>{hint}</Caption> : null}
      </Stack>
      {children}
    </Box>
  );
}

// Starting a dialog's tool over (a negotiation, a fumble table): a quiet
// button at the start of the action bar, away from the dialog's main action.
// The caller asks for confirmation.
export function ResetButton({ onClick, children = 'Reset' }) {
  return (
    <Button onClick={onClick} color="inherit" size="small" sx={{ mr: 'auto' }}>
      {children}
    </Button>
  );
}

// Base content padding. Top padding uses the `&.MuiDialogContent-root`
// selector to match the specificity of MUI's default
// `.MuiDialogTitle-root + .MuiDialogContent-root { padding-top: 0 }` rule —
// a plain `pt` loses to it and is silently ignored. The gap below the title
// bar is set via the `topPad` prop.
const contentSx = { position: 'relative', bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid), px: 2.25, pb: 2 };

// A phoneFullScreen dialog's content: tighter at the sides on a phone.
const phoneContentSx = { px: { xs: 1.25, sm: 2.25 }, pb: { xs: 1.5, sm: 2 } };

const actionsSx = {
  px: 2.25,
  py: 1.25,
  gap: 0.75,
  bgcolor: uiAlpha(UI_COLORS.surfaceDeep, OPACITY.solid),
  ...CARD_PART_RULE_SX,
  // Compact buttons, at the sheet's button scale.
  '& .MuiButton-root': {
    fontSize: FONT_SIZES.xs,
    minWidth: 0,
    px: 1.5,
    py: 0.25,
  },
};

// What each surface changes: the paper, and the body behind the content and
// the actions (on the map the glass shows through).
const SURFACE_LOOKS = Object.freeze({
  sheet: Object.freeze({ paperSx, bodySx: null }),
  map: Object.freeze({ paperSx: MAP_PAPER_SX, bodySx: Object.freeze({ bgcolor: 'transparent' }) }),
});

export default function SheetDialog({
  open,
  onClose,
  title,
  icon,
  headerRight,
  showClose = false,
  closeLabel = 'Close',
  phoneFullScreen = false,
  children,
  actions,
  maxWidth = 'xs',
  fullWidth = true,
  topPad = 3,
  surface = 'sheet',
  titleSx: titleSxOverride,
  contentSx: contentSxOverride,
  actionsSx: actionsSxOverride,
  slotProps,
  ...props
}) {
  const isPhone = useIsPhone();
  const look = SURFACE_LOOKS[surface] || SURFACE_LOOKS.sheet;
  const right = showClose
    ? <>{headerRight}<IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}><X size={ICON_SIZES.md} /></IconButton></>
    : headerRight;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      slotProps={{
        ...slotProps,
        paper: {
          ...slotProps?.paper,
          sx: { ...look.paperSx, ...slotProps?.paper?.sx },
        },
      }}
      {...props}
      {...(phoneFullScreen ? { fullScreen: isPhone } : null)}
    >
      {title != null ? (
        <DialogTitle sx={{ ...titleSx, ...titleSxOverride }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
            {icon}
            <Typography component="span" sx={titleTextSx}>{title}</Typography>
            {right != null ? <><Box component="span" sx={{ flex: 1 }} />{right}</> : null}
          </Stack>
        </DialogTitle>
      ) : null}
      <DialogContent sx={{ ...contentSx, ...look.bodySx, ...(phoneFullScreen ? phoneContentSx : null), '&.MuiDialogContent-root': { pt: topPad }, ...contentSxOverride }}>
        {title == null && showClose ? (
          <CornerCloseButton onClose={onClose} label={closeLabel} />
        ) : null}
        {children}
      </DialogContent>
      {actions != null ? <DialogActions sx={{ ...actionsSx, ...look.bodySx, ...actionsSxOverride }}>{actions}</DialogActions> : null}
    </Dialog>
  );
}

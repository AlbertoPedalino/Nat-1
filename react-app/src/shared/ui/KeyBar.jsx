import { Box } from '@mui/material';
import TipIconButton from './TipIconButton.jsx';
import { UI_COLORS } from './colors.js';
import { SURFACES, tintedSurfaceSx } from './surfaces.js';
import { KEY_BAR_SX, PART_ICON_BUTTON_SX } from './pressable.js';
import { INK_SOLID } from './shadows.js';
import { ICON_SIZES } from './iconSizes.js';
import { phoneHiddenLabelSx } from './iconOnlyOnPhone.js';
import { actionButtonTextSx } from './actionButton.js';
import { asArray } from '../lists.js';

// A bar of keys pressed one at a time (the sheet's rests, the dice): one
// raised pill, as a button group is, its keys lying in it and ruled apart.
// Every such bar of the app is this one.
//
// `keys`: [{ id, icon, label, title?, tone?, sx?, …IconButton props }] — a key
// shows its icon and its label (only the icon on a phone, or when `labels` is
// off), is named by `title` (the label by default), and takes `tone` as its
// colour. `look` dresses the bar (KEY_BAR_LOOKS: the raised surface, the gold,
// or a screen's own: { groupSx, segmentSx, dividerColor }); `fullWidth`
// shares the row out between the keys. `label` names the group.
export default function KeyBar({
  label, keys, look = KEY_BAR_LOOKS.raised, labels = true, fullWidth = false, sx,
}) {
  return (
    <Box role="group" aria-label={label} sx={[PILL_SX, fullWidth ? { display: 'flex', width: '100%' } : null, look.groupSx, ...asArray(sx)]}>
      {keys.map(({
        id, icon: Icon, label: text, title, tone, sx: keyExtraSx, ...buttonProps
      }, index) => (
        <TipIconButton
          key={id}
          title={title ?? text}
          size="small"
          {...buttonProps}
          sx={[
            KEY_SX,
            look.segmentSx,
            tone ? { color: tone, '&:hover': { color: tone } } : null,
            fullWidth ? { flex: 1 } : null,
            index ? dividerSx(look.dividerColor) : null,
            ...asArray(keyExtraSx),
          ]}
        >
          <Icon size={ICON_SIZES.md} />
          {labels && text ? <Box component="span" sx={[phoneHiddenLabelSx, KEY_LABEL_SX]}>{text}</Box> : null}
        </TipIconButton>
      ))}
    </Box>
  );
}

// The bar's looks. `raised`: the raised surface, as every button stands.
// `gold`: filled with the accent, dark icons, a touch larger to tap (the dice
// everywhere but the map).
export const KEY_BAR_LOOKS = Object.freeze({
  raised: Object.freeze({
    groupSx: { bgcolor: UI_COLORS.surfaceRaised },
    segmentSx: { px: 1.5, py: 0.75 },
  }),
  gold: Object.freeze({
    groupSx: { bgcolor: 'primary.main' },
    segmentSx: {
      color: 'primary.contrastText',
      px: 1.5,
      py: 0.75,
      // Darkened over the pill's gold, not see-through, its ink kept dark: the
      // icon buttons' accent under the cursor would be gold on gold.
      '&:hover': { ...tintedSurfaceSx(UI_COLORS.black, { base: 'primary.main' }), color: 'primary.contrastText' },
    },
  }),
});

// The pill is one raised button, as a button group is.
const PILL_SX = {
  ...SURFACES.panel,
  ...KEY_BAR_SX,
  display: 'inline-flex',
  alignItems: 'stretch',
  borderRadius: 999,
  overflow: 'hidden',
};

// A key of the pill: the pill is the raised button, its keys lie in it.
const KEY_SX = { ...PART_ICON_BUTTON_SX, borderRadius: 0, px: 1, gap: 0.75 };

// A key's label beside its icon: the controls' capitals (actionButtonTextSx).
const KEY_LABEL_SX = { ...actionButtonTextSx, flex: 'none' };

// The rule between two keys, on the later key itself: a rule set from the
// group would lose to the buttons' own `border: 0`.
function dividerSx(color = UI_COLORS.edge) {
  return { borderLeft: INK_SOLID, borderLeftColor: color };
}

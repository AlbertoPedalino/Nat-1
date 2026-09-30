import { useEffect, useRef, useState } from 'react';
import { Box, ListItemText, Menu, MenuItem } from '@mui/material';
import { advArgFor, rollModeLabel, withExtraSource } from './advantage.js';

// A roller that also answers a right-click or a long press with a small menu:
// "+ Advantage" / "+ Disadvantage" for this one roll. It adds a source rather
// than forcing a mode, so a Blinded paladin rolling against the target of Vow
// of Enmity gets a straight roll, as the rules say. Nothing is stored: the
// ordinary click is unchanged and the next roll is ordinary again.
//
// `component` is what renders (a Box by default, or a Button); every other
// prop goes to it. `sources` is { adv, disadv } before this roll's extra one;
// `onPick(advArg)` rolls with the folded result.

// What a phone's own long press feels like (same numbers as the battle map).
const LONG_PRESS_MS = 480;
const LONG_PRESS_SLOP = 12;
// How long after the finger lifts a click still belongs to the long press.
const SWALLOW_CLICK_MS = 700;

// A roller is pressed, not read: no text selection and no iOS callout, which a
// long press would otherwise open over the menu.
const pressSx = { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' };

const OPTIONS = [
  { extra: 'adv', label: '+ Advantage' },
  { extra: 'disadv', label: '+ Disadvantage' },
];

export default function RollModeArea({
  component: Component = Box, sources, onPick, children, onClick, sx,
  onContextMenu, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, ...props
}) {
  const [anchor, setAnchor] = useState(null);
  const pressRef = useRef(null);
  // A long press may end in a click (Android does, iOS mostly does not); that
  // click must not also roll the ordinary way. Only a click right after the
  // finger lifts is the long press's own: a flag left standing would swallow
  // the next ordinary tap instead.
  const longPressRef = useRef(false);
  const swallowUntilRef = useRef(0);

  useEffect(() => () => clearTimeout(pressRef.current?.timer), []);

  const open = (x, y) => {
    // A long press starts the browser's text selection too; left in place it
    // covers the page and eats the taps meant for the menu.
    try { window.getSelection?.()?.removeAllRanges(); } catch (_) {}
    setAnchor({ top: y, left: x });
  };
  const cancelPress = () => {
    clearTimeout(pressRef.current?.timer);
    pressRef.current = null;
  };

  const triggerProps = {
    // Wrappers such as a Tooltip hand their own handlers down: keep them.
    onContextMenu: (event) => {
      onContextMenu?.(event);
      event.preventDefault();
      event.stopPropagation();
      cancelPress();
      open(event.clientX, event.clientY);
    },
    onTouchStart: (event) => {
      onTouchStart?.(event);
      const touch = event.touches?.[0];
      if (!touch || event.touches.length > 1) return;
      cancelPress();
      longPressRef.current = false;
      pressRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        timer: setTimeout(() => {
          longPressRef.current = true;
          open(touch.clientX, touch.clientY);
        }, LONG_PRESS_MS),
      };
    },
    onTouchMove: (event) => {
      onTouchMove?.(event);
      const touch = event.touches?.[0];
      const press = pressRef.current;
      if (!touch || !press) return;
      if (Math.hypot(touch.clientX - press.x, touch.clientY - press.y) > LONG_PRESS_SLOP) cancelPress();
    },
    onTouchEnd: (event) => {
      onTouchEnd?.(event);
      cancelPress();
      if (longPressRef.current) {
        longPressRef.current = false;
        swallowUntilRef.current = Date.now() + SWALLOW_CLICK_MS;
      }
    },
    onTouchCancel: (event) => { onTouchCancel?.(event); cancelPress(); },
    onClick: (event) => {
      if (Date.now() < swallowUntilRef.current) {
        swallowUntilRef.current = 0;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event);
    },
  };

  const pick = (extra) => {
    setAnchor(null);
    onPick(advArgFor(withExtraSource(sources, extra)));
  };

  return (
    <Component {...props} {...triggerProps} sx={[pressSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
      {/* Events from a portalled menu still bubble through React to the
          roller; stop them here or picking an option also rolls normally. */}
      <Box
        component="span"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
        onTouchStart={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        sx={{ display: 'contents' }}
      >
        <Menu
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorReference="anchorPosition"
          anchorPosition={anchor || undefined}
          slotProps={{ list: { dense: true, 'aria-label': 'Roll with' } }}
        >
          {OPTIONS.map(({ extra, label }) => (
            <MenuItem key={extra} onClick={() => pick(extra)} sx={menuItemSx}>
              <ListItemText
                primary={label}
                secondary={`→ ${rollModeLabel(advArgFor(withExtraSource(sources, extra)))}`}
                slotProps={{ primary: { sx: primarySx }, secondary: { sx: secondarySx } }}
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Component>
  );
}

const menuItemSx = { minHeight: 0, py: 0.4 };
const primarySx = { fontSize: '0.75rem', fontWeight: 700 };
const secondarySx = { fontSize: '0.65rem' };

import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogTitleSx,
  mapIconButtonSx,
} from '../map/battleMapSurface.js';

// The map's dice, in its top-right corner beside the tools toggle: the shared
// DiceControl as a pill of two icons in the map's chrome. Being on the map,
// the picker and the log are painted on the map's own surface, so both stay
// visible in fullscreen.
export default function RollsButton({ feed, onCustomRoll, onClear }) {
  return (
    <DiceControl
      variant="icon"
      log={feed}
      onRoll={onCustomRoll}
      onClear={onClear}
      emptyText="Nothing rolled yet. Rolls made on a character sheet in this campaign show up here."
      surface={MAP_SURFACE}
    />
  );
}

const MAP_SURFACE = Object.freeze({
  groupSx: {
    bgcolor: mapIconButtonSx.bgcolor,
    border: mapIconButtonSx.border,
  },
  dividerColor: vttAlpha(VTT_COLORS.gold, 0.35),
  segmentSx: { color: VTT_COLORS.gold, '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.95) } },
  paperSx: battleMapDialogPaperSx,
  dialog: {
    slotProps: { paper: { sx: battleMapDialogPaperSx } },
    titleSx: battleMapDialogTitleSx,
    contentSx: battleMapDialogContentSx,
    actionsSx: battleMapDialogActionsSx,
  },
});

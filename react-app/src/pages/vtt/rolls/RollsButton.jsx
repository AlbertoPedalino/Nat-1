import DiceControl from '../../../shared/character/dice/DiceControl.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { mapIconButtonSx } from '../map/battleMapSurface.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { MAP_PAPER_SX } from '../../../shared/ui/mapPaper.js';

// The map's dice, in its top-right corner beside the tools toggle: the shared
// DiceControl as a pill of two icons in the map's chrome. Being on the map,
// the picker and the log are painted on the map's own surface, so both stay
// visible in fullscreen. `settings`: the GM's GmRollsShownSwitch.
export default function RollsButton({
  feed, onCustomRoll, onClear, settings = null,
}) {
  return (
    <DiceControl
      labels={false}
      log={feed}
      onRoll={onCustomRoll}
      onClear={onClear}
      emptyText="Nothing rolled yet. Rolls made on a character sheet in this campaign show up here."
      surface={MAP_SURFACE}
      settings={settings}
    />
  );
}

// The pill is the map's round button stretched over two halves: its surface,
// edge and press from mapIconButtonSx, each half lit as that button is.
const MAP_SURFACE = Object.freeze({
  groupSx: mapIconButtonSx,
  dividerColor: vttAlpha(VTT_COLORS.accent, OPACITY.line),
  segmentSx: { color: mapIconButtonSx.color, '&:hover': { backgroundColor: mapIconButtonSx['&:hover'].backgroundColor } },
  paperSx: MAP_PAPER_SX,
  dialog: { surface: 'map' },
});

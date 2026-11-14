import { Box } from '@mui/material';
import RollModeArea from '../character/dice/RollModeArea.jsx';
import { advArgFor } from '../character/dice/advantage.js';
import { advTag, situationalNote, useStatRollSources } from './statRolls.js';
import { UI_COLORS } from '../ui/colors.js';
import { pressableSx } from '../ui/pressable.js';
import { BARE_BUTTON_SX, focusRingSx } from '../ui/interactive.js';

// An inline roller in a stat block ("+5", "2d6 + 3", "Dex +4"). A d20 test
// also takes a one-off advantage/disadvantage on right-click or long press,
// and says when the creature rolls that way on its own (" ADV" / " DIS"), or
// may have to (" DIS?", with the condition in its tooltip).
// `onRoll(notation, type, options)`; `options.advantage` is the menu's pick.
export default function RollText({ notation, type, onRoll, children }) {
  const sourcesFor = useStatRollSources();
  const sources = sourcesFor?.(type);
  if (sources) {
    const advArg = advArgFor(sources);
    const note = advArg === undefined ? situationalNote(sources.situational) : '';
    return (
      <RollModeArea
        component={RollButton}
        title={note || undefined}
        sources={sources}
        onPick={(advantage) => onRoll?.(notation, type, { advantage })}
        onClick={() => onRoll?.(notation, type)}
        sx={rollableSx}
      >
        {children}{advTag(advArg, sources.situational)}
      </RollModeArea>
    );
  }
  return (
    <RollButton onClick={() => onRoll?.(notation, type)} sx={rollableSx}>
      {children}
    </RollButton>
  );
}

function RollButton(props) {
  return <Box component="button" type="button" {...props} />;
}

// A roll in a stat block is a button like every other of the app
// (pressableSx): raised on its ink edge and solid shadow, in the rolls' lime,
// hopping under the pointer and pressed in when clicked; small, to sit in a
// line of text.
const rollableSx = {
  ...BARE_BUTTON_SX,
  ...pressableSx(UI_COLORS.secondary),
  borderRadius: 0.75,
  px: '0.3rem',
  py: 0,
  mx: '0.15rem',
  ...focusRingSx(),
};

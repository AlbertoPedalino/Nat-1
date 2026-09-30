import { Box } from '@mui/material';
import RollModeArea from '../../../shared/character/dice/RollModeArea.jsx';
import { advArgFor } from '../../../shared/character/dice/advantage.js';
import { advTag, useStatRollSources } from './statRolls.js';

// An inline roller in a stat block ("+5", "2d6 + 3", "Dex +4"). A d20 test
// also takes a one-off advantage/disadvantage on right-click or long press,
// and says when the creature rolls that way on its own (" ADV" / " DIS").
// `onRoll(notation, type, options)`; `options.advantage` is the menu's pick.
export default function RollText({ notation, type, onRoll, children }) {
  const sourcesFor = useStatRollSources();
  const sources = sourcesFor?.(type);
  if (sources) {
    return (
      <RollModeArea
        component={RollButton}
        sources={sources}
        onPick={(advantage) => onRoll?.(notation, type, { advantage })}
        onClick={() => onRoll?.(notation, type)}
        sx={rollableSx}
      >
        {children}{advTag(advArgFor(sources))}
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

const rollableSx = {
  appearance: 'none',
  border: '1px solid rgba(112,183,166,0.45)',
  bgcolor: 'rgba(112,183,166,0.12)',
  color: '#96d8c6',
  borderRadius: '4px',
  px: '0.25rem',
  py: 0,
  mx: '0.1rem',
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': {
    bgcolor: 'rgba(112,183,166,0.22)',
  },
};

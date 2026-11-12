import { Typography } from '@mui/material';

const TONES = Object.freeze({ secondary: 'text.secondary', warning: 'warning.main' });

// The small quiet line beside or under something: what a control does, when a
// save was made, how many results came back, where a rule is from. One look
// everywhere; `sx` is for placement only (a margin, display: block). A line
// that stands for an empty list is an EmptyLine; one that says what went
// wrong is an ErrorLine. `tone="warning"` marks a caveat (a board not linked,
// a setting still to make) in the warning colour.
export default function Caption({ children, component, tone = 'secondary', sx, ...rest }) {
  return (
    <Typography variant="caption" component={component} sx={[{ color: TONES[tone] }, sx]} {...rest}>
      {children}
    </Typography>
  );
}

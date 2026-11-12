import { Typography } from '@mui/material';

// The small quiet line beside or under something: what a control does, when a
// save was made, how many results came back, where a rule is from. One look
// everywhere; `sx` is for placement only (a margin, display: block). A line
// that stands for an empty list is an EmptyLine; one that says what went
// wrong is an ErrorLine.
export default function Caption({ children, component, sx, ...rest }) {
  return (
    <Typography variant="caption" component={component} sx={[{ color: 'text.secondary' }, sx]} {...rest}>
      {children}
    </Typography>
  );
}

import { Fragment } from 'react';
import { Box } from '@mui/material';
import { splitHighlights } from '../logic/highlight.js';

// Marks search hits in plain text. The rendered markdown body gets the same
// treatment from `rehypeMarkMatches`, and both land on the same <mark>, so the
// two halves of a note highlight identically.
export const MARK_SX = {
  bgcolor: 'warning.main',
  color: 'warning.contrastText',
  borderRadius: 0.5,
  px: 0.25,
};

export default function HighlightedText({ text, tokens }) {
  return splitHighlights(text, tokens).map((segment, index) => (segment.match
    ? <Box key={index} component="mark" sx={MARK_SX}>{segment.text}</Box>
    : <Fragment key={index}>{segment.text}</Fragment>));
}

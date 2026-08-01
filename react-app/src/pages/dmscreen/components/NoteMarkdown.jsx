import { useMemo } from 'react';
import { Box, Divider, Link, Typography } from '@mui/material';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeMarkMatches from '../logic/rehypeMarkMatches.js';
import { MARK_SX } from './HighlightedText.jsx';

// GFM without any raw-HTML plugin: note bodies are user text, so markup stays
// markdown-only and anything HTML-like renders as inert characters.
const REMARK_PLUGINS = [remarkGfm];

// Maps markdown nodes onto themed MUI elements. Kept module-level so the object
// identity is stable across renders. `node` is the mdast node react-markdown
// passes to every override; it must never reach the DOM.
const COMPONENTS = {
  h1: ({ node, ...props }) => <Typography {...props} variant="subtitle1" component="h3" sx={headingSx} />,
  h2: ({ node, ...props }) => <Typography {...props} variant="subtitle2" component="h4" sx={headingSx} />,
  h3: ({ node, ...props }) => <Typography {...props} variant="subtitle2" component="h5" sx={headingSx} />,
  h4: ({ node, ...props }) => <Typography {...props} variant="body2" component="h6" sx={headingSx} />,
  h5: ({ node, ...props }) => <Typography {...props} variant="body2" component="h6" sx={headingSx} />,
  h6: ({ node, ...props }) => <Typography {...props} variant="body2" component="h6" sx={headingSx} />,
  p: ({ node, ...props }) => <Typography {...props} variant="body2" sx={paragraphSx} />,
  a: ({ node, ...props }) => <Link {...props} target="_blank" rel="noopener noreferrer" sx={linkSx} />,
  ul: ({ node, ...props }) => <Box {...props} component="ul" sx={listSx} />,
  ol: ({ node, ...props }) => <Box {...props} component="ol" sx={listSx} />,
  li: ({ node, ...props }) => <Box {...props} component="li" sx={listItemSx} />,
  blockquote: ({ node, ...props }) => <Box {...props} component="blockquote" sx={quoteSx} />,
  code: ({ node, ...props }) => <Box {...props} component="code" sx={codeSx} />,
  pre: ({ node, ...props }) => <Box {...props} component="pre" sx={preSx} />,
  hr: () => <Divider sx={dividerSx} />,
  // Wide tables scroll inside the card instead of stretching the board.
  table: ({ node, ...props }) => (
    <Box sx={tableWrapSx}>
      <Box {...props} component="table" sx={tableSx} />
    </Box>
  ),
  th: ({ node, ...props }) => <Box {...props} component="th" sx={thSx} />,
  td: ({ node, ...props }) => <Box {...props} component="td" sx={tdSx} />,
  mark: ({ node, ...props }) => <Box {...props} component="mark" sx={MARK_SX} />,
};

const NO_PLUGINS = [];

export default function NoteMarkdown({ children, tokens }) {
  // No search, no plugin: an unfiltered board runs the same pipeline it always
  // did, and the array identity stays stable so react-markdown does not
  // reprocess the note on every render.
  const rehypePlugins = useMemo(
    () => (tokens?.length ? [[rehypeMarkMatches, { tokens }]] : NO_PLUGINS),
    [tokens],
  );

  return (
    <Box sx={rootSx}>
      <Markdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={rehypePlugins} components={COMPONENTS}>
        {children}
      </Markdown>
    </Box>
  );
}

const rootSx = {
  minWidth: 0,
  color: 'text.primary',
  fontSize: '0.875rem',
  overflowWrap: 'anywhere',
  '& > :first-of-type': { mt: 0 },
  '& > :last-child': { mb: 0 },
};

const headingSx = {
  fontWeight: 700,
  color: 'primary.main',
  mt: 1.5,
  mb: 0.5,
};

const paragraphSx = { my: 0.75, whiteSpace: 'pre-wrap' };

const linkSx = { color: 'secondary.main' };

const listSx = { my: 0.75, pl: 2.5, '& ul, & ol': { my: 0.25 } };

const listItemSx = { fontSize: '0.875rem', mb: 0.25, '& p': { my: 0 } };

const quoteSx = {
  my: 0.75,
  ml: 0,
  pl: 1.25,
  borderLeft: '3px solid',
  borderColor: 'divider',
  color: 'text.secondary',
};

const codeSx = {
  fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  fontSize: '0.8125rem',
  bgcolor: 'action.hover',
  borderRadius: 1,
  px: 0.5,
  py: 0.125,
};

const preSx = {
  my: 0.75,
  p: 1,
  bgcolor: 'action.hover',
  borderRadius: 1,
  overflowX: 'auto',
  '& code': { bgcolor: 'transparent', p: 0 },
};

const dividerSx = { my: 1 };

const tableWrapSx = { my: 0.75, overflowX: 'auto' };

const tableSx = {
  borderCollapse: 'collapse',
  width: '100%',
  fontSize: '0.8125rem',
};

const cellSx = {
  border: '1px solid',
  borderColor: 'divider',
  px: 0.75,
  py: 0.5,
  textAlign: 'left',
  verticalAlign: 'top',
};

const thSx = { ...cellSx, fontWeight: 700, color: 'primary.main' };

const tdSx = cellSx;

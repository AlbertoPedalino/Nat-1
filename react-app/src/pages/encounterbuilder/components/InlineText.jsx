import { Box, Link } from '@mui/material';
import { parseCleanTokens } from '../logic/markup.js';

export default function InlineText({ value, onRoll }) {
  return <>{parseCleanTokens(value).map((token, index) => renderToken(token, `${index}`, onRoll))}</>;
}

function renderToken(token, key, onRoll) {
  if (token.type === 'text') return <span key={key}>{token.text}</span>;
  if (token.type === 'italic') {
    return <Box key={key} component="i">{token.children?.map((child, index) => renderToken(child, `${key}-${index}`, onRoll))}</Box>;
  }
  if (token.type === 'bold') {
    return <Box key={key} component="b">{token.children?.map((child, index) => renderToken(child, `${key}-${index}`, onRoll))}</Box>;
  }
  if (token.type === 'roll') {
    return (
      <Box
        key={key}
        component="button"
        type="button"
        onClick={() => onRoll?.(token.notation, token.rollType)}
        sx={rollableSx}
      >
        {token.text}
      </Box>
    );
  }
  if (token.type === 'link') {
    return (
      <Link key={key} href={token.href} target="_blank" rel="noopener" color="secondary.main" underline="hover">
        {token.text}
      </Link>
    );
  }
  return null;
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

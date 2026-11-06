import { Box, Link } from '@mui/material';
import { parseCleanTokens } from './markup.js';
import RollText from './RollText.jsx';

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
    return <RollText key={key} notation={token.notation} type={token.rollType} onRoll={onRoll}>{token.text}</RollText>;
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

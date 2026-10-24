import { createContext, useContext } from 'react';
import { Box, Typography } from '@mui/material';
import { tokenizeInlineMarkup } from '../character/spells/spellEntries.js';
import { RICH_TEXT_ACCENT } from '../ui/entityColors.js';

// Optional: a reader that can open what the text names ({@spell Fireball|XPHB}
// and the like) provides `{ resolve(token) -> target | null, open(target) }`,
// and the names it can resolve become buttons. Without it, as everywhere but
// the book reader, a name is only coloured.
export const RefLinkContext = createContext(null);

function renderTokens(tokens, keyPrefix, { strongColor, refColor, refLinks } = {}) {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === 'em') {
      return <Box key={key} component="em" sx={{ fontStyle: 'italic' }}>{token.text}</Box>;
    }
    if (token.type === 'strong') {
      return <Box key={key} component="strong" sx={{ fontWeight: 700, color: strongColor || 'text.primary' }}>{token.text}</Box>;
    }
    if (token.type === 'ref') {
      const target = refLinks?.resolve(token);
      if (target) {
        return (
          <Box key={key} component="button" type="button" onClick={() => refLinks.open(target)} sx={{ ...refButtonSx, color: refColor }}>
            {token.text}
          </Box>
        );
      }
      return <Box key={key} component="span" sx={{ color: refColor }}>{token.text}</Box>;
    }
    return <Box key={key} component="span">{token.text}</Box>;
  });
}

export function RichInline({
  text,
  tokens,
  keyPrefix = 't',
  strongColor = RICH_TEXT_ACCENT,
  refColor = RICH_TEXT_ACCENT,
}) {
  const refLinks = useContext(RefLinkContext);
  const resolved = Array.isArray(tokens) && tokens.length ? tokens : tokenizeInlineMarkup(text);
  if (!resolved.length) return null;
  return renderTokens(resolved, keyPrefix, { strongColor, refColor, refLinks });
}

export function RichText({ text, sx, variant = 'body2', color = 'text.secondary', lineHeight = 1.42 }) {
  const raw = String(text ?? '');
  if (!raw.trim()) return null;
  const paragraphs = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!paragraphs.length) return null;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', ...sx }}>
      {paragraphs.map((paragraph, index) => (
        <Typography key={`rt-${index}`} variant={variant} color={color} sx={{ lineHeight }}>
          <RichInline text={paragraph} keyPrefix={`rt-${index}`} />
        </Typography>
      ))}
    </Box>
  );
}

// Reads as the coloured name it was, with an underline saying it opens.
const refButtonSx = {
  appearance: 'none',
  border: 0,
  p: 0,
  m: 0,
  bgcolor: 'transparent',
  font: 'inherit',
  cursor: 'pointer',
  textDecoration: 'underline',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: '2px',
  '&:hover': { textDecorationStyle: 'solid' },
};

import { Box, Typography } from '@mui/material';
import { classIcon } from '../../../shared/character/classIcon.js';

export const PIECE_DRAG_TYPE = 'application/x-gb-piece';

export function beginPieceDrag(event) {
  event.dataTransfer.setData(PIECE_DRAG_TYPE, 'piece');
  event.dataTransfer.effectAllowed = 'copy';
  const preview = event.currentTarget.querySelector?.('[data-piece-preview]');
  if (preview) {
    const rect = preview.getBoundingClientRect();
    event.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2);
  }
}

// The same compact token appears in Pieces, in placement dialogs and as the
// browser's drag image. Once it reaches the map, SceneViewport renders the full
// TokenSprite at its real grid size.
export default function PiecePreview({ token, size = 36, count = 1 }) {
  const imageUrl = token?.imageUrl || token?.image_url || null;
  const label = token?.label || 'Piece';
  const isCharacter = Boolean(token?.characterId);
  const ClassIcon = isCharacter ? classIcon(token?.className) : null;
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((word) => word[0]?.toUpperCase()).join('');

  return (
    <Box
      data-piece-preview
      sx={{
        ...rootSx,
        width: size,
        height: size,
        bgcolor: token?.color || '#6f5b32',
        borderWidth: isCharacter ? 5 : 2,
        borderColor: isCharacter ? (token?.color || 'rgba(0,0,0,0.6)') : 'rgba(232,201,106,0.65)',
      }}
    >
      {imageUrl ? <Box component="img" src={imageUrl} alt="" draggable={false} sx={imageSx} /> : null}
      {!imageUrl && ClassIcon ? (
        <Box data-class-icon={token?.className || 'unknown'} sx={classIconSx}>
          <ClassIcon size={Math.round(size * 0.52)} />
        </Box>
      ) : null}
      {!imageUrl && !ClassIcon ? (
        <Typography component="span" sx={initialsSx}>{initials || '?'}</Typography>
      ) : null}
      {count > 1 ? <Box sx={countSx}>×{count}</Box> : null}
    </Box>
  );
}

const rootSx = {
  position: 'relative',
  flexShrink: 0,
  borderRadius: '50%',
  overflow: 'visible',
  borderStyle: 'solid',
  boxShadow: '0 3px 10px rgba(0,0,0,0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
};

const imageSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  borderRadius: '50%',
  pointerEvents: 'none',
};

const initialsSx = {
  color: '#f2df9d',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  fontWeight: 800,
};

const classIconSx = {
  display: 'flex',
  color: '#f3ead6',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
  pointerEvents: 'none',
};

const countSx = {
  position: 'absolute',
  right: -6,
  bottom: -5,
  minWidth: 20,
  height: 20,
  px: 0.4,
  borderRadius: 10,
  bgcolor: '#e8c96a',
  color: '#0f0e0d',
  border: '1px solid #0f0e0d',
  fontSize: '0.62rem',
  fontWeight: 900,
  lineHeight: '18px',
  textAlign: 'center',
};

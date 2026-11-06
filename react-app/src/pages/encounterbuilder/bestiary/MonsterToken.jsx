import { useState } from 'react';
import { Avatar } from '@mui/material';
import { getMonsterTokenUrls } from './monsterUtils.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';

export default function MonsterToken({ monster, size = 32, fallbackText = '?' }) {
  const urls = getMonsterTokenUrls(monster);
  const [index, setIndex] = useState(0);
  return (
    <Avatar
      data-piece-preview
      src={urls[index]}
      slotProps={{
        img: {
          onError: () => {
            setIndex((value) => Math.min(value + 1, urls.length - 1));
          },
        },
      }}
      sx={{
        width: size,
        height: size,
        bgcolor: uiAlpha(UI_COLORS.primary, 0.12),
        border: `1px solid ${uiAlpha(UI_COLORS.primary, 0.35)}`,
        color: 'primary.main',
        fontSize: size > 40 ? '1rem' : '0.75rem',
      }}
    >
      {fallbackText}
    </Avatar>
  );
}

import { useState } from 'react';
import { Avatar } from '@mui/material';
import { getMonsterTokenUrls } from './monsterUtils.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../ui/colors.js';
import { tintedSurfaceSx } from '../ui/surfaces.js';
import { FONT_SIZES } from '../ui/fonts.js';

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
        ...tintedSurfaceSx(UI_COLORS.accent),
        border: `1px solid ${uiAlpha(UI_COLORS.accent, OPACITY.line)}`,
        color: 'primary.main',
        fontSize: size > 40 ? FONT_SIZES.body : FONT_SIZES.lg,
      }}
    >
      {fallbackText}
    </Avatar>
  );
}

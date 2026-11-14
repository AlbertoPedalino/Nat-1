import { useState } from 'react';
import { Avatar } from '@mui/material';
import { getMonsterTokenUrls } from './monsterUtils.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../ui/colors.js';
import { SURFACES, tintedSurfaceSx } from '../ui/surfaces.js';
import { FONT_SIZES } from '../ui/fonts.js';
import { TEXT_STYLES } from '../ui/textStyles.js';

// A creature's token: its bestiary art, else the fallback art. When no picture
// comes at all, a sheet of paper (SURFACES.paper) with its initial, as every
// missing picture of the app, never an empty disc.
export default function MonsterToken({ monster, size = 32, fallbackText = '?' }) {
  const urls = getMonsterTokenUrls(monster);
  const [index, setIndex] = useState(0);
  const [missing, setMissing] = useState(false);
  return (
    <Avatar
      data-piece-preview
      src={missing ? undefined : urls[index]}
      slotProps={{
        img: {
          onError: () => {
            if (index >= urls.length - 1) setMissing(true);
            else setIndex(index + 1);
          },
        },
      }}
      sx={[
        {
          width: size,
          height: size,
          fontSize: size > 40 ? FONT_SIZES.body : FONT_SIZES.lg,
        },
        missing ? MISSING_SX : ART_SX,
      ]}
    >
      {fallbackText}
    </Avatar>
  );
}

// Behind the art: the accent wash, as the art loads.
const ART_SX = {
  ...tintedSurfaceSx(UI_COLORS.accent),
  border: `1px solid ${uiAlpha(UI_COLORS.accent, OPACITY.line)}`,
  color: 'primary.main',
};

const MISSING_SX = {
  ...SURFACES.paper,
  ...TEXT_STYLES.title,
  borderRadius: '50%',
  boxShadow: 'none',
};

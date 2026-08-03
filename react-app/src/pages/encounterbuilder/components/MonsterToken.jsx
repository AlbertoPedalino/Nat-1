import { useState } from 'react';
import { Avatar } from '@mui/material';
import { getMonsterTokenUrls } from '../logic/monsterUtils.js';

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
        bgcolor: 'rgba(215,173,82,0.12)',
        border: '1px solid rgba(215,173,82,0.35)',
        color: 'primary.main',
        fontSize: size > 40 ? '1rem' : '0.75rem',
      }}
    >
      {fallbackText}
    </Avatar>
  );
}

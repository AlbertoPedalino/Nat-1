import { Box } from '@mui/material';

// A result, not another roll: roll history uses a quiet, flat silhouette that
// identifies the die and keeps the face that actually came up readable.
export default function DieFace2D({ value, faces, color = 'text.primary', dimmed = false, size = 34 }) {
  const sides = Number(faces) || 20;
  const label = `d${sides} showing ${value}`;
  const digits = String(value).length;

  return (
    <Box
      component="svg"
      role="img"
      aria-label={label}
      data-die-face="2d"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      sx={{ display: 'block', flex: '0 0 auto', color, opacity: dimmed ? 0.38 : 1 }}
    >
      {sides === 2 ? (
        <circle cx="20" cy="20" r="17" fill="rgba(232,201,106,0.08)" stroke="currentColor" strokeWidth="2" />
      ) : (
        <polygon
          points={pointsForDie(sides)}
          fill="rgba(232,201,106,0.08)"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {sides >= 8 ? (
        <path d="M20 3 L20 37 M4 20 L36 20" fill="none" stroke="currentColor" strokeWidth="0.65" opacity="0.28" />
      ) : null}
      <text
        x="20"
        y="20.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily="Cinzel, Georgia, serif"
        fontSize={digits >= 3 ? 9 : digits === 2 ? 11 : 13}
        fontWeight="800"
      >
        {value}
      </text>
    </Box>
  );
}

function pointsForDie(faces) {
  if (faces <= 4) return '20,3 37,35 3,35';
  if (faces <= 6) return '4,4 36,4 36,36 4,36';
  if (faces <= 8) return '20,2 38,20 20,38 2,20';
  if (faces <= 10) return '20,2 36,13 31,36 9,36 4,13';
  if (faces <= 12) return '20,2 34,8 38,23 29,37 11,37 2,23 6,8';
  if (faces <= 20) return '20,2 34,8 38,24 28,38 12,38 2,24 6,8';
  return '20,2 31,6 38,15 38,26 31,35 20,38 9,35 2,26 2,15 9,6';
}

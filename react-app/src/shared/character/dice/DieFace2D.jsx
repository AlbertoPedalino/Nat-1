import { Box } from '@mui/material';
import { UI_COLORS, uiAlpha, OPACITY } from '../../ui/colors.js';
import { UI_FONTS, FONT_WEIGHTS } from '../../ui/fonts.js';

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
      sx={{ width: size, height: size, display: 'block', flex: '0 0 auto', color, opacity: dimmed ? OPACITY.edge : 1 }}
    >
      {sides === 2 ? (
        <circle cx="20" cy="20" r="17" fill={uiAlpha(UI_COLORS.accentText, OPACITY.soft)} stroke="currentColor" strokeWidth="2" />
      ) : (
        // Painted like the 3D die and the app's icon: deep green with a cream
        // edge. The number alone carries the result's colour.
        <polygon
          points={pointsForDie(sides)}
          fill={UI_COLORS.dieFace}
          stroke={UI_COLORS.onDie}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      <text
        x="20"
        y="20.5"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily={UI_FONTS.display}
        fontSize={digits >= 3 ? 9 : digits === 2 ? 11 : 13}
        fontWeight={FONT_WEIGHTS.heavy}
      >
        {value}
      </text>
    </Box>
  );
}

// One outline per die, each told apart by its silhouette alone: a d10 is the
// kite its faces are, with the long point up as on the 3D die, so it no longer
// reads as a d12; the d12 is its pentagon and the d20 the hexagon an
// icosahedron shows when it lies flat, where the two used to be near-identical
// heptagons.
function pointsForDie(faces) {
  if (faces <= 4) return '20,3 37,35 3,35';
  if (faces <= 6) return '5,5 35,5 35,35 5,35';
  if (faces <= 8) return '20,2 38,20 20,38 2,20';
  if (faces <= 10) return '20,2 36,25 20,38 4,25';
  if (faces <= 12) return '20,3 37,15 31,36 9,36 3,15';
  if (faces <= 20) return '20,2 36,11 36,29 20,38 4,29 4,11';
  return '20,2 31,6 38,15 38,26 31,35 20,38 9,35 2,26 2,15 9,6';
}

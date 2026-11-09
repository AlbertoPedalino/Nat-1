import { useState, useEffect } from 'react';
import { Box, Popover, Typography } from '@mui/material';
import { UI_FONTS, FONT_SIZES } from './fonts.js';
import ColorField from './ColorField.jsx';
import { TEXT_STYLES } from './textStyles.js';

export const ICON_COLORS = [
  '#de675f', '#d69245', '#caa550', '#e9c46a',
  '#58b879', '#2a9d8f', '#70b7a6', '#4d95d6',
  '#8ecae6', '#9d7fb8', '#b58fd9', '#e8a87c',
  '#f4a261', '#e76f51', '#a8adb8', '#264653',
];

export default function IconColorPicker({ anchorEl, onClose, currentColor, onSelect, title = 'Icon Color' }) {
  const open = Boolean(anchorEl);
  const [localColor, setLocalColor] = useState(currentColor);

  useEffect(() => { setLocalColor(currentColor); }, [currentColor]);

  const pick = (color) => {
    onSelect(color);
    onClose();
  };

  const displayColor = localColor || 'rgba(46,42,34,1)';
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => { if (localColor !== currentColor) onSelect(localColor); onClose(); }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { bgcolor: 'rgba(26,23,19,0.98)', border: 1, borderColor: 'divider', borderRadius: 1, p: 1 } } }}
    >
      <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.5, ...TEXT_STYLES.label }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
        {ICON_COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => pick(color)}
            sx={{
              width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
              bgcolor: color, border: 2,
              borderColor: (localColor || currentColor) === color ? '#fff' : 'transparent',
              boxShadow: (localColor || currentColor) === color ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
              '&:hover': { transform: 'scale(1.2)', transition: 'transform 0.12s' },
            }}
          />
        ))}
        <Box
          onClick={() => pick(null)}
          sx={{
            width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
            bgcolor: 'rgba(46,42,34,1)', border: 2,
            borderColor: localColor == null && currentColor == null ? '#fff' : 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: FONT_SIZES.xs, color: 'text.secondary',
            '&:hover': { transform: 'scale(1.2)', transition: 'transform 0.12s' },
          }}
          title="Default"
        >
          ✕
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75, pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary', ...TEXT_STYLES.title }}>
          Custom
        </Typography>
        {/* The well's input fills the swatch, so a click on it opens the picker. */}
        <Box
          sx={{
            width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
            bgcolor: displayColor, border: 2, borderColor: 'divider',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <ColorField
            label={`${title}: custom`}
            value={localColor || '#4d95d6'}
            onChange={setLocalColor}
            bare
            sx={{
              position: 'absolute', left: -40, top: -40, width: 100, height: 100,
              cursor: 'pointer', border: 'none', padding: 0,
            }}
          />
        </Box>
        {currentColor ? (
          <Typography sx={{ fontSize: FONT_SIZES.xxs, color: 'text.secondary', fontFamily: UI_FONTS.mono }}>
            {currentColor}
          </Typography>
        ) : null}
      </Box>
    </Popover>
  );
}

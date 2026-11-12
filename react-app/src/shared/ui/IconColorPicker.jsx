import { useState, useEffect } from 'react';
import { Box, Popover, Typography } from '@mui/material';
import { UI_FONTS, FONT_SIZES } from './fonts.js';
import ColorField from './ColorField.jsx';
import { SWATCH_COLORS } from './swatches.js';
import { UI_COLORS } from './colors.js';
import { TEXT_STYLES } from './textStyles.js';
import CardSection from './CardSection.jsx';

export default function IconColorPicker({ anchorEl, onClose, currentColor, onSelect, title = 'Icon Color' }) {
  const open = Boolean(anchorEl);
  const [localColor, setLocalColor] = useState(currentColor);

  useEffect(() => { setLocalColor(currentColor); }, [currentColor]);

  const pick = (color) => {
    onSelect(color);
    onClose();
  };

  const displayColor = localColor || UI_COLORS.surfaceRaised;
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={() => { if (localColor !== currentColor) onSelect(localColor); onClose(); }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      slotProps={{ paper: { sx: { p: 1 } } }}
    >
      <Typography sx={{ fontSize: FONT_SIZES.xs, color: 'text.secondary', mb: 0.5, ...TEXT_STYLES.label }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5 }}>
        {SWATCH_COLORS.map((color) => (
          <Box
            key={color}
            onClick={() => pick(color)}
            sx={{
              width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
              // Inked like every swatch; the chosen one ringed in the accent.
              bgcolor: color, border: 2, borderColor: UI_COLORS.edge,
              outline: (localColor || currentColor) === color ? `2px solid ${UI_COLORS.accent}` : 'none',
              outlineOffset: 1,
              '&:hover': { transform: 'scale(1.2)', transition: 'transform 0.12s' },
            }}
          />
        ))}
        <Box
          onClick={() => pick(null)}
          sx={{
            width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
            bgcolor: UI_COLORS.surfaceRaised, border: 2,
            borderColor: localColor == null && currentColor == null ? UI_COLORS.white : 'divider',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: FONT_SIZES.xs, color: 'text.secondary',
            '&:hover': { transform: 'scale(1.2)', transition: 'transform 0.12s' },
          }}
          title="Default"
        >
          ✕
        </Box>
      </Box>
      <CardSection dense sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            value={localColor || SWATCH_COLORS[1]}
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
      </CardSection>
    </Popover>
  );
}

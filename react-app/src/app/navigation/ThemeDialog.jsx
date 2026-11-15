import { useEffect, useMemo } from 'react';
import { Box, ButtonBase, Button, Stack, ThemeProvider, Typography } from '@mui/material';
import { Palette } from 'lucide-react';
import SheetDialog, { DialogSection } from '../../shared/ui/SheetDialog.jsx';
import ChoiceToggle from '../../shared/ui/ChoiceToggle.jsx';
import PanelHeader from '../../shared/ui/PanelHeader.jsx';
import CountSeal from '../../shared/ui/CountSeal.jsx';
import GemPip from '../../shared/ui/GemPip.jsx';
import { GAME_ICONS } from '../../shared/ui/gameIcons.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';
import { SURFACES } from '../../shared/ui/surfaces.js';
import { TEXT_STYLES } from '../../shared/ui/textStyles.js';
import { focusRingSx } from '../../shared/ui/interactive.js';
import { buildTheme } from '../theme.js';
import { MODE_CHOICES, STYLE_CHOICES, paletteForStyle } from '../themeChoice.js';
import {
  linkStyleFonts, themeVariables, useThemeChoice, useThemedValuesVersion,
} from '../ThemeChoiceProvider.jsx';

// The theme panel, opened from the account menu: the mode (System follows the
// device) and the look's style, kept in this browser. Every style shows as a
// card drawn in that style and in the palette it draws the current mode in
// (its bar, its seal, its gems, its button), the chosen one lit: a style
// added to SHAPE_STYLES shows here without more.
export default function ThemeDialog({ open, onClose }) {
  const { choice, mode, setChoice } = useThemeChoice();
  // Every style's faces, so each sample is lettered in its own.
  useEffect(() => {
    if (open) STYLE_CHOICES.forEach(({ id }) => linkStyleFonts(id));
  }, [open]);
  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      title="Theme"
      icon={<Palette size={ICON_SIZES.lg} />}
      maxWidth="sm"
      actions={<Button variant="contained" onClick={onClose}>Done</Button>}
    >
      <DialogSection title="Mode">
        <ChoiceToggle
          ariaLabel="Mode"
          options={MODE_CHOICES.map(({ id, label }) => ({ value: id, label }))}
          value={choice.mode}
          onChange={(nextMode) => setChoice({ mode: nextMode })}
        />
      </DialogSection>
      <DialogSection title="Style">
        <Box role="radiogroup" aria-label="Style" sx={cardGridSx}>
          {STYLE_CHOICES.map(({ id, label }) => (
            <StyleCard
              key={id}
              styleId={id}
              label={label}
              paletteId={paletteForStyle(id, mode)}
              chosen={id === choice.style}
              onChoose={() => setChoice({ style: id })}
            />
          ))}
        </Box>
      </DialogSection>
    </SheetDialog>
  );
}

// A style's card: a small sample drawn in that style, whatever the page wears.
// Every variable of its theme (themeVariables: palette, shapes, ink, surfaces,
// faces and the values worked out in them) is written on the card itself, and
// what is cut in code (the gems) reads the style's MUI theme.
function StyleCard({ styleId, label, paletteId, chosen, onChoose }) {
  const theme = useMemo(() => buildTheme({ paletteId, styleId }), [paletteId, styleId]);
  // Redrawn when the sample first registers a value, so it is written too.
  useThemedValuesVersion();
  const variables = themeVariables(paletteId, styleId);
  return (
    <ButtonBase
      role="radio"
      aria-checked={chosen}
      aria-label={label}
      onClick={onChoose}
      sx={[cardSx, chosen && chosenCardSx]}
    >
      <ThemeProvider theme={theme}>
        <Box sx={[variables, sampleSx]}>
          <PanelHeader icon={GAME_ICONS.characterSheet} title={label} />
          <Stack direction="row" spacing={1} sx={sampleRowSx}>
            <CountSeal count={3} />
            <GemPip available kind="slot" size="sm" />
            <GemPip available kind="uses" size="sm" />
            <GemPip available={false} kind="uses" size="sm" />
            <Box component="span" sx={sampleButtonSx}>Roll</Box>
          </Stack>
        </Box>
      </ThemeProvider>
      <Typography component="span" sx={cardLabelSx}>{chosen ? `${label} · in use` : label}</Typography>
    </ButtonBase>
  );
}

const cardGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 1.5,
};

const cardSx = {
  ...SURFACES.inset,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 1,
  p: 1,
  textAlign: 'left',
  ...focusRingSx(),
};

const chosenCardSx = {
  borderColor: 'primary.main',
};

const sampleSx = {
  ...SURFACES.panel,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const sampleRowSx = { alignItems: 'center', p: 1 };

const sampleButtonSx = {
  ...TEXT_STYLES.label,
  ml: 'auto',
  px: 1,
  py: 0.25,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  border: SURFACES.panel.border,
  borderRadius: 1,
};

const cardLabelSx = {
  ...TEXT_STYLES.label,
  color: 'text.secondary',
};

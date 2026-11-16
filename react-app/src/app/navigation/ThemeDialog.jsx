import { useEffect, useMemo, useState } from 'react';
import { Box, ButtonBase, Stack, Tab, Tabs, ThemeProvider, Typography } from '@mui/material';
import { Palette } from 'lucide-react';
import SheetDialog, { DialogSection, DoneButton } from '../../shared/ui/SheetDialog.jsx';
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
import { MODE_CHOICES, STYLE_CHOICES, STYLE_DICE, chosenDice } from '../themeChoice.js';
import { paletteForStyle } from '../../shared/ui/shapes.js';
import { DICE_COLORS, DICE_STYLES } from '../../shared/ui/diceSets.js';
import DiceSetScope from '../../shared/ui/DiceSetScope.jsx';
import Die3D from '../../shared/character/dice/Die3D.jsx';
import { themeVariables, useThemeChoice, useThemedValuesVersion } from '../ThemeChoiceProvider.jsx';
import { FONT_SIZES, linkStyleFonts } from '../../shared/ui/fonts.js';
import { pressableSx } from '../../shared/ui/pressable.js';
import { UI_COLORS } from '../../shared/ui/colors.js';

// The theme panel, opened from the account menu, kept in this browser. Its
// Look tab: the mode (System follows the device) and the look's style, every
// style a card drawn in that style and in the palette it draws the current
// mode in (its bar, its seal, its gems, its button), the chosen one lit. Its
// Dice style and Dice colors tabs: the dice the viewer rolls with, what the
// table sees them roll — their style (a theme's cut: figures and rim) and
// their colours, a tab each so neither hides below the other, each the look's
// own unless picked. A style added to SHAPE_STYLES shows here
// without more.
export default function ThemeDialog({ open, onClose }) {
  const { choice, mode, setChoice } = useThemeChoice();
  const [tab, setTab] = useState('look');
  const dice = chosenDice(choice);
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
      actions={<DoneButton onClick={onClose} />}
    >
      <Tabs value={tab} onChange={(event, next) => setTab(next)} aria-label="Theme" variant="fullWidth" sx={tabsSx}>
        <Tab value="look" label="Look" />
        <Tab value="diceStyle" label="Dice style" />
        <Tab value="diceColors" label="Dice colors" />
      </Tabs>
      {tab === 'look' ? (
        <>
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
        </>
      ) : null}
      {tab === 'diceStyle' ? (
        <DialogSection title="Dice style">
          <Box role="radiogroup" aria-label="Dice style" sx={diceGridSx}>
            <DiceCard
              dice={{ style: choice.style, colors: dice.colors }}
              label="Match look"
              chosen={choice.diceStyle === STYLE_DICE}
              onChoose={() => setChoice({ diceStyle: STYLE_DICE })}
            />
            {Object.values(DICE_STYLES).map(({ id, label }) => (
              <DiceCard
                key={id}
                dice={{ style: id, colors: dice.colors }}
                label={label}
                chosen={choice.diceStyle === id}
                onChoose={() => setChoice({ diceStyle: id })}
              />
            ))}
          </Box>
        </DialogSection>
      ) : null}
      {tab === 'diceColors' ? (
        <DialogSection title="Dice colors">
          <Box role="radiogroup" aria-label="Dice colors" sx={diceGridSx}>
            <DiceCard
              dice={{ style: dice.style, colors: choice.style }}
              label="Match look"
              chosen={choice.diceColors === STYLE_DICE}
              onChoose={() => setChoice({ diceColors: STYLE_DICE })}
            />
            {Object.values(DICE_COLORS).map(({ id, label }) => (
              <DiceCard
                key={id}
                dice={{ style: dice.style, colors: id }}
                label={label}
                chosen={choice.diceColors === id}
                onChoose={() => setChoice({ diceColors: id })}
              />
            ))}
          </Box>
        </DialogSection>
      ) : null}
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

// A dice choice's card: a d20 as it would be rolled (`dice`: { style, colors }),
// showing its 20, and the choice's name.
function DiceCard({ dice, label, chosen, onChoose }) {
  return (
    <ButtonBase role="radio" aria-checked={chosen} aria-label={label} onClick={onChoose} sx={[cardSx, diceCardSx, chosen && chosenCardSx]}>
      <DiceSetScope dice={dice}>
        <Die3D value={20} faces={20} color="text.primary" size={60} seed={`dice-card:${dice.style}:${dice.colors}`} spin={false} />
      </DiceSetScope>
      <Typography component="span" sx={diceLabelSx}>{label}</Typography>
    </ButtonBase>
  );
}

const tabsSx = { mb: 1 };

const diceGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
  gap: 1,
};

const diceCardSx = { alignItems: 'center', textAlign: 'center' };

const diceLabelSx = { ...TEXT_STYLES.label, fontSize: FONT_SIZES.xs, color: 'text.secondary' };

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

// The sample's button: the app's raised button in the accent (pressableSx),
// drawn as a span, as the card itself is the button.
const sampleButtonSx = {
  ...pressableSx(UI_COLORS.accent),
  ...TEXT_STYLES.label,
  ml: 'auto',
  px: 1,
  py: 0.25,
  borderRadius: 1,
};

const cardLabelSx = {
  ...TEXT_STYLES.label,
  color: 'text.secondary',
};

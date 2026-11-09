import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Dices, Skull } from 'lucide-react';
import SheetDialog, { dialogSectionTitleSx } from '../../../shared/ui/SheetDialog.jsx';
import {
  buildFumbleFormula,
  FUMBLE_CATEGORIES,
  FUMBLE_DICE_TYPES,
  fumbleDiceCount,
  fumbleResultValues,
  getFumbleRange,
} from './fumbles.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

export default function CriticalFumblesDialog({ open, onClose }) {
  const { state, dispatch, roll } = useEncounterBuilder();
  const mobile = useIsPhone();
  const [categoryId, setCategoryId] = useState(FUMBLE_CATEGORIES[0].id);
  const [outcome, setOutcome] = useState(null);
  const outcomeRef = useRef(null);

  const category = FUMBLE_CATEGORIES.find((item) => item.id === categoryId) || FUMBLE_CATEGORIES[0];
  const table = state.fumbleTables[category.id];
  const formula = useMemo(() => buildFumbleFormula(table?.dice), [table?.dice]);
  const range = useMemo(() => getFumbleRange(table?.dice), [table?.dice]);
  const resultValues = useMemo(() => fumbleResultValues(table?.dice), [table?.dice]);
  const totalDice = fumbleDiceCount(table?.dice);

  useEffect(() => {
    if (!outcome) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    outcomeRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [outcome]);

  const changeCategory = (_, nextId) => {
    setCategoryId(nextId);
    setOutcome(null);
  };

  const adjustDie = (faces, delta) => {
    const current = Number(table?.dice?.[faces]) || 0;
    if (delta < 0 && (current === 0 || totalDice <= 1)) return;
    dispatch({
      type: 'setFumbleDice',
      categoryId: category.id,
      dice: {
        ...table.dice,
        [faces]: Math.max(0, current + delta),
      },
    });
    setOutcome(null);
  };

  const handleEntryChange = (result, value) => {
    dispatch({ type: 'setFumbleEntry', categoryId: category.id, result, value });
  };

  const handleRoll = () => {
    const result = roll(
      formula,
      `${category.label} Fumble`,
      null,
      (rolled) => table.entries[String(rolled.result)] || 'No consequence set.',
      { localOnly: true },
    );
    if (!result) return;
    setOutcome({
      categoryId: category.id,
      categoryLabel: category.label,
      total: result.result,
      mathStr: result.mathStr,
      consequence: result.note,
    });
  };

  const handleReset = () => {
    if (!confirmAction('Reset this fumble table to its defaults?')) return;
    dispatch({ type: 'resetFumbleCategory', categoryId: category.id });
    setOutcome(null);
  };

  const handleClose = () => {
    setOutcome(null);
    onClose?.();
  };

  return (
    <SheetDialog
      open={open}
      onClose={handleClose}
      title="Critical Fumbles"
      icon={<Skull size={20} />}
      showClose
      maxWidth="md"
      fullScreen={mobile}
      topPad={1.5}
      contentSx={dialogContentSx}
      actions={(
        <>
          <Button
            onClick={handleReset}
            color="inherit"
            size="small"
            sx={{ mr: 'auto' }}
          >
            Reset
          </Button>
          <Button onClick={handleRoll} variant="contained" size="small" startIcon={<Dices size={15} />}>
            Roll Fumble
          </Button>
        </>
      )}
    >
      <Tabs
        value={category.id}
        onChange={changeCategory}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={tabsSx}
      >
        {FUMBLE_CATEGORIES.map((item) => (
          <Tab key={item.id} value={item.id} label={item.label} />
        ))}
      </Tabs>

      <Box sx={sectionSx}>
        <Stack spacing={0.4}>
          <Typography sx={dialogSectionTitleSx}>Dice combination</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Choose any combination. At least one die is always kept.
          </Typography>
        </Stack>
        <Box sx={diceGridSx}>
          {FUMBLE_DICE_TYPES.map((faces) => {
            const count = Number(table?.dice?.[faces]) || 0;
            return (
              <Paper key={faces} variant="outlined" sx={dieControlSx}>
                <Typography sx={dieLabelSx}>d{faces}</Typography>
                <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => adjustDie(faces, -1)}
                    disabled={!count || totalDice <= 1}
                    sx={stepButtonSx}
                    aria-label={`Remove d${faces}`}
                  >
                    −
                  </Button>
                  <Typography sx={countSx}>{count}</Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => adjustDie(faces, 1)}
                    sx={stepButtonSx}
                    aria-label={`Add d${faces}`}
                  >
                    +
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.35, sm: 1 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography sx={formulaSx}>{formula}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Results {range.min}–{range.max} · {range.count} entries
          </Typography>
        </Stack>
      </Box>

      {outcome?.categoryId === category.id ? (
        <Paper ref={outcomeRef} sx={outcomeSx}>
          <Box sx={outcomeNumberSx}>{outcome.total}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={outcomeTitleSx}>{outcome.categoryLabel} Fumble</Typography>
            <Typography sx={outcomeTextSx}>{outcome.consequence}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{outcome.mathStr}</Typography>
          </Box>
        </Paper>
      ) : null}

      <Stack spacing={0.4} sx={{ mt: 1.75, mb: 1 }}>
        <Typography sx={dialogSectionTitleSx}>Result table</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Entries outside the current range are preserved when you change dice.
        </Typography>
      </Stack>
      <Stack spacing={0.75}>
        {resultValues.map((result) => (
          <Paper key={result} variant="outlined" sx={entryRowSx}>
            <Typography sx={resultLabelSx}>Result {result}</Typography>
            <TextField
              value={table?.entries?.[String(result)] ?? ''}
              onChange={(event) => handleEntryChange(result, event.target.value)}
              size="small"
              fullWidth
              multiline
              maxRows={4}
              placeholder="Describe the consequence…"
              slotProps={{ htmlInput: { 'aria-label': `${category.label} fumble result ${result}` } }}
            />
          </Paper>
        ))}
      </Stack>
    </SheetDialog>
  );
}

const dialogContentSx = {
  px: { xs: 1.25, sm: 2.25 },
  pb: { xs: 1.5, sm: 2 },
};

const tabsSx = {
  mx: { xs: -1.25, sm: -2.25 },
  px: { xs: 0.5, sm: 1.5 },
  borderBottom: 1,
  borderColor: 'divider',
  minHeight: 42,
  '& .MuiTab-root': {
    minHeight: 42,
    minWidth: 'auto',
    px: 1.5,
    fontSize: { xs: FONT_SIZES.xs, sm: FONT_SIZES.sm },
  },
};

const sectionSx = {
  ...SURFACES.wash,
  mt: 1.5,
  p: { xs: 1, sm: 1.25 },
};

const diceGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
  gap: 0.65,
  my: 1,
};

const dieControlSx = {
  px: 0.65,
  py: 0.55,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 0.5,
  bgcolor: uiAlpha(UI_COLORS.black, OPACITY.tint),
};

const dieLabelSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.md,
};

const countSx = {
  minWidth: 18,
  textAlign: 'center',
  fontFamily: UI_FONTS.mono,
  fontSize: FONT_SIZES.lg,
  color: UI_COLORS.accentText,
};

const stepButtonSx = {
  minWidth: 25,
  width: 25,
  height: 25,
  p: 0,
  fontWeight: 900,
};

const formulaSx = {
  fontFamily: UI_FONTS.mono,
  fontSize: FONT_SIZES.lg,
  fontWeight: 700,
  color: UI_COLORS.secondary,
};

const outcomeSx = {
  mt: 1.5,
  p: { xs: 1.1, sm: 1.4 },
  display: 'grid',
  gridTemplateColumns: { xs: '48px minmax(0,1fr)', sm: '58px minmax(0,1fr)' },
  gap: 1.25,
  alignItems: 'center',
  border: 1,
  borderColor: 'error.main',
  bgcolor: uiAlpha(UI_COLORS.dangerStrong, OPACITY.soft),
};

const outcomeNumberSx = {
  width: { xs: 46, sm: 54 },
  height: { xs: 46, sm: 54 },
  display: 'grid',
  placeItems: 'center',
  borderRadius: 1,
  bgcolor: 'error.main',
  color: UI_COLORS.dangerSurface,
  ...TEXT_STYLES.figure,
  fontSize: { xs: FONT_SIZES.body, sm: FONT_SIZES.title },
};

const outcomeTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  color: 'error.light',
};

const outcomeTextSx = {
  my: 0.25,
  fontSize: { xs: FONT_SIZES.xxl, sm: FONT_SIZES.body },
  fontWeight: 700,
  lineHeight: 1.4,
  overflowWrap: 'anywhere',
};

const entryRowSx = {
  p: { xs: 0.85, sm: 0.7 },
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '76px minmax(0,1fr)' },
  gap: { xs: 0.55, sm: 1 },
  alignItems: 'center',
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const resultLabelSx = {
  fontFamily: UI_FONTS.mono,
  fontSize: FONT_SIZES.md,
  fontWeight: 800,
  color: UI_COLORS.accentText,
  whiteSpace: 'nowrap',
};

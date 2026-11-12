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
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { LIST_ROW_RULE_SX } from '../../../shared/ui/interactive.js';
import Caption from '../../../shared/ui/Caption.jsx';
import DiceCountPicker from '../../../shared/character/dice/DiceCountPicker.jsx';

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
      icon={<Skull size={ICON_SIZES.xl} />}
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
          <Button onClick={handleRoll} variant="contained" size="small" startIcon={<Dices size={ICON_SIZES.sm} />}>
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
        <Stack spacing={0.5}>
          <Typography sx={dialogSectionTitleSx}>Dice combination</Typography>
          <Caption>
            Choose any combination. At least one die is always kept.
          </Caption>
        </Stack>
        <DiceCountPicker
          dice={FUMBLE_DICE_TYPES}
          counts={table?.dice}
          onStep={adjustDie}
          canDecrease={(_, count) => count > 0 && totalDice > 1}
          sx={diceGridSx}
        />
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 0.25, sm: 1 }}
          sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography sx={formulaSx}>{formula}</Typography>
          <Caption>
            Results {range.min}–{range.max} · {range.count} entries
          </Caption>
        </Stack>
      </Box>

      {outcome?.categoryId === category.id ? (
        <Paper ref={outcomeRef} sx={outcomeSx}>
          <Box sx={outcomeNumberSx}>{outcome.total}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={outcomeTitleSx}>{outcome.categoryLabel} Fumble</Typography>
            <Typography sx={outcomeTextSx}>{outcome.consequence}</Typography>
            <Caption>{outcome.mathStr}</Caption>
          </Box>
        </Paper>
      ) : null}

      <Stack spacing={0.5} sx={{ mt: 1.75, mb: 1 }}>
        <Typography sx={dialogSectionTitleSx}>Result table</Typography>
        <Caption>
          Entries outside the current range are preserved when you change dice.
        </Caption>
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
  ...LIST_ROW_RULE_SX,
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

// The dialog is wide, so the dice rows run in columns.
const diceGridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  columnGap: 2,
  my: 1,
};

const formulaSx = {
  fontFamily: UI_FONTS.mono,
  fontSize: FONT_SIZES.lg,
  fontWeight: FONT_WEIGHTS.bold,
  color: UI_COLORS.secondary,
};

const outcomeSx = {
  mt: 1.5,
  p: { xs: 1, sm: 1.5 },
  display: 'grid',
  gridTemplateColumns: { xs: '48px minmax(0,1fr)', sm: '58px minmax(0,1fr)' },
  gap: 1.25,
  alignItems: 'center',
  border: 2,
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
  fontWeight: FONT_WEIGHTS.bold,
  lineHeight: LINE_HEIGHTS.normal,
  overflowWrap: 'anywhere',
};

const entryRowSx = {
  p: { xs: 0.75, sm: 0.75 },
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '76px minmax(0,1fr)' },
  gap: { xs: 0.5, sm: 1 },
  alignItems: 'center',
  bgcolor: uiAlpha(UI_COLORS.white, OPACITY.faint),
};

const resultLabelSx = {
  fontFamily: UI_FONTS.mono,
  fontSize: FONT_SIZES.md,
  fontWeight: FONT_WEIGHTS.heavy,
  color: UI_COLORS.accentText,
  whiteSpace: 'nowrap',
};

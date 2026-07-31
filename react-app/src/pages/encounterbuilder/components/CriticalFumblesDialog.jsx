import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Dices, Skull } from 'lucide-react';
import SheetDialog from '../../../shared/character/SheetDialog.jsx';
import {
  buildFumbleFormula,
  FUMBLE_CATEGORIES,
  FUMBLE_DICE_TYPES,
  fumbleDiceCount,
  fumbleResultValues,
  getFumbleRange,
} from '../logic/fumbles.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function CriticalFumblesDialog({ open, onClose }) {
  const { state, dispatch, roll } = useEncounterBuilder();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [categoryId, setCategoryId] = useState(FUMBLE_CATEGORIES[0].id);
  const [outcome, setOutcome] = useState(null);
  const [resetArmed, setResetArmed] = useState(false);
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
    setResetArmed(false);
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
    setResetArmed(false);
  };

  const handleEntryChange = (result, value) => {
    dispatch({ type: 'setFumbleEntry', categoryId: category.id, result, value });
    setResetArmed(false);
  };

  const handleRoll = () => {
    setResetArmed(false);
    const result = roll(
      formula,
      `${category.label} Fumble`,
      null,
      (rolled) => table.entries[String(rolled.result)] || 'No consequence set.',
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
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    dispatch({ type: 'resetFumbleCategory', categoryId: category.id });
    setOutcome(null);
    setResetArmed(false);
  };

  const handleClose = () => {
    setOutcome(null);
    setResetArmed(false);
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
            variant={resetArmed ? 'contained' : 'text'}
            color={resetArmed ? 'error' : 'inherit'}
            size="small"
            sx={{ mr: 'auto' }}
          >
            {resetArmed ? 'Confirm reset' : 'Reset'}
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
          <Typography sx={sectionTitleSx}>Dice combination</Typography>
          <Typography variant="caption" color="text.secondary">
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
          <Typography variant="caption" color="text.secondary">
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
            <Typography variant="caption" color="text.secondary">{outcome.mathStr}</Typography>
          </Box>
        </Paper>
      ) : null}

      <Stack spacing={0.4} sx={{ mt: 1.75, mb: 1 }}>
        <Typography sx={sectionTitleSx}>Result table</Typography>
        <Typography variant="caption" color="text.secondary">
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
              inputProps={{ 'aria-label': `${category.label} fumble result ${result}` }}
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
    fontSize: { xs: '0.62rem', sm: '0.68rem' },
  },
};

const sectionSx = {
  mt: 1.5,
  p: { xs: 1, sm: 1.25 },
  border: 1,
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'rgba(255,255,255,0.02)',
};

const sectionTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.7rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'primary.main',
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
  bgcolor: 'rgba(0,0,0,0.12)',
};

const dieLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.72rem',
  fontWeight: 800,
};

const countSx = {
  minWidth: 18,
  textAlign: 'center',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.76rem',
  color: '#edd48a',
};

const stepButtonSx = {
  minWidth: 25,
  width: 25,
  height: 25,
  p: 0,
  fontWeight: 900,
};

const formulaSx = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#70b7a6',
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
  bgcolor: 'rgba(211,71,58,0.09)',
};

const outcomeNumberSx = {
  width: { xs: 46, sm: 54 },
  height: { xs: 46, sm: 54 },
  display: 'grid',
  placeItems: 'center',
  borderRadius: 1,
  bgcolor: 'error.main',
  color: '#220d0b',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: { xs: '1rem', sm: '1.2rem' },
  fontWeight: 900,
};

const outcomeTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.65rem',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'error.light',
};

const outcomeTextSx = {
  my: 0.25,
  fontSize: { xs: '0.9rem', sm: '0.96rem' },
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
  bgcolor: 'rgba(255,255,255,0.018)',
};

const resultLabelSx = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '0.7rem',
  fontWeight: 800,
  color: '#edd48a',
  whiteSpace: 'nowrap',
};

import { Box, Button, Stack, Typography, useTheme } from '@mui/material';
import { Dices, ScrollText, Trash2 } from 'lucide-react';
import SelectorGroup from './SelectorGroup.jsx';
import TierSelector from './TierSelector.jsx';
import QuestCard from './QuestCard.jsx';
import { QUEST_SCOPE_OPTIONS } from '../logic/constants.js';
import { SELECTOR_CONTRACTS } from '../logic/selectorContracts.js';
import { confirmDiscard } from '../logic/confirmDiscard.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';

function QuestCountHeader({ questSet }) {
  const theme = useTheme();
  const scopeOption = QUEST_SCOPE_OPTIONS.find((o) => o.id === questSet.config.scope);
  const scopeLabel = questSet.config.scope === 'random'
    ? `Random (${questSet.numDice}d8)`
    : (scopeOption?.label || questSet.config.scope);

  return (
    <Box sx={{ ...headerSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Dices size={12} color={theme.palette.text.secondary} />
        <Typography sx={headerLabelSx}>Quest Count</Typography>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
        <Typography sx={headerTextSx}>{scopeLabel} → rolls:</Typography>
        {questSet.rolls.map((r, i) => (
          <Box
            key={i}
            component="span"
            sx={{
              ...dieSx,
              ...(r === questSet.count ? { borderColor: 'primary.main', color: 'primary.main' } : {}),
            }}
          >
            {r}
          </Box>
        ))}
        <Typography sx={headerTextSx}>→ max =</Typography>
        <Typography sx={maxSx}>{questSet.count}</Typography>
        <Typography sx={headerTextSx}>quest{questSet.count > 1 ? 's' : ''}</Typography>
      </Stack>
    </Box>
  );
}

export default function QuestView() {
  const { state, dispatch, generateQuests } = useGmBoard();
  const theme = useTheme();
  const qPopContract = SELECTOR_CONTRACTS.qPop;

  const canGenerate = Boolean(state.qPop) && Boolean(state.qTier);
  const questSet = state.results.quest;

  const handleGenerate = () => {
    generateQuests({ scope: state.qPop, thr: state.qThr, tier: state.qTier });
  };

  const handleClear = () => {
    if (!confirmDiscard('Discard the generated quests? This cannot be undone.')) return;
    dispatch({ type: 'clearQuests' });
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={1.5} sx={panelSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
          <ScrollText size={14} color={theme.palette.primary.main} />
          <Typography sx={titleSx}>Quest Generator</Typography>
        </Box>
        <SelectorGroup
          label="Scope"
          options={qPopContract.options}
          getId={qPopContract.getId}
          value={qPopContract.deriveValue(state)}
          onChange={(o) => dispatch(qPopContract.action(o))}
        />
        <TierSelector value={state.qTier} onChange={(tier) => dispatch({ type: 'setQTier', qTier: tier })} />
        <Box sx={dividerSx} />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<Dices size={15} />} disabled={!canGenerate} onClick={handleGenerate}>
            Generate
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={15} />}
            disabled={!questSet}
            onClick={handleClear}
          >
            Clear
          </Button>
        </Stack>
      </Stack>

      {questSet ? (
        <>
          <QuestCountHeader questSet={questSet} />
          <Box sx={gridSx}>
            {questSet.quests.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
          </Box>
        </>
      ) : null}
    </Stack>
  );
}

const panelSx = {
  p: 1.5,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.8rem',
  letterSpacing: '0.06em',
  color: 'primary.main',
};

const dividerSx = {
  borderTop: '1px solid',
  borderColor: 'divider',
};

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
  gap: 1.25,
};

const headerSx = {
  p: 1.25,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
};

const headerLabelSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const headerTextSx = {
  fontSize: '0.82rem',
  color: 'text.secondary',
};

const dieSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: 1,
  border: '1px solid',
  borderColor: 'divider',
  fontSize: '0.78rem',
  color: 'text.primary',
};

const maxSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '1.15rem',
  fontWeight: 900,
  color: 'primary.main',
};

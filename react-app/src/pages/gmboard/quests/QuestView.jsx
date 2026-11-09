import { Box, Stack, Typography, useTheme } from '@mui/material';
import { Dices, ScrollText } from 'lucide-react';
import SelectorGroup from '../../../shared/gmboard/ui/SelectorGroup.jsx';
import TierSelector from '../../../shared/gmboard/ui/TierSelector.jsx';
import QuestCard from './QuestCard.jsx';
import { QUEST_SCOPE_OPTIONS } from '../../../shared/gmboard/boardOptions.js';
import { SELECTOR_CONTRACTS } from '../../../shared/gmboard/ui/selectorContracts.js';
import { useGmBoard } from '../state/GmBoardContext.jsx';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import BoardPanel from '../ui/BoardPanel.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { boardCardGridSx, boardInsetSx } from '../../../shared/gmboard/ui/surfaces.js';
import GenerateActions from '../ui/GenerateActions.jsx';

function QuestCountHeader({ questSet }) {
  const theme = useTheme();
  const scopeOption = QUEST_SCOPE_OPTIONS.find((o) => o.id === questSet.config.scope);
  const scopeLabel = questSet.config.scope === 'random'
    ? `Random (${questSet.numDice}d8)`
    : (scopeOption?.label || questSet.config.scope);

  return (
    <Box sx={{ ...headerSx, bgcolor: theme.palette.gmboard.panelOverlay }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Dices size={12} color={theme.palette.text.secondary} />
        <Typography sx={headerLabelSx}>Quest Count</Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
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
  const qPopContract = SELECTOR_CONTRACTS.qPop;

  const canGenerate = Boolean(state.qPop) && Boolean(state.qTier);
  const questSet = state.results.quest;

  const handleGenerate = () => {
    generateQuests({ scope: state.qPop, thr: state.qThr, tier: state.qTier });
  };

  return (
    <Stack spacing={2}>
      <BoardPanel icon={ScrollText} title="Quest Generator">
        <SelectorGroup
          label="Scope"
          options={qPopContract.options}
          getId={qPopContract.getId}
          value={qPopContract.deriveValue(state)}
          onChange={(o) => dispatch(qPopContract.action(o))}
        />
        <TierSelector value={state.qTier} onChange={(tier) => dispatch(SELECTOR_CONTRACTS.qTier.action({ tier }))} />
        <GenerateActions
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
          hasResult={Boolean(questSet)}
          clearMessage="Discard the generated quests? This cannot be undone."
          onClear={() => dispatch({ type: 'clearQuests' })}
        />
      </BoardPanel>

      {questSet ? (
        <>
          <QuestCountHeader questSet={questSet} />
          <Box sx={boardCardGridSx}>
            {questSet.quests.map((quest) => <QuestCard key={quest.id} quest={quest} />)}
          </Box>
        </>
      ) : null}
    </Stack>
  );
}

const headerSx = boardInsetSx;

const headerLabelSx = captionLabelSx;

const headerTextSx = {
  fontSize: FONT_SIZES.xl,
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
  fontSize: FONT_SIZES.lg,
  color: 'text.primary',
};

const maxSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.lead,
  fontWeight: 900,
  color: 'primary.main',
};

import { lazy, memo, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { sheetLoadingSx } from './sceneEditorStyles.js';
import { NO_PANEL_LAYERS_SX } from '../../../shared/ui/PanelHeader.jsx';

const CampaignSheetView = lazy(() => import('../../campaignsheet/CampaignSheetView.jsx'));

// The sheet takes its vitals from the roster's digest: the map already follows
// every campaign character, so the sheet opens no channel of its own.
//
// Its panels are not layers of their own here (NO_PANEL_LAYERS_SX, through a
// box that takes no room): over a board that moves, twenty layers doubled the
// dropped frames of a pan. Elsewhere (its own page, the encounter builder)
// the layers keep a card's opening smooth.
const EmbeddedBattleMapSheet = memo(function EmbeddedBattleMapSheet({ characterId, digest, onRoll }) {
  return (
    <Suspense fallback={<Box sx={sheetLoadingSx}><CircularProgress size={26} /></Box>}>
      <Box sx={{ display: 'contents', ...NO_PANEL_LAYERS_SX }}>
        <CampaignSheetView
          sheetId={characterId}
          editable
          embedded
          liveDigest={digest}
          onRoll={onRoll}
          showOwnRollToast={false}
        />
      </Box>
    </Suspense>
  );
});

export default EmbeddedBattleMapSheet;

import { lazy, memo, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { sheetLoadingSx } from './sceneEditorStyles.js';

const CampaignSheetView = lazy(() => import('../../campaignsheet/CampaignSheetView.jsx'));

// The sheet takes its vitals from the roster's digest: the map already follows
// every campaign character, so the sheet opens no channel of its own.
const EmbeddedBattleMapSheet = memo(function EmbeddedBattleMapSheet({ characterId, digest, onRoll }) {
  return (
    <Suspense fallback={<Box sx={sheetLoadingSx}><CircularProgress size={26} /></Box>}>
      <CampaignSheetView
        sheetId={characterId}
        editable
        embedded
        liveDigest={digest}
        onRoll={onRoll}
        showOwnRollToast={false}
      />
    </Suspense>
  );
});

export default EmbeddedBattleMapSheet;

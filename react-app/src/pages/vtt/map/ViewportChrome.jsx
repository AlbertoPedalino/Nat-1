import { useState } from 'react';
import { Box } from '@mui/material';
import FloatingSheetPanel from '../sheets/FloatingSheetPanel.jsx';
import { CornerButtons, FullscreenButton } from './ViewportControls.jsx';
import {
  backgroundStripSx,
  imageSwitchSx,
  layerSwitchSx,
} from './sceneViewportStyles.js';

// The controls that sit on the board: corner buttons and the tool rail, the
// floating sheet of a fullscreen board, the picture and layer switches, the
// background strip, the turn order and the fullscreen button. They live inside
// the viewport rather than around it, which is the only way they survive
// fullscreen — a fullscreen element hides its siblings.
export default function ViewportChrome({
  hostRef,
  rolls,
  controls,
  fullscreenActive,
  fullscreenSheet,
  floatingSheetOpen,
  setFloatingSheetOpen,
  imageSwitch,
  initiative,
  layerSwitch,
  backgroundStrip,
  showFullscreenControl,
  toggleFullscreen,
}) {
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <>
      {rolls || controls || (fullscreenActive && fullscreenSheet) ? (
        <CornerButtons
          rolls={rolls}
          showSheetButton={Boolean(fullscreenActive && fullscreenSheet)}
          sheetOpen={floatingSheetOpen}
          onSheetOpenChange={setFloatingSheetOpen}
          hasControls={Boolean(controls)}
          controlsOpen={controlsOpen}
          onToggleControls={() => setControlsOpen((open) => !open)}
        />
      ) : null}

      {/* Rendered as-is: the rail positions itself against the map. Wrapping
          it in a second absolutely positioned box left it anchored to that
          box instead, which is why the tools were nowhere to be seen. */}
      {controls && controlsOpen ? controls : null}

      {fullscreenActive && fullscreenSheet && floatingSheetOpen ? (
        <FloatingSheetPanel
          choices={fullscreenSheet.choices}
          selectedId={fullscreenSheet.selectedId}
          onSelectionChange={fullscreenSheet.onSelectionChange}
          onClose={() => setFloatingSheetOpen(false)}
          containerRef={hostRef}
        >
          {fullscreenSheet.content}
        </FloatingSheetPanel>
      ) : null}

      {imageSwitch ? (
        <Box data-viewport-control sx={imageSwitchSx}>{imageSwitch}</Box>
      ) : null}

      {initiative}

      {layerSwitch ? (
        <Box data-viewport-control sx={layerSwitchSx}>{layerSwitch}</Box>
      ) : null}

      {backgroundStrip ? (
        <Box data-viewport-control sx={backgroundStripSx}>{backgroundStrip}</Box>
      ) : null}

      {showFullscreenControl ? (
        <FullscreenButton active={fullscreenActive} onToggle={toggleFullscreen} />
      ) : null}
    </>
  );
}

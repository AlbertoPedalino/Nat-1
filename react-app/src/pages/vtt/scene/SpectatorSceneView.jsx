import { Box } from '@mui/material';
import SceneViewport from '../map/SceneViewport.jsx';
import InitiativeStrip from '../initiative/InitiativeStrip.jsx';
import { PLAYER_FOG_OPACITY, spectatorRootSx } from './sceneEditorStyles.js';

// The projector's board: the player-safe projection, nothing to click, and the
// camera the presenter drives.
export default function SpectatorSceneView({
  scene,
  viewportDisplay,
  tokens,
  atmosphere,
  imageFilter,
  hexCells,
  partyHex,
  onImageSize,
  drawings,
  lasers,
  rollBubbles,
  diceThrows,
  conditionEntries,
  presentedInspection,
  initiativeEntries,
  initiativeRound,
  remoteMeasure,
  feetPerCell,
  followView,
}) {
  return (
    <Box data-spectator-view sx={spectatorRootSx}>
      <SceneViewport
        scene={scene}
        imageUrl={viewportDisplay.url}
        preparedImageSize={viewportDisplay.imageSize}
        tokens={tokens}
        snap
        canMove={() => false}
        fog={scene.fog}
        atmosphere={atmosphere}
        imageFilter={imageFilter}
        fogOpacity={PLAYER_FOG_OPACITY}
        fogOnTop
        paintMode="select"
        backgroundOnly={viewportDisplay.shownImage === 'background'}
        // The projector shows the crawl as the table sees it: the country
        // they have been through, and the hex they are standing in.
        hexCells={hexCells}
        partyHex={partyHex}
        onImageSize={onImageSize}
        drawings={drawings}
        lasers={lasers}
        rollBubbles={rollBubbles}
        diceThrows={diceThrows}
        conditionEntries={conditionEntries}
        presentedInspection={presentedInspection}
        initiative={<InitiativeStrip entries={initiativeEntries} round={initiativeRound} />}
        remoteMeasure={remoteMeasure}
        feetPerCell={feetPerCell}
        followView={followView}
        cameraLocked
        fillViewport
      />
    </Box>
  );
}

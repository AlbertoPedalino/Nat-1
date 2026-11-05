import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { sceneTitleFor } from '../../../shared/vtt/scene/scene.js';
import { InitiativeButton } from '../initiative/InitiativeStrip.jsx';
import SceneSwitcher from './SceneSwitcher.jsx';
import BattleMapViewSwitch from '../map/BattleMapViewSwitch.jsx';
import LiveControls from './LiveControls.jsx';
import {
  sceneControlsPassThroughSx,
  sceneGmControlsSx,
  sceneIdentitySx,
  scenePlayerViewSwitchSx,
  scenePresenterActionsSx,
  sceneRenameButtonSx,
  sceneTitleSx,
  sceneTopbarSx,
  sceneViewSwitchSx,
  viewButtonSx,
} from './sceneEditorStyles.js';

// The scene's title row: scene switcher (GM), name and rename, live and
// projector controls, initiative, the GM's player-view toggle, and the
// Map / Sheet switch.
export default function SceneTopBar({
  scene, role, onOpenScene, gmPlayerPreview, handleRename, handleToggleLive,
  handleTogglePlayerPreview, projectorAttached, projectorControlsOpen, projectorFollowing,
  handleToggleProjectorFollow, openSpectator, stopProjector, gmTurnView, initiativeEntries,
  initiativeChoices, handleChooseFight, contentView, setContentView, hasSheetContent,
  sheetChoices, sheetAreaSelectedId, selectSheetCharacter,
}) {
  return (
    <Box sx={sceneTopbarSx}>
      {role.isGm && !gmPlayerPreview && onOpenScene ? (
        <SceneSwitcher scene={scene} onOpenScene={onOpenScene} />
      ) : null}
      <Box sx={sceneIdentitySx}>
        <Typography variant="h1" sx={sceneTitleSx}>
          {sceneTitleFor(scene, {
            isGm: role.isGm && !gmPlayerPreview,
            campaignName: role.campaignName,
          })}
        </Typography>
        {role.isGm && !gmPlayerPreview ? (
          <Tooltip title="Rename scene">
            <IconButton size="small" aria-label="Rename scene" onClick={handleRename} sx={sceneRenameButtonSx}>
              <Pencil size={11} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      {/* On a phone the GM's four buttons share one row under the name: what
          the table sees on the left, what the GM is looking at on the right. */}
      <Box sx={role.isGm ? sceneGmControlsSx : sceneControlsPassThroughSx}>
      {role.isGm ? (
        <Stack direction="row" spacing={0.75} useFlexGap sx={scenePresenterActionsSx}>
          {!gmPlayerPreview ? (
            <LiveControls
              isLive={scene.isLive}
              projectorFollowing={projectorFollowing}
              // A scene that is not live has no projector to point anywhere.
              projectorAttached={projectorControlsOpen}
              onToggleLive={handleToggleLive}
              onToggleFreeze={handleToggleProjectorFollow}
              onOpenProjector={openSpectator}
              onStopProjector={stopProjector}
            />
          ) : null}
          {gmTurnView && !initiativeEntries.length ? (
            <InitiativeButton choices={initiativeChoices} onChoose={handleChooseFight} />
          ) : null}
        </Stack>
      ) : null}
      {/* What the GM is looking at, on the far side of what the table sees:
          the player preview changes nothing for anyone else, like the sheet. */}
      {role.isGm || !gmPlayerPreview ? (
        <Stack
          direction="row"
          spacing={0.75}
          sx={role.isGm ? sceneViewSwitchSx : scenePlayerViewSwitchSx}
        >
          {role.isGm ? (
            <Tooltip title={gmPlayerPreview
              ? 'Return to the GM controls'
              : 'Preview exactly what players can see; editing is disabled'}>
              <Button
                size="small"
                variant={gmPlayerPreview ? 'contained' : 'outlined'}
                startIcon={gmPlayerPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                aria-label={gmPlayerPreview ? 'Exit player view' : 'Player view'}
                aria-pressed={gmPlayerPreview}
                onClick={handleTogglePlayerPreview}
                sx={viewButtonSx}
              >
                {/* The full label even on a phone: a bare "Player" reads
                    as a person, not a view. */}
                {gmPlayerPreview ? 'Exit player view' : 'Player view'}
              </Button>
            </Tooltip>
          ) : null}
          {!gmPlayerPreview ? (
            <BattleMapViewSwitch
              view={contentView}
              choices={sheetChoices}
              selectedId={sheetAreaSelectedId}
              available={hasSheetContent}
              onViewChange={setContentView}
              onSelectionChange={selectSheetCharacter}
            />
          ) : null}
        </Stack>
      ) : null}
      </Box>
    </Box>
  );
}

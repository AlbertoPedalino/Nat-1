import {
  Button,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { numberSx } from './panelStyles.js';
import { gridCellWord } from '../../../shared/vtt/map/hexGeometry.js';

// The scene panel's Play area section: the part of the scene the players
// receive; outside it is staging.

export function playAreaSummary(scene) {
  const cellPlural = gridCellWord(scene.grid.shape, { plural: true });
  return scene.playArea ? `${scene.playArea.w} × ${scene.playArea.h} ${cellPlural}` : 'Whole scene';
}

export function PlayAreaControls({ scene, busy, onPlayAreaChange, onFitPlayArea }) {
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Outside it is staging: the players never receive what stands there.
      </Typography>
      {scene.playArea ? (
        <>
          <Stack direction="row" spacing={0.75}>
            {['x', 'y', 'w', 'h'].map((key) => (
              <TextField
                key={key}
                label={key.toUpperCase()}
                size="small"
                type="number"
                value={scene.playArea[key]}
                onChange={(event) => onPlayAreaChange({ ...scene.playArea, [key]: Number(event.target.value) })}
                sx={numberSx}
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              disabled={busy || scene.shownImage !== 'map'}
              onClick={onFitPlayArea}
            >
              Refit to the map
            </Button>
            <Button size="small" fullWidth disabled={busy} onClick={() => onPlayAreaChange(null)}>
              Use the whole scene
            </Button>
          </Stack>
        </>
      ) : (
        // Sized from the picture on screen, so it has to be the battlemap:
        // fitted while the background is up it would take that one's shape.
        <Tooltip
          title={scene.shownImage !== 'map'
            ? 'Switch to the battlemap first — the play area is measured from the picture on screen.'
            : ''}
        >
          <span>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              disabled={busy || scene.shownImage !== 'map'}
              onClick={onFitPlayArea}
            >
              Limit to the map
            </Button>
          </span>
        </Tooltip>
      )}
    </>
  );
}

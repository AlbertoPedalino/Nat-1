import { FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { Grid3x3, Hexagon } from 'lucide-react';
import ColorField from '../../../shared/ui/ColorField.jsx';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import { DEFAULT_GRID } from '../../../shared/vtt/scene/scene.js';
import { numberSx } from './panelStyles.js';
import { SectionLabel } from './ScenePanelSection.jsx';
import { gridCellWord, gridShape } from '../../../shared/vtt/map/hexGeometry.js';
import { capitalize } from '../../../shared/ui/textCase.js';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// The scene panel's Grid section: shape, calibration over the picture, how the
// lines look, and whether scenery snaps to the cells.

export function gridSummary(grid) {
  return [
    capitalize(gridCellWord(grid.shape, { plural: true })),
    `${grid.size} px`,
    grid.visible ? 'shown' : 'hidden',
  ].join(' · ');
}

export function GridControls({ grid, onGridChange }) {
  const setGrid = (patch) => onGridChange({ ...grid, ...patch });

  return (
    <>
      {/* Squares for a dungeon, hexes for the wilderness. Changing it changes
          what a piece's stored position means, so it is asked once, here with
          the calibration, rather than offered as a view option. */}
      <ChoiceToggle
        fullWidth
        ariaLabel="Grid shape"
        value={gridShape(grid)}
        onChange={(shape) => setGrid({ shape })}
        options={[
          { value: 'square', icon: Grid3x3, label: 'Squares', ariaLabel: 'Square grid' },
          { value: 'hex', icon: Hexagon, label: 'Hexes', ariaLabel: 'Hex grid' },
        ]}
      />

      <SectionLabel
        label="Alignment"
        hint="The cell size almost never matches the image, so all three numbers are editable: set Cell to the width of one square on the picture, then nudge the offsets until the lines sit on it."
      />
      <Stack direction="row" spacing={0.75}>
        <TextField
          label="Cell"
          size="small"
          type="number"
          value={grid.size}
          onChange={(event) => setGrid({ size: Number(event.target.value) })}
          sx={numberSx}
        />
        <TextField
          label="Offset X"
          size="small"
          type="number"
          value={grid.offsetX}
          onChange={(event) => setGrid({ offsetX: Number(event.target.value) })}
          sx={numberSx}
        />
        <TextField
          label="Offset Y"
          size="small"
          type="number"
          value={grid.offsetY}
          onChange={(event) => setGrid({ offsetY: Number(event.target.value) })}
          sx={numberSx}
        />
      </Stack>

      {/* How the lines look: a printed battlemap already has squares of its
          own, and gold over a snowfield is not the same read as gold over a
          cave. */}
      <SectionLabel
        label="Lines"
        hint="Half a pixel to six, in screen pixels, so a line stays as fine at one zoom as at another. Whatever colour you pick is drawn faint enough to read the map through."
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <ColorField
          value={grid.color || DEFAULT_GRID.color}
          onChange={(color) => setGrid({ color })}
          deferMs={180}
          label="Grid colour"
          size={34}
        />
        <TextField
          label="Line"
          size="small"
          type="number"
          value={grid.lineWidth ?? DEFAULT_GRID.lineWidth}
          onChange={(event) => setGrid({ lineWidth: Number(event.target.value) })}
          slotProps={{ htmlInput: { min: 0.5, max: 6, step: 0.5 } }}
          sx={numberSx}
        />
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={grid.visible}
              onChange={(event) => setGrid({ visible: event.target.checked })}
            />
          )}
          label={<Typography variant="body2">Show</Typography>}
          sx={{ ml: 0, mr: 0 }}
        />
      </Stack>

      {/* Creatures always take a square — that is what a battlemap is for. This
          is about the scenery: a door across a wall, a rug at an angle, a
          handout dropped between two squares. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={grid.snapObjects !== false}
              onChange={(event) => setGrid({ snapObjects: event.target.checked })}
            />
          )}
          label={<Typography variant="body2">Objects snap to the grid</Typography>}
        />
        <InfoHint
          label="About snapping"
          text="Off, objects and pictures are placed and dragged freely. Creature pieces keep their square either way."
        />
      </Stack>
    </>
  );
}

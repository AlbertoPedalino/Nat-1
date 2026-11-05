import { Box, Typography } from '@mui/material';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { cellSize, cellToWorld, worldToScreen } from '../../../shared/vtt/map/geometry.js';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import HexGrid from './HexGrid.jsx';
import SquareGrid from './SquareGrid.jsx';
import { playAreaBox, hexPlayAreaPolygon } from './viewportGeometry.js';
import { playAreaSvgSx, placeholderSx, playAreaStrokeProps } from './sceneViewportStyles.js';

// The still layers under everything on the battle map: the picture (with its
// light-filter tint), the square or hex grid, and the play-area outline. No
// interaction here: SceneViewport lays them out and passes the measurements.
export default function MapBackdrop({
  hexCells,
  scene, view, size, imageUrl, imageSize, imageLook, onImageSize, setLoadedImageSize,
  backgroundOnly, gridVisible, gridColor, gridLine, selectedHex, showPlayArea, hexMapBox,
  hexPlayAreaClip, hexPlayAreaMatchesMap, viewportSize,
}) {
  return (
    <>
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          draggable={false}
          onLoad={(event) => {
            const size = {
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            };
            setLoadedImageSize(size);
            // The editor needs it too: fog and the play area are both sized from
            // the map, and only the <img> knows how big it really is.
            onImageSize?.(size);
          }}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            imageRendering: 'auto',
            userSelect: 'none',
            pointerEvents: 'none',
            filter: imageLook.filter || undefined,
          }}
        />
      ) : (
        <Typography sx={placeholderSx}>Upload a map image to start building this scene.</Typography>
      )}
      {/* The colour half of the light filter: laid exactly over the picture and
          multiplied into it, under everything that stands on the map. */}
      {imageUrl && imageSize && imageLook.tint ? (
        <Box
          data-image-tint
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: imageSize.width,
            height: imageSize.height,
            transformOrigin: '0 0',
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            bgcolor: imageLook.tint.color,
            opacity: imageLook.tint.opacity,
            mixBlendMode: 'multiply',
            pointerEvents: 'none',
          }}
        />
      ) : null}

      {/* Rendered whenever the map is a hexcrawl, not only while its mesh is
          on: the painted country and the picked hex are content, and the grid
          being off — or zoomed past reading — is no reason to lose them. */}
      {!backgroundOnly && isHexGrid(scene.grid) ? (
        <HexGrid
          outlined={gridVisible}
          grid={scene.grid}
          view={view}
          viewportSize={viewportSize}
          cells={hexCells}
          selected={selectedHex}
          // The map itself is the final mask. Edge hexes remain usable, but the
          // parts of their fill and outline beyond the picture are cut away.
          clipRect={hexMapBox}
          clipPolygon={hexPlayAreaClip}
          // A hexcrawl map is styled like any other: the colour and the weight
          // the scene carries are the grid's, whichever shape it is.
          lineColor={gridColor}
          lineWidth={gridLine}
        />
      ) : null}

      {gridVisible && !isHexGrid(scene.grid) ? (
        <SquareGrid
          grid={scene.grid}
          view={view}
          viewportSize={viewportSize}
          lineColor={gridColor}
          lineWidth={gridLine}
          // Squares outside the play area are staging space, not board space.
          clipRect={scene.playArea ? playAreaBox(scene, view) : null}
        />
      ) : null}

      {/* The edge of what the players receive. Drawn for the GM only — for a
          player it would be a line around everything they can see anyway. */}
      {scene.playArea && showPlayArea && !backgroundOnly ? (isHexGrid(scene.grid) ? (
        <Box
          component="svg"
          aria-hidden
          data-play-area={hexPlayAreaMatchesMap ? 'hex-map' : 'hex-custom'}
          width="100%"
          height="100%"
          sx={playAreaSvgSx}
        >
          {hexPlayAreaMatchesMap ? (
            <rect
              x={hexMapBox.left}
              y={hexMapBox.top}
              width={hexMapBox.width}
              height={hexMapBox.height}
              {...playAreaStrokeProps}
            />
          ) : (
            <polygon
              points={hexPlayAreaPolygon(scene, view)}
              {...playAreaStrokeProps}
            />
          )}
        </Box>
      ) : (() => {
        const topLeft = worldToScreen(cellToWorld({ col: scene.playArea.x, row: scene.playArea.y }, scene.grid), view);
        const cell = cellSize(scene.grid) * view.zoom;
        return (
          <Box
            aria-hidden
            data-play-area="square"
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${topLeft.x}px, ${topLeft.y}px)`,
              width: scene.playArea.w * cell,
              height: scene.playArea.h * cell,
              border: `2px dashed ${vttAlpha(VTT_COLORS.gold, 0.7)}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
            }}
          />
        );
      })()) : null}
    </>
  );
}

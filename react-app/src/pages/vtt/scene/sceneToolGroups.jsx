import { Cloud, DoorOpen, Pencil, Pointer, Ruler, Shapes, Users } from 'lucide-react';
import { gridShape } from '../../../shared/vtt/map/hexGeometry.js';
import DungeonPanel from '../dungeon/DungeonPanel.jsx';
import PlayerPanel from '../session/PlayerPanel.jsx';
import RosterPanel from '../tokens/RosterPanel.jsx';
import MapObjectsPanel from '../objects/MapObjectsPanel.jsx';
import { DrawPanel, FogPanel, LaserPanel, MeasurePanel } from './ScenePanels.jsx';

// The groups of the scene's right tool rail (Draw, Fog, Measure, Laser,
// Pieces, Objects, Players, Dungeon…), each with its icon, what selecting it
// activates, and its panel. Built by SceneEditor from its state and handlers.
export function buildToolGroups({
  activeLayer,
  areaOptions,
  brushSize,
  busy,
  drawColor,
  drawWidth,
  dungeon,
  erasable,
  feetPerCell,
  handleAddImage,
  handleAddToken,
  handleAreaOptionsChange,
  handleEnableFog,
  handleFitPlayArea,
  handleFogAll,
  handleGridChange,
  handlePlaceCharacter,
  handlePlaceObject,
  handlePlayAreaChange,
  handleRemoveCharacter,
  handleShownImageChange,
  handleUndoDrawing,
  handleUploadBackground,
  handleUploadMap,
  hexcrawl,
  measureShape,
  paintMode,
  role,
  roster,
  scene,
  setBrushSize,
  setDrawColor,
  setDrawWidth,
  setFeetPerCell,
  setImportOpen,
  setMeasureShape,
  setMonsterOpen,
  setPaintMode,
  setPlacementDrag,
  shownImageForViewport,
  tokens,
}) {
  const drawGroup = {
    id: 'draw',
    label: 'Draw',
    icon: Pencil,
    onActivate: () => setPaintMode('draw'),
    content: (
      <DrawPanel
        busy={busy}
        paintMode={paintMode}
        drawColor={drawColor}
        drawWidth={drawWidth}
        areaOptions={areaOptions}
        feetPerCell={feetPerCell}
        gridShape={gridShape(scene.grid)}
        onFeetPerCellChange={setFeetPerCell}
        onAreaOptionsChange={handleAreaOptionsChange}
        canUndo={erasable.length > 0}
        onPaintModeChange={setPaintMode}
        onDrawColorChange={setDrawColor}
        onDrawWidthChange={setDrawWidth}
        onUndoDrawing={handleUndoDrawing}
      />
    ),
  };

  const objectsGroup = {
    id: 'objects',
    label: 'Objects',
    icon: Shapes,
    content: (
      <MapObjectsPanel
        busy={busy}
        layer={role.isGm ? activeLayer : 'tokens'}
        onPlace={(object) => {
          setPaintMode('select');
          handlePlaceObject(object);
        }}
        onPlacementDragStart={(placement) => {
          setPaintMode('select');
          setPlacementDrag(placement);
        }}
        onPlacementDragEnd={() => setPlacementDrag(null)}
      />
    ),
  };

  if (!role.isGm) {
    return [
      {
        id: 'pieces',
        label: 'Pieces',
        icon: Users,
        content: (
          <PlayerPanel
            roster={roster}
            tokens={tokens}
            ownedCharacterIds={role.ownedCharacterIds}
            busy={busy}
            placementDisabled={shownImageForViewport === 'background'}
            onPlaceCharacter={handlePlaceCharacter}
            onRemoveCharacter={handleRemoveCharacter}
            // A player's marker always says layer 'tokens': the GM layer is not
            // theirs to write to, and the insert policy would refuse it anyway.
            onAddToken={handleAddToken}
            onPlacementDragStart={setPlacementDrag}
            onPlacementDragEnd={() => setPlacementDrag(null)}
          />
        ),
      },
      objectsGroup,
      drawGroup,
      {
        id: 'laser',
        label: 'Laser',
        icon: Pointer,
        onActivate: () => setPaintMode('laser'),
        content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
      },
      {
        id: 'ruler',
        label: 'Measure',
        icon: Ruler,
        onActivate: () => setPaintMode('measure'),
        content: (
          <MeasurePanel
            paintMode={paintMode}
            measureShape={measureShape}
            feetPerCell={feetPerCell}
            gridShape={scene.grid.shape}
            measureUnit={scene.grid.measureUnit}
            milesPerCell={scene.grid.milesPerCell}
            onPaintModeChange={setPaintMode}
            onShapeChange={setMeasureShape}
            onFeetPerCellChange={setFeetPerCell}
          />
        ),
      },
    ];
  }

  return [
    {
      id: 'pieces',
      label: 'Pieces',
      icon: Users,
      content: (
        <RosterPanel
          roster={roster}
          tokens={tokens}
          busy={busy}
          placementDisabled={shownImageForViewport === 'background'}
          activeLayer={activeLayer}
          onPlaceCharacter={handlePlaceCharacter}
          onRemoveCharacter={handleRemoveCharacter}
          onAddToken={handleAddToken}
          onImportEncounter={() => setImportOpen(true)}
          onPlaceMonster={() => setMonsterOpen(true)}
          onPlacementDragStart={setPlacementDrag}
          onPlacementDragEnd={() => setPlacementDrag(null)}
        />
      ),
    },
    objectsGroup,
    drawGroup,
    {
      id: 'laser',
      label: 'Laser',
      icon: Pointer,
      onActivate: () => setPaintMode('laser'),
      content: <LaserPanel paintMode={paintMode} onPaintModeChange={setPaintMode} />,
    },
    {
      id: 'ruler',
      label: 'Measure',
      icon: Ruler,
      onActivate: () => setPaintMode('measure'),
      content: (
        <MeasurePanel
          paintMode={paintMode}
          measureShape={measureShape}
          feetPerCell={feetPerCell}
          gridShape={scene.grid.shape}
          measureUnit={scene.grid.measureUnit}
          milesPerCell={scene.grid.milesPerCell}
          onPaintModeChange={setPaintMode}
          onShapeChange={setMeasureShape}
          onFeetPerCellChange={setFeetPerCell}
          // The scale of the map is the GM's to set: it travels with the
          // scene, so a player switching it would be switching everyone's
          // ruler.
          onMeasureUnitChange={(unit) => handleGridChange({ ...scene.grid, measureUnit: unit })}
          onMilesPerCellChange={(miles) => handleGridChange({ ...scene.grid, milesPerCell: miles })}
        />
      ),
    },
    {
      id: 'dungeon',
      label: 'Dungeon',
      icon: DoorOpen,
      content: (
        <DungeonPanel
          dungeonKey={dungeon.key}
          fights={dungeon.fights}
          busy={dungeon.busy}
          error={dungeon.error}
          linkHint={dungeon.linkHint}
          title={scene.name}
          partySize={Math.max(1, roster.length || 4)}
          onRoll={dungeon.roll}
          onClear={dungeon.clear}
          monstersForRoom={dungeon.monstersForRoom}
          markersForRoom={dungeon.markersForRoom}
          onPlacementDragStart={setPlacementDrag}
          onPlacementDragEnd={() => setPlacementDrag(null)}
        />
      ),
    },
    {
      id: 'fog',
      label: 'Fog',
      icon: Cloud,
      onActivate: scene.fog ? () => setPaintMode('reveal') : undefined,
      content: (
        <FogPanel
          scene={scene}
          busy={busy}
          paintMode={paintMode}
          brushSize={brushSize}
          onEnableFog={handleEnableFog}
          onPaintModeChange={setPaintMode}
          onBrushSizeChange={setBrushSize}
          onFogAll={handleFogAll}
        />
      ),
    },
  ];
}

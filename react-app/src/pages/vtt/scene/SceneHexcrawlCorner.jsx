import HexcrawlCorner from '../hexcrawl/HexcrawlCorner.jsx';

// The hexcrawl corner fed from the scene's hexcrawl hook. The hex colour is part
// of the grid, so changing it is a grid change.
export default function SceneHexcrawlCorner({
  hexcrawl, grid, onGridChange, open, onOpenChange,
}) {
  return (
    <HexcrawlCorner
      open={open}
      onOpenChange={onOpenChange}
      board={hexcrawl.board}
      clock={hexcrawl.clock}
      clockLinked={hexcrawl.clockLinked}
      defaults={hexcrawl.defaults}
      armed={hexcrawl.armed}
      busy={hexcrawl.busy}
      error={hexcrawl.error}
      lastHex={hexcrawl.lastHex}
      hasResult={hexcrawl.hasResult}
      onOpenResult={hexcrawl.openResult}
      hexColor={grid.hexColor}
      onHexColorChange={(hexColor) => onGridChange({ ...grid, hexColor })}
      onDefaultsChange={hexcrawl.setDefaults}
      onSeasonChange={hexcrawl.setSeason}
      onClockChange={hexcrawl.setClock}
      onClockAdvance={hexcrawl.advanceClock}
      onArmedChange={hexcrawl.setArmed}
    />
  );
}

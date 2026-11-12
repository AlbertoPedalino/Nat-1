import { terrainOption } from '../../../shared/hexcrawl/hexEntry.js';

// How a hex the party walked into is named everywhere on the map (the bubble
// over it, the result dialog's title, the corner's "Last hex visited"):
// "Hex 2, -1 · Forest (4h)". The hours are what the leg actually cost
// (`travelHours`, weather and mount included), the terrain's own only when that
// was not recorded. Without a hex it is only "Hex".
export function hexLabel(hex, travelHours) {
  const where = hex ? `Hex ${hex.q}, ${hex.r}` : 'Hex';
  const terrain = terrainOption(hex?.terrain);
  return terrain ? `${where} · ${terrain.label} (${travelHours ?? terrain.hours}h)` : where;
}

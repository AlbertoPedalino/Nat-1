import { fetchJsonOnce } from '../../../shared/fetchJsonOnce.js';

// The game-icons.net catalog as map objects, fetched the way Lucide's dynamic
// icons are: the list of names when the objects panel opens, each drawing when
// it is first shown. Both come from public/game-icons, written at dev/build
// time by scripts/build-game-icons.mjs, and each is fetched once per page
// (fetchJsonOnce).
const BASE = `${import.meta.env?.BASE_URL || '/'}game-icons/`;

// Every drawing's name (`treasure-map`), sorted.
export function loadGameDrawingNames() {
  return fetchJsonOnce(`${BASE}index.json`).then((index) => index.names);
}

// One drawing: its viewBox and the paths it is filled with.
export function loadGameDrawing(name) {
  return fetchJsonOnce(`${BASE}${name}.json`);
}

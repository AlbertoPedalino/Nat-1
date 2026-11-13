// The game-icons.net catalog as map objects, fetched the way Lucide's dynamic
// icons are: the list of names when the objects panel opens, each drawing when
// it is first shown. Both come from public/game-icons, written at dev/build
// time by scripts/build-game-icons.mjs. Each is fetched once per page; a failed
// fetch is forgotten, so the next showing tries again.
const BASE = `${import.meta.env?.BASE_URL || '/'}game-icons/`;
const loaded = new Map();

function fetchOnce(file, read) {
  if (!loaded.has(file)) {
    const request = fetch(`${BASE}${file}`)
      .then((response) => {
        if (!response.ok) throw new Error(`${file}: ${response.status}`);
        return response.json();
      })
      .then(read)
      .catch((error) => {
        loaded.delete(file);
        throw error;
      });
    loaded.set(file, request);
  }
  return loaded.get(file);
}

// Every drawing's name (`treasure-map`), sorted.
export function loadGameDrawingNames() {
  return fetchOnce('index.json', (index) => index.names);
}

// One drawing: its viewBox and the paths it is filled with.
export function loadGameDrawing(name) {
  return fetchOnce(`${name}.json`, (drawing) => drawing);
}

import { rememberPromise } from './rememberPromise.js';

// A JSON file fetched at most once per page and shared by every reader, tried
// again after a failure (rememberPromise). The 5etools data
// (content/gameData.js) and the map's game drawings
// (pages/vtt/objects/gameDrawings.js) load through here.
const cache = new Map();

export function fetchJsonOnce(url) {
  return rememberPromise(cache, url, async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  });
}

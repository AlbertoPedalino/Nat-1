// A file the app ships in public/ (a picture, the game icons' drawings), at
// the address the app is served from (Vite's BASE_URL: /Nat-1/ on the site,
// / where no base is set, as in tests). The one place that address is read.
const BASE = import.meta.env?.BASE_URL || '/';

export function publicAsset(path) {
  return `${BASE}${path}`;
}

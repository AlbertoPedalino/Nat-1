const EXACT_TITLES = Object.freeze({
  '/': 'Home',
  '/charbuilder': 'Character Builder',
  '/charsheet': 'Character Sheet',
  '/gmboard': 'GM Board',
  '/dm-screen': 'DM Screen',
  '/encounter-builder': 'Encounter Builder',
  '/campaigns': 'Campaigns',
  '/campaign-sheet': 'Campaign Sheet',
});

const LIBRARY_TITLES = Object.freeze({
  characters: 'Character Sheets',
  gmboard: 'GM Boards',
  encounters: 'Encounter Builders',
  dmscreen: 'DM Screens',
});

export function pageTitleForPath(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (EXACT_TITLES[path]) return EXACT_TITLES[path];
  if (path.startsWith('/library/')) {
    const slug = path.slice('/library/'.length).split('/')[0];
    return LIBRARY_TITLES[slug] || 'Library';
  }
  return 'Page Not Found';
}

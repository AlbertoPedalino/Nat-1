import AppPage from '../../app/navigation/AppPage.jsx';
import { CompendiumFrame } from './CompendiumHome.jsx';
import { useCompendium } from './data/loadCompendium.js';

// Spells, items, monsters and rules of the supported manuals, in one search,
// and links to the manuals on 5etools. The page is the window's height, its
// lists scrolling inside.
export default function CompendiumPage() {
  const compendium = useCompendium();
  return (
    <AppPage fill dense maxWidth="none" topBar={{ home: true, compendium: false }}>
      <CompendiumFrame compendium={compendium} layout="page" autoFocus sx={{ height: '100%' }} />
    </AppPage>
  );
}

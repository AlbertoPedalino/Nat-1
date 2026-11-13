import { lazy, Suspense, useState } from 'react';
import TopBarButton from '../../shared/ui/TopBarButton.jsx';
import { GAME_ICONS } from '../../shared/ui/gameIcons.js';

// Loaded on first opening: the button is in every top bar, and most pages
// never open the compendium.
const CompendiumPanel = lazy(() => import('./CompendiumPanel.jsx'));

// The compendium from any top bar: opens and closes the side panel.
export default function CompendiumButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TopBarButton
        icon={GAME_ICONS.reference}
        label="Compendium"
        active={open}
        aria-pressed={open}
        onClick={() => setOpen((value) => !value)}
      />
      {open ? (
        <Suspense fallback={null}>
          <CompendiumPanel open onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

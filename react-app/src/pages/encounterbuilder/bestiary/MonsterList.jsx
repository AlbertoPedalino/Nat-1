import { useCallback } from 'react';
import Panel from '../../../shared/ui/Panel.jsx';
import MonsterBrowser from '../../../shared/bestiary/MonsterBrowser.jsx';
import { encounterPanel } from '../state/EncounterBuilderContext.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// Thin wrapper: the browser itself is shared with the battle map, and only the
// wiring to this page's reducer lives here. Its callbacks are stable, so the
// (memoized) browser is not redrawn when the rest of the page changes.
export default encounterPanel({ state: ['filters'], context: ['dispatch', 'monsterDb'] }, MonsterListView);

function MonsterListView({ state, dispatch, monsterDb }) {
  const onFilterChange = useCallback((key, value) => dispatch({ type: 'setFilter', key, value }), [dispatch]);
  const onToggleSource = useCallback((source) => dispatch({ type: 'toggleSource', source }), [dispatch]);
  const onSelect = useCallback((monster) => dispatch({ type: 'selectStatblock', payload: { monster } }), [dispatch]);
  const onPick = useCallback((monster) => dispatch({ type: 'addMonster', monster }), [dispatch]);

  return (
    <Panel icon={GAME_ICONS.monster} title="Monsters" fill>
      <MonsterBrowser
        monsterDb={monsterDb}
        filters={state.filters}
        onFilterChange={onFilterChange}
        onToggleSource={onToggleSource}
        onSelect={onSelect}
        onPick={onPick}
        pickLabel="Add to encounter"
        fill
      />
    </Panel>
  );
}

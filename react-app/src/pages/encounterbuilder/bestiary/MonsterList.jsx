import { Skull } from 'lucide-react';
import Panel from '../../../shared/ui/Panel.jsx';
import MonsterBrowser from '../../../shared/bestiary/MonsterBrowser.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

// Thin wrapper: the browser itself is shared with the battle map, and only the
// wiring to this page's reducer lives here.
export default function MonsterList() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();

  return (
    <Panel icon={Skull} title="Monsters" fill>
      <MonsterBrowser
        monsterDb={monsterDb}
        filters={state.filters}
        onFilterChange={(key, value) => dispatch({ type: 'setFilter', key, value })}
        onToggleSource={(source) => dispatch({ type: 'toggleSource', source })}
        onSelect={(monster) => dispatch({ type: 'selectStatblock', payload: { monster } })}
        onPick={(monster) => dispatch({ type: 'addMonster', monster })}
        pickLabel="Add to encounter"
        fill
      />
    </Panel>
  );
}

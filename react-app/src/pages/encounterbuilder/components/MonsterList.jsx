import { Paper } from '@mui/material';
import MonsterBrowser from './MonsterBrowser.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

// Thin wrapper: the browser itself is shared with the battle map, and only the
// wiring to this page's reducer lives here.
export default function MonsterList() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();

  return (
    <Paper sx={panelSx}>
      <MonsterBrowser
        monsterDb={monsterDb}
        filters={state.filters}
        onFilterChange={(key, value) => dispatch({ type: 'setFilter', key, value })}
        onToggleSource={(source) => dispatch({ type: 'toggleSource', source })}
        onSelect={(monster) => dispatch({ type: 'selectStatblock', payload: { monster } })}
        onPick={(monster) => dispatch({ type: 'addMonster', monster })}
        pickLabel="Add to encounter"
      />
    </Paper>
  );
}

const panelSx = {
  p: 2,
  bgcolor: 'background.paper',
};

import { TextField } from '@mui/material';
import BuilderPanel from './BuilderPanel.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

export default function NamePanel({ character, dispatch }) {
  return (
    <BuilderPanel title="Character Name" icon={GAME_ICONS.characterName}>
      <TextField
        fullWidth
        value={character.name}
        placeholder="E.g. Aldric the Grey"
        onChange={(event) => dispatch({ type: 'field/set', field: 'name', value: event.target.value })}
      />
    </BuilderPanel>
  );
}

import { TextField } from '@mui/material';
import { Sparkles } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';

export default function NamePanel({ character, dispatch }) {
  return (
    <BuilderPanel title="Character Name" icon={Sparkles}>
      <TextField
        fullWidth
        value={character.name}
        placeholder="E.g. Aldric the Grey"
        onChange={(event) => dispatch({ type: 'field/set', field: 'name', value: event.target.value })}
      />
    </BuilderPanel>
  );
}

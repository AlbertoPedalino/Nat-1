import { LinearProgress, Stack, TextField } from '@mui/material';
import { Layers } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { getXpProgress } from '../logic/calculations.js';

function normalizeXpInput(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+(?=\d)/, '') || '0';
}

export default function XpPanel({ character, dispatch }) {
  const progress = getXpProgress(character.xp, character.level);
  return (
    <BuilderPanel id="panel-xp" title="Experience (XP)" icon={Layers} note={`${progress}% toward level 2 threshold`}>
      <Stack spacing={1.25}>
        <LinearProgress variant="determinate" value={progress} />
        <TextField
          type="text"
          value={String(character.xp ?? 0)}
          slotProps={{ input: { inputMode: 'numeric' } }}
          placeholder="Total XP"
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => dispatch({ type: 'xp/set', value: Number(normalizeXpInput(event.target.value)) })}
        />
      </Stack>
    </BuilderPanel>
  );
}

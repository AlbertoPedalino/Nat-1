import { Button, Divider, Stack } from '@mui/material';
import { Dices, Trash2 } from 'lucide-react';
import { confirmAction } from '../../../shared/ui/confirmAction.js';

// The end of a generator's panel (Dungeon, Quest): a rule, then Generate and
// Clear. Clear asks first (`clearMessage`) and is off while there is nothing
// to clear.
export default function GenerateActions({
  canGenerate, onGenerate, hasResult, clearMessage, onClear,
}) {
  const clear = () => {
    if (confirmAction(clearMessage)) onClear();
  };
  return (
    <>
      <Divider />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" startIcon={<Dices size={15} />} disabled={!canGenerate} onClick={onGenerate}>
          Generate
        </Button>
        <Button variant="outlined" color="error" startIcon={<Trash2 size={15} />} disabled={!hasResult} onClick={clear}>
          Clear
        </Button>
      </Stack>
    </>
  );
}

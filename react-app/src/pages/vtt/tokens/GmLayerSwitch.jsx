import { Stack } from '@mui/material';
import ToggleRow from '../../../shared/ui/ToggleRow.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

// Whether the pieces about to be placed land on the GM layer, out of the
// party's sight, with what that means said under it. The same switch in every
// dialog pieces are placed from (an encounter's, a single creature's), so the
// GM reads the same promise in both. `checked` is the GM layer; `onChange`
// gets the new state.
export default function GmLayerSwitch({ checked, onChange }) {
  return (
    <Stack spacing={0.25}>
      <ToggleRow label="Place on the GM layer" checked={checked} onChange={onChange} />
      <Caption>
        {checked
          ? 'The party will not receive these pieces until you move them to the token layer.'
          : 'The party sees these pieces as soon as they land.'}
      </Caption>
    </Stack>
  );
}

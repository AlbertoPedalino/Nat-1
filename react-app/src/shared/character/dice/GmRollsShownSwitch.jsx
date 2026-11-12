import { useGmRollsShown } from '../../cloud/sync/rollVisibility.js';
import Caption from '../../ui/Caption.jsx';
import ToggleRow from '../../ui/ToggleRow.jsx';

// Whether the players see the creatures' rolls — and the GM's own custom
// rolls with them — for a campaign (rollVisibility.js): the same switch
// wherever the GM rolls: the encounter builder, a creature's stat
// block and the dice on the map. Without a campaign there is no table to show
// rolls to, and it says so.
export default function GmRollsShownSwitch({ campaignId, sx }) {
  const [shown, setShown] = useGmRollsShown(campaignId);
  if (!campaignId) {
    return <Caption sx={{ ...sx }}>No campaign: rolls stay on this screen.</Caption>;
  }
  return (
    <ToggleRow
      label={shown ? 'Players see creature rolls' : 'Only the GM sees creature rolls'}
      checked={shown}
      onChange={setShown}
      sx={sx}
    />
  );
}

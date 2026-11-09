import { Radio } from 'lucide-react';
import StatePanel from '../../../shared/ui/StatePanel.jsx';

// What a player sees when there is no map on the table. They never get a scene
// list: the GM decides what is up, and this screen waits for it.
export default function SessionGate({ loading }) {
  return (
    <StatePanel loading={loading} icon={Radio} title={loading ? 'Looking for the table…' : 'No map on the table'}>
      {loading ? null : 'Your GM has not put a map up yet. This page will open it by itself as soon as they do.'}
    </StatePanel>
  );
}

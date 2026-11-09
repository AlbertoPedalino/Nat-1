import ToolPageShell from '../../app/navigation/ToolPageShell.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import NoteBoard from './notes/NoteBoard.jsx';
import { DmScreenProvider } from './state/DmScreenContext.jsx';

export default function DmScreenPage() {
  const tool = useToolInstance('dmscreen');
  if (!tool.ready) return <CloudInstanceLoading label="DM Screen" />;

  return (
    <DmScreenProvider key={`${tool.id}:${tool.revision}`} instanceId={tool.id}>
      <DmScreenShell tool={tool} />
    </DmScreenProvider>
  );
}

function DmScreenShell({ tool }) {
  // The note board's grid must not push the page sideways while a note is
  // being dragged past the edge.
  return (
    <ToolPageShell
      tool={tool}
      sectionKey="dmscreen"
      title="DM Screen"
      backTo="/library/dmscreen"
      backLabel="DM Screens"
      sx={{ overflowX: 'hidden' }}
    >
      <NoteBoard />
    </ToolPageShell>
  );
}

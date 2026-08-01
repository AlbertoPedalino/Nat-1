import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import AppTopBar from '../../components/AppTopBar.jsx';
import NotFoundPage from '../notfound/NotFoundPage.jsx';
import { resolveTool, formatUpdatedAt } from './logic/tools.js';
import { readRegistry, renameRegistryEntry, deleteRegistryEntry } from '../../shared/localStorageRegistries.js';
import InstanceRow from './components/InstanceRow.jsx';
import CharacterPicker from './CharacterPicker.jsx';
import * as s from './styles.js';

export default function InstancePickerPage() {
  const { tool } = useParams();
  const meta = resolveTool(tool);

  if (!meta) return <NotFoundPage />;

  return (
    <Box sx={s.rootSx}>
      <AppTopBar home />
      <Box sx={s.headerSx}>
        <Box sx={{ color: meta.color, display: 'flex' }}>
          <meta.icon size={30} strokeWidth={1.5} />
        </Box>
        <Typography sx={s.titleSx}>{meta.label}</Typography>
        <Button component={Link} to={meta.newRoute} variant="contained" startIcon={<Plus size={16} />} sx={s.newBtnSx}>
          New {meta.label}
        </Button>
      </Box>

      {meta.slug === 'characters' ? <CharacterPicker /> : <GenericInstanceList meta={meta} />}
    </Box>
  );
}

function GenericInstanceList({ meta }) {
  // Lazy initialiser: the registry read is synchronous localStorage, so
  // seeding via a mount effect would flash the empty state for one commit.
  const [entries, setEntries] = useState(() => readRegistry(meta.registryKey));

  const refresh = useCallback(() => {
    setEntries(readRegistry(meta.registryKey));
  }, [meta.registryKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleRename = (id) => {
    if (renameRegistryEntry(meta.registryKey, id)) refresh();
  };

  const handleDelete = (id) => {
    if (deleteRegistryEntry(meta.registryKey, id)) refresh();
  };

  if (!entries.length) {
    return (
      <Box sx={s.emptyBoxSx}>
        <Typography sx={s.emptyTextSx}>No saved {meta.label.toLowerCase()} sessions yet.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={s.listSx}>
      {entries.map((entry) => (
        <InstanceRow
          key={entry.id}
          name={entry.name || entry.id}
          updatedAtLabel={formatUpdatedAt(entry.updatedAt)}
          to={meta.route(entry.id)}
          onRename={() => handleRename(entry.id)}
          onDelete={() => handleDelete(entry.id)}
        />
      ))}
    </Box>
  );
}

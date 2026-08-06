import { useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowLeft, Castle, Home, Landmark, Map as MapIcon, Mountain, Trees, Upload,
} from 'lucide-react';
import {
  GENERATORS, GENERATOR_CREDIT, isMapImage, orderForFloors, sceneNamesFor,
} from '../logic/generators.js';

const GENERATOR_ICONS = {
  dungeon: Castle,
  cave: Mountain,
  dwelling: Home,
  village: Trees,
  city: Landmark,
  realm: MapIcon,
};

// Starting a scene: empty, or from a generated map.
//
// The generator runs in the dialog, which is as close as two origins get: its
// canvas is not ours to read, and its own export writes a file to the GM's
// disk. So the last step is theirs — export, then hand the file back — and the
// dialog does everything on either side of it. A building exported floor by
// floor comes back as several files and becomes several scenes, because a
// storey is a map you walk onto, not a layer of one.
export default function NewSceneDialog({ open, campaignId, onClose, onCreate, onImport }) {
  const [generator, setGenerator] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const filesRef = useRef(null);

  const close = () => {
    if (progress) return;
    setGenerator(null);
    setProgress(null);
    setError('');
    onClose();
  };

  const handleFiles = async (picked) => {
    const files = [...(picked || [])].filter(isMapImage);
    if (!files.length) {
      setError('None of those look like map images. Export the map as PNG or SVG first.');
      return;
    }
    const ordered = generator.floors ? orderForFloors(files) : files;
    const names = sceneNamesFor(generator, ordered);
    setError('');
    setProgress({ done: 0, total: ordered.length });
    try {
      const created = await onImport(campaignId, ordered.map((file, index) => ({
        file, name: names[index],
      })), (done) => setProgress({ done, total: ordered.length }));
      setProgress(null);
      if (created?.length) close();
    } catch (cause) {
      setProgress(null);
      setError(cause?.message || 'Could not create the scenes.');
    }
  };

  const Icon = generator ? GENERATOR_ICONS[generator.id] || MapIcon : null;

  return (
    <Dialog open={open} onClose={close} maxWidth={generator ? 'lg' : 'sm'} fullWidth>
      <DialogTitle sx={titleSx}>
        {generator ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<ArrowLeft size={14} />}
              disabled={Boolean(progress)}
              onClick={() => { setGenerator(null); setError(''); }}
            >
              Back
            </Button>
            <Icon size={16} />
            <span>{generator.label}</span>
          </Stack>
        ) : 'New scene'}
      </DialogTitle>

      <DialogContent dividers>
        {!generator ? (
          <Stack spacing={1.25}>
            <Box component="button" type="button" onClick={() => onCreate(campaignId)} sx={freshSx}>
              <Typography sx={cardTitleSx}>Fresh scene</Typography>
              <Typography sx={cardBlurbSx}>
                An empty board. Upload your own picture, or draw on the grid.
              </Typography>
            </Box>

            <Typography sx={sectionSx}>Or generate one</Typography>
            <Box sx={gridSx}>
              {GENERATORS.map((option) => {
                const OptionIcon = GENERATOR_ICONS[option.id] || MapIcon;
                return (
                  <Box
                    key={option.id}
                    component="button"
                    type="button"
                    onClick={() => setGenerator(option)}
                    sx={cardSx}
                  >
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <OptionIcon size={15} />
                      <Typography sx={cardTitleSx}>{option.label}</Typography>
                    </Stack>
                    <Typography sx={cardBlurbSx}>{option.blurb}</Typography>
                  </Box>
                );
              })}
            </Box>

            <Typography sx={creditSx}>
              Generators by{' '}
              <Link href={GENERATOR_CREDIT.url} target="_blank" rel="noreferrer">
                {GENERATOR_CREDIT.label}
              </Link>
              . Their maps are free to use, this one included.
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography sx={stepsSx}>
              Roll a map you like, export it as PNG{generator.floors ? ' — one file per floor' : ''},
              then bring the file{generator.floors ? 's' : ''} back here.
            </Typography>

            <Box component="iframe" src={generator.url} title={`${generator.label} generator`} sx={frameSx} />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Upload size={15} />}
                disabled={Boolean(progress)}
                onClick={() => filesRef.current?.click()}
              >
                {generator.floors ? 'Add the exported floors' : 'Add the exported map'}
              </Button>
              <Link href={generator.url} target="_blank" rel="noreferrer" sx={openSx}>
                Open it in a tab instead
              </Link>
              {progress ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={14} />
                  <Typography sx={stepsSx}>
                    Creating scene {progress.done + 1} of {progress.total}…
                  </Typography>
                </Stack>
              ) : null}
            </Stack>

            {progress ? (
              <LinearProgress
                variant="determinate"
                value={(progress.done / Math.max(1, progress.total)) * 100}
              />
            ) : null}

            {generator.floors ? (
              <Typography sx={stepsSx}>
                Several files become several scenes, ordered by the numbers in their names.
              </Typography>
            ) : null}

            <Box
              ref={filesRef}
              component="input"
              type="file"
              accept="image/*"
              multiple={generator.floors}
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = '';
              }}
              sx={{ display: 'none' }}
            />
          </Stack>
        )}

        {error ? <Typography sx={errorSx}>{error}</Typography> : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={close} disabled={Boolean(progress)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

const titleSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.95rem' };

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1,
};

const cardSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.35,
  p: 1.1,
  textAlign: 'left',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
  '&:hover': { borderColor: 'primary.main' },
};

const freshSx = { ...cardSx, borderColor: 'primary.main' };

const cardTitleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.82rem',
  color: 'primary.main',
};

const cardBlurbSx = { fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.4 };

const sectionSx = {
  fontSize: '0.68rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

const creditSx = { fontSize: '0.7rem', color: 'text.secondary' };

const stepsSx = { fontSize: '0.75rem', color: 'text.secondary' };

const openSx = { fontSize: '0.72rem' };

const frameSx = {
  width: '100%',
  height: { xs: '52vh', md: '60vh' },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: '#fff',
};

const errorSx = { mt: 1, fontSize: '0.75rem', color: 'error.main' };

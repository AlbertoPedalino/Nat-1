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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowLeft, Castle, Columns2, Home, Landmark, Layers, Map as MapIcon, Mountain, Trees, Upload,
} from 'lucide-react';
import { VTT_COLORS } from '../../../shared/vtt/colors.js';
import {
  GENERATORS, GENERATOR_CREDIT, isMapImage, joinedSceneName, orderForFloors, sceneNamesFor,
} from '../logic/generators.js';
import { stitchImages } from '../logic/stitch.js';

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
  // What several pictures mean: a scene each, or one board with all of them on
  // it. Asked before the files arrive, because it decides what the button says.
  const [mode, setMode] = useState('scenes');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const filesRef = useRef(null);

  const close = () => {
    if (progress) return;
    setGenerator(null);
    setMode('scenes');
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
    const ordered = orderForFloors(files);
    const joining = mode === 'joined' && ordered.length > 1;
    setError('');
    setProgress({ done: 0, total: joining ? 1 : ordered.length });
    try {
      // Joined, the floors are drawn side by side into one picture here and go
      // up as a single map: the scene has no idea it was ever several files.
      const entries = joining
        ? [{
          file: await stitchImages(ordered, { name: `${generator.id}-floors.png` }),
          name: joinedSceneName(generator, ordered.length),
        }]
        : ordered.map((file, index) => ({ file, name: sceneNamesFor(generator, ordered)[index] }));

      const created = await onImport(
        campaignId,
        entries,
        (done) => setProgress({ done, total: entries.length }),
      );
      setProgress(null);
      // Every file failing is reported by the importer as a warning, which is a
      // toast the dialog is sitting on top of: say it here too, and stay open so
      // the same files can be tried again.
      if (created?.length) close();
      else setError('None of those could be imported. The scenes were not created.');
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

            {/* Several pictures are two different things, and which one is a
                decision about the table rather than about the files: a stair
                you point at, or a scene you switch to. */}
            <ToggleButtonGroup
              size="small"
              exclusive
              value={mode}
              disabled={Boolean(progress)}
              onChange={(_, value) => value && setMode(value)}
              aria-label="What several pictures make"
            >
              <ToggleButton value="scenes" aria-label="A scene each">
                <Layers size={14} />
                <Box component="span" sx={pillSx}>A scene each</Box>
              </ToggleButton>
              <ToggleButton value="joined" aria-label="One map, side by side">
                <Columns2 size={14} />
                <Box component="span" sx={pillSx}>One map, side by side</Box>
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Upload size={15} />}
                disabled={Boolean(progress)}
                onClick={() => filesRef.current?.click()}
              >
                {generator.floors ? 'Add the exported floors' : 'Add the exported maps'}
              </Button>
              <Link href={generator.url} target="_blank" rel="noreferrer" sx={openSx}>
                Open it in a tab instead
              </Link>
              {progress ? (
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <CircularProgress size={14} />
                  <Typography sx={stepsSx}>
                    {/* Clamped: the last file reports itself done, and "3 of 2"
                        is a progress line that has stopped making sense. */}
                    Creating scene {Math.min(progress.done + 1, progress.total)} of {progress.total}…
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

            <Typography sx={stepsSx}>
              {mode === 'joined'
                ? 'Several pictures are drawn onto one board, left to right, in the order their names number them.'
                : 'Several pictures become several scenes, in the order their names number them.'}
            </Typography>

            <Box
              ref={filesRef}
              component="input"
              type="file"
              accept="image/*"
              multiple
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

const pillSx = {
  ml: 0.5,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.6rem',
  letterSpacing: '0.04em',
};

const frameSx = {
  width: '100%',
  height: { xs: '52vh', md: '60vh' },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: VTT_COLORS.white,
};

const errorSx = { mt: 1, fontSize: '0.75rem', color: 'error.main' };


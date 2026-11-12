import { useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
} from './generators.js';
import { stitchImages } from './stitch.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { pillLabelSx } from './panelStyles.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CARD_SX } from '../../../shared/ui/interactive.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { ErrorLine } from '../../../shared/ui/LoadStatus.jsx';

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
      setError(failureMessage('Could not create the scenes.', cause));
    }
  };

  const Icon = generator ? GENERATOR_ICONS[generator.id] || MapIcon : null;

  return (
    <SheetDialog
      open={open}
      onClose={close}
      maxWidth={generator ? 'lg' : 'sm'}
      title={generator ? generator.label : 'New scene'}
      icon={generator ? <Icon size={ICON_SIZES.md} /> : <MapIcon size={ICON_SIZES.md} />}
      headerRight={generator ? (
        <Button
          size="small"
          startIcon={<ArrowLeft size={ICON_SIZES.sm} />}
          disabled={Boolean(progress)}
          onClick={() => { setGenerator(null); setError(''); }}
        >
          Back
        </Button>
      ) : null}
      actions={<Button onClick={close} disabled={Boolean(progress)}>Close</Button>}
    >
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
                    <OptionIcon size={ICON_SIZES.sm} />
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
              <Layers size={ICON_SIZES.sm} />
              <Box component="span" sx={pillLabelSx}>A scene each</Box>
            </ToggleButton>
            <ToggleButton value="joined" aria-label="One map, side by side">
              <Columns2 size={ICON_SIZES.sm} />
              <Box component="span" sx={pillLabelSx}>One map, side by side</Box>
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<Upload size={ICON_SIZES.sm} />}
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

      {error ? <ErrorLine sx={{ mt: 1 }}>{error}</ErrorLine> : null}
    </SheetDialog>
  );
}

const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 1,
};

const cardSx = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0.25,
  p: 1,
  textAlign: 'left',
  ...CARD_SX,
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

const freshSx = { ...cardSx, borderColor: 'primary.main' };

const cardTitleSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.xl,
  color: 'primary.main',
};

const cardBlurbSx = { fontSize: FONT_SIZES.lg, color: 'text.secondary', lineHeight: LINE_HEIGHTS.normal };

const sectionSx = captionLabelSx;

const creditSx = { fontSize: FONT_SIZES.md, color: 'text.secondary' };

const stepsSx = { fontSize: FONT_SIZES.lg, color: 'text.secondary' };

const openSx = { fontSize: FONT_SIZES.md };

const frameSx = {
  width: '100%',
  height: { xs: '52vh', md: '60vh' },
  border: '2px solid',
  borderColor: UI_COLORS.edge,
  borderRadius: 1,
  bgcolor: VTT_COLORS.white,
};



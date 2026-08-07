import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { vi } from 'vitest';
import { theme } from '../../../theme.js';
import NewSceneDialog from './NewSceneDialog.jsx';
import { stitchImages } from '../logic/stitch.js';

// jsdom has no canvas to draw floors onto, and the drawing is not what this
// file is about: the layout maths has its own tests next to it.
vi.mock('../logic/stitch.js', () => ({ stitchImages: vi.fn() }));


const renderDialog = (props = {}) => render(
  <ThemeProvider theme={theme}>
    <NewSceneDialog
      open
      campaignId="camp-1"
      onClose={() => {}}
      onCreate={() => {}}
      onImport={async () => []}
      {...props}
    />
  </ThemeProvider>,
);

const pngFile = (name) => new File(['x'], name, { type: 'image/png' });

// The dialog is a portal, so it is not under the render container: everything
// is looked up inside the dialog itself.
const inDialog = (selector) => screen.getByRole('dialog').querySelector(selector);

test('a new scene is a choice: an empty board, or one of the generators', () => {
  const onCreate = vi.fn();
  renderDialog({ onCreate });

  fireEvent.click(screen.getByText('Fresh scene'));
  expect(onCreate).toHaveBeenCalledWith('camp-1');
  // The generators are offered by what they answer, not by their own names.
  expect(screen.getByText('Dungeon')).toBeInTheDocument();
  expect(screen.getByText('Realm')).toBeInTheDocument();
  // Their maps are free to use, and the dialog says whose they are anyway.
  expect(screen.getByRole('link', { name: /procgen arcana/i })).toBeInTheDocument();
});

// The generator's canvas belongs to another origin and its export writes to
// disk, so the file comes back by hand — the dialog only has to be ready for it.
test('picking a generator opens it, and the exported file becomes a scene', async () => {
  const onImport = vi.fn(async () => [{ id: 'scene-1', name: 'Dungeon' }]);
  const onClose = vi.fn();
  renderDialog({ onImport, onClose });

  fireEvent.click(screen.getByText('Dungeon'));
  const frame = inDialog('iframe');
  expect(frame.getAttribute('src')).toBe('https://watabou.github.io/one-page-dungeon/');

  fireEvent.change(inDialog('input[type="file"]'), {
    target: { files: [pngFile('dungeon-1143801683.png')] },
  });

  await waitFor(() => expect(onImport).toHaveBeenCalled());
  const [campaignId, entries] = onImport.mock.calls[0];
  expect(campaignId).toBe('camp-1');
  expect(entries).toHaveLength(1);
  expect(entries[0].name).toBe('Dungeon');
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

// A storey is a map you walk onto, not a layer of one.
test('a building exported floor by floor becomes a scene per floor, in order', async () => {
  const onImport = vi.fn(async () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  renderDialog({ onImport });

  fireEvent.click(screen.getByText('Dwelling'));
  const input = inDialog('input[type="file"]');
  expect(input.multiple).toBe(true);

  fireEvent.change(input, {
    target: { files: [pngFile('house-2.png'), pngFile('house-10.png'), pngFile('house-1.png')] },
  });

  await waitFor(() => expect(onImport).toHaveBeenCalled());
  const entries = onImport.mock.calls[0][1];
  expect(entries.map((entry) => entry.name)).toEqual([
    'Dwelling — Floor 1', 'Dwelling — Floor 2', 'Dwelling — Floor 3',
  ]);
  expect(entries.map((entry) => entry.file.name)).toEqual([
    'house-1.png', 'house-2.png', 'house-10.png',
  ]);
});

// Two storeys are sometimes two boards and sometimes one board with a stair you
// can point at. Joined, the floors are drawn together before anything is
// uploaded, so the scene never knows it was several files.
test('floors can be joined into a single map instead of a scene each', async () => {
  const onImport = vi.fn(async () => [{ id: 'a', name: 'Dwelling — 3 floors' }]);
  const joined = new File(['joined'], 'dwelling-floors.png', { type: 'image/png' });
  stitchImages.mockResolvedValueOnce(joined);
  renderDialog({ onImport });

  fireEvent.click(screen.getByText('Dwelling'));
  fireEvent.click(screen.getByRole('button', { name: 'One map, side by side' }));
  fireEvent.change(inDialog('input[type="file"]'), {
    target: { files: [pngFile('house-2.png'), pngFile('house-1.png')] },
  });

  await waitFor(() => expect(onImport).toHaveBeenCalled());
  // Ordered before they are drawn, so the ground floor is on the left.
  expect(stitchImages.mock.calls[0][0].map((file) => file.name)).toEqual([
    'house-1.png', 'house-2.png',
  ]);
  const entries = onImport.mock.calls[0][1];
  expect(entries).toHaveLength(1);
  expect(entries[0].file).toBe(joined);
  expect(entries[0].name).toBe('Dwelling — 2 floors');
});

test('a drop with no picture in it is refused rather than half-imported', async () => {
  const onImport = vi.fn();
  renderDialog({ onImport });

  fireEvent.click(screen.getByText('Dungeon'));
  fireEvent.change(inDialog('input[type="file"]'), {
    target: { files: [new File(['{}'], 'dungeon.json', { type: 'application/json' })] },
  });

  expect(await screen.findByText(/none of those look like map images/i)).toBeInTheDocument();
  expect(onImport).not.toHaveBeenCalled();
});

// The importer reports a per-file failure as a toast, which the dialog is
// sitting on top of, so it says it here too rather than looking like it worked.
test('an import that creates nothing keeps the dialog open and says so', async () => {
  const onClose = vi.fn();
  renderDialog({ onImport: async () => [], onClose });

  fireEvent.click(screen.getByText('Dungeon'));
  fireEvent.change(inDialog('input[type="file"]'), {
    target: { files: [pngFile('dungeon.png')] },
  });

  expect(await screen.findByText(/none of those could be imported/i)).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test('a failed import says so and leaves the dialog open to try again', async () => {
  const onImport = vi.fn(async () => { throw new Error('Storage said no.'); });
  const onClose = vi.fn();
  renderDialog({ onImport, onClose });

  fireEvent.click(screen.getByText('Cave'));
  fireEvent.change(inDialog('input[type="file"]'), {
    target: { files: [pngFile('cave.png')] },
  });

  expect(await screen.findByText('Storage said no.')).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test('the generator can be left for the map it was picked from', () => {
  renderDialog();
  fireEvent.click(screen.getByText('Village'));
  expect(screen.getByRole('link', { name: /open it in a tab instead/i }))
    .toHaveAttribute('href', 'https://watabou.github.io/village-generator/');

  fireEvent.click(screen.getByRole('button', { name: /back/i }));
  expect(within(screen.getByRole('dialog')).getByText('Fresh scene')).toBeInTheDocument();
});

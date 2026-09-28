import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import SectionPicker from '../../../../src/pages/library/SectionPicker.jsx';
import { createInstance, getInstance } from '../../../../src/shared/instances/instanceStore.js';
import { SECTION_REGISTRY } from '../../../../src/shared/instances/sectionRegistry.js';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  cloudRows: [],
  renameCloudInstance: vi.fn(),
  deleteInstance: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../../../src/shared/cloud/auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));
vi.mock('../../../../src/shared/instances/instanceSync.js', async (importOriginal) => {
  const actual = await importOriginal();
  const { listInstances } = await import('../../../../src/shared/instances/instanceStore.js');
  return {
    ...actual,
    listToolInstances: async (sectionKey) => ({
      rows: actual.mergeInstanceRows(sectionKey, mocks.cloudRows, listInstances(sectionKey)),
      error: null,
    }),
    renameCloudInstance: mocks.renameCloudInstance,
    deleteInstance: mocks.deleteInstance,
  };
});
vi.mock('../../../../src/pages/library/components/InstanceRow.jsx', () => ({
  default: ({ name, onOpen, onRename, onDelete }) => (
    <div>
      <button type="button" onClick={onOpen}>{name}</button>
      <button type="button" aria-label={`Rename ${name}`} onClick={onRename}>Rename</button>
      <button type="button" aria-label={`Delete ${name}`} onClick={onDelete}>Delete</button>
    </div>
  ),
}));

const meta = { sectionKey: 'gmboard', label: 'GM Board', route: SECTION_REGISTRY.gmboard.route };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.cloudRows = [];
  mocks.deleteInstance.mockResolvedValue();
});

test('opening a row only navigates: the tool page opens it like any link', async () => {
  createInstance('gmboard', { id: 'local-board', name: 'Local Board' });
  render(<SectionPicker meta={meta} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Local Board' }));
  expect(mocks.navigate).toHaveBeenCalledWith('/gmboard?board=local-board');
});

test('a local row is renamed locally (synced later); a cloud-only row in the cloud', async () => {
  createInstance('gmboard', { id: 'local-board', name: 'Local Board', nameDirty: false });
  mocks.cloudRows = [{ id: 'cloud-board', name: 'Cloud Board', updated_at: '2026-08-01T00:00:00.000Z' }];
  const prompt = vi.spyOn(window, 'prompt')
    .mockReturnValueOnce('Renamed Local')
    .mockReturnValueOnce('Renamed Cloud');
  render(<SectionPicker meta={meta} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Rename Local Board' }));
  await waitFor(() => expect(getInstance('gmboard', 'local-board').name).toBe('Renamed Local'));
  expect(getInstance('gmboard', 'local-board').dirty.name).toBe(true);

  fireEvent.click(await screen.findByRole('button', { name: 'Rename Cloud Board' }));
  await waitFor(() => expect(mocks.renameCloudInstance).toHaveBeenCalledWith('gmboard', 'cloud-board', 'Renamed Cloud'));
  prompt.mockRestore();
});

test('deleting a local row stays local; a cloud row is deleted from the cloud too', async () => {
  createInstance('gmboard', { id: 'local-board', name: 'Local Board' });
  mocks.cloudRows = [{ id: 'cloud-board', name: 'Cloud Board', updated_at: '2026-08-01T00:00:00.000Z' }];
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  render(<SectionPicker meta={meta} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Delete Local Board' }));
  await waitFor(() => expect(mocks.deleteInstance).toHaveBeenCalledWith('gmboard', 'local-board', { cloud: false }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Cloud Board' }));
  await waitFor(() => expect(mocks.deleteInstance).toHaveBeenCalledWith('gmboard', 'cloud-board', { cloud: true }));
  confirm.mockRestore();
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import SectionPicker from './SectionPicker.jsx';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  listInstances: vi.fn(),
  fetchInstanceMeta: vi.fn(),
  pullInstance: vi.fn(),
  renameCloudInstance: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../shared/cloud/AuthProvider.jsx', () => ({
  useAuth: () => ({ cloudEnabled: true, status: 'authed' }),
}));

vi.mock('../../shared/cloud/cloudSections.js', () => ({
  getCloudSection: () => ({
    listInstances: mocks.listInstances,
    fetchInstanceMeta: mocks.fetchInstanceMeta,
    pullInstance: mocks.pullInstance,
    renameCloudInstance: mocks.renameCloudInstance,
    deleteCloudInstance: vi.fn(),
  }),
}));

vi.mock('../../shared/localStorageRegistries.js', async (importOriginal) => ({
  ...await importOriginal(),
  readRegistry: () => [{ id: 'local-board', name: 'Local Board', updatedAt: 1 }],
  cancelPendingRegistryPush: vi.fn(),
  deleteRegistryEntry: vi.fn(),
  renameRegistryEntry: vi.fn(),
}));

vi.mock('./components/InstanceRow.jsx', () => ({
  default: ({ name, onOpen, onRename }) => (
    <div>
      <button type="button" onClick={onOpen}>{name}</button>
      {onRename ? <button type="button" aria-label={`Rename ${name}`} onClick={onRename}>Rename</button> : null}
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listInstances.mockResolvedValue([]);
});

test('authenticated open checks cloud freshness for a local-origin row', async () => {
  mocks.fetchInstanceMeta.mockResolvedValue({ updated_at: '2026-08-01T00:00:00.000Z' });
  mocks.pullInstance.mockResolvedValue();
  const meta = {
    sectionKey: 'boards',
    registryKey: 'gb_board_registry',
    label: 'GM Board',
    route: (id) => `/gmboard?board=${id}`,
  };

  render(<SectionPicker meta={meta} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Local Board' }));

  await waitFor(() => expect(mocks.fetchInstanceMeta).toHaveBeenCalledWith('local-board'));
  expect(mocks.pullInstance).toHaveBeenCalledWith('local-board');
  expect(mocks.navigate).toHaveBeenCalledWith('/gmboard?board=local-board');
});

test('cloud-origin rows can be renamed without requiring a local copy', async () => {
  mocks.listInstances.mockResolvedValue([{
    id: 'cloud-board',
    name: 'Cloud Board',
    updated_at: '2026-08-01T00:00:00.000Z',
  }]);
  const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Renamed Cloud Board');
  const meta = {
    sectionKey: 'gmboard',
    registryKey: 'gb_board_registry',
    label: 'GM Board',
    route: (id) => `/gmboard?board=${id}`,
  };

  render(<SectionPicker meta={meta} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Rename Cloud Board' }));

  await waitFor(() => {
    expect(mocks.renameCloudInstance).toHaveBeenCalledWith('cloud-board', 'Renamed Cloud Board');
  });
  prompt.mockRestore();
});

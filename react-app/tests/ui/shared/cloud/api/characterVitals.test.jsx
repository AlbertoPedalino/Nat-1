import { commandCharacterVitals } from '../../../../../src/shared/cloud/api/cloudCharacters.js';

const server = vi.hoisted(() => ({ row: null, rpc: vi.fn(), read: vi.fn() }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: server.read }) }) }),
    rpc: server.rpc,
  }),
}));
vi.mock('../../../../../src/pages/charsheet/state/calculations.js', () => ({ calcMaxHP: (data) => data.baseMax }));
vi.mock('../../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));

beforeEach(() => {
  server.row = { id: 'pc', row_revision: 0, data: { currentHP: 30, tempHP: 5, baseMax: 30 } };
  server.read.mockReset().mockImplementation(async () => ({ data: structuredClone(server.row) }));
  server.rpc.mockReset().mockImplementation(async (_name, args) => {
    server.row = { ...server.row, row_revision: server.row.row_revision + 1, data: { ...server.row.data, ...args.p_patch } };
    return { data: { applied: true, row: structuredClone(server.row) } };
  });
});

test('a conflict recalculates damage on the new row, including temp HP and a changed maximum', async () => {
  server.rpc.mockImplementationOnce(async () => {
    server.row = { id: 'pc', row_revision: 1, data: { currentHP: 17, tempHP: 2, baseMax: 20 } };
    return { data: { applied: false, row: structuredClone(server.row) } };
  });
  const result = await commandCharacterVitals('pc', { type: 'modifyHp', delta: -5 });
  expect(result.data).toMatchObject({ currentHP: 14, tempHP: 0 });
  expect(server.rpc).toHaveBeenCalledTimes(2);
  const args = server.rpc.mock.calls.map((call) => call[1]);
  expect(args[0].p_operation).toBe(args[1].p_operation);
  expect(args[1].p_revision).toBe(1);
});

test('a lost acknowledgement retries the same operation ID and publishes the committed row', async () => {
  server.rpc.mockRejectedValueOnce(new Error('Lost response'));
  const received = vi.fn();
  window.addEventListener('gb:character-row', received);
  try {
    const result = await commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 });
    expect(result.data.currentHP).toBe(27);
    expect(server.rpc.mock.calls[0][1]).toEqual(server.rpc.mock.calls[1][1]);
    expect(received.mock.calls[0][0].detail).toEqual(result);
  } finally { window.removeEventListener('gb:character-row', received); }
});

test('rapid clicks are serialized without dropping damage', async () => {
  const a = commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 });
  const b = commandCharacterVitals('pc', { type: 'modifyHp', delta: -4 });
  await Promise.all([a, b]);
  expect(server.row.data.currentHP).toBe(23);
  expect(server.rpc.mock.calls[0][1].p_operation).not.toBe(server.rpc.mock.calls[1][1].p_operation);
});

test('a failed command does not block the next command and never falls back to a blob write', async () => {
  server.rpc.mockRejectedValueOnce(new Error('Offline')).mockRejectedValueOnce(new Error('Offline'));
  await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 })).rejects.toThrow('Offline');
  const result = await commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 });
  expect(result.data.currentHP).toBe(27);
});

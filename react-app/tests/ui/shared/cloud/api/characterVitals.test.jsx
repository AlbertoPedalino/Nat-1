import {
  commandCharacterVitals, HEALTH_CONFLICT, HEALTH_TIMEOUT,
} from '../../../../../src/shared/cloud/api/cloudCharacters.js';

const server = vi.hoisted(() => ({ row: null, rpc: vi.fn(), read: vi.fn() }));
vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: server.read }) }) }),
    rpc: server.rpc,
  }),
}));
vi.mock('../../../../../src/pages/charsheet/state/calculations.js', () => ({ calcMaxHP: (data) => data.baseMax }));
vi.mock('../../../../../src/pages/charsheet/state/sheetRuntimeAdapters.js', () => ({ ensureSheetRuntimeAdapters: async () => {} }));

const published = vi.fn();
const onRow = (event) => published(event.detail);

beforeEach(() => {
  server.row = { id: 'pc', row_revision: 0, data: { currentHP: 30, tempHP: 5, baseMax: 30 } };
  server.read.mockReset().mockImplementation(async () => ({ data: structuredClone(server.row) }));
  server.rpc.mockReset().mockImplementation(async (_name, args) => {
    if (args.p_revision !== server.row.row_revision) {
      return { data: { applied: false, row: structuredClone(server.row) } };
    }
    server.row = { ...server.row, row_revision: server.row.row_revision + 1, data: { ...server.row.data, ...args.p_patch } };
    return { data: { applied: true, row: structuredClone(server.row) } };
  });
  published.mockReset();
  window.addEventListener('gb:character-row', onRow);
});

afterEach(() => window.removeEventListener('gb:character-row', onRow));

test('a normal update commits once against the known revision and publishes the committed row', async () => {
  const result = await commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 });
  expect(result).toMatchObject({ row_revision: 1, data: { currentHP: 27, tempHP: 0 } });
  expect(server.rpc).toHaveBeenCalledTimes(1);
  expect(server.rpc.mock.calls[0][1]).toEqual({ p_id: 'pc', p_revision: 0, p_patch: expect.any(Object) });
  expect(published).toHaveBeenCalledWith(result);
});

test('a revision conflict is not reapplied: the current row is published and the command stops', async () => {
  server.read.mockImplementationOnce(async () => ({ data: structuredClone(server.row) }));
  // Another client commits between our read and our RPC.
  server.rpc.mockImplementationOnce(async () => {
    server.row = { id: 'pc', row_revision: 1, data: { currentHP: 17, tempHP: 2, baseMax: 20 } };
    return { data: { applied: false, row: structuredClone(server.row) } };
  });
  await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -5 }))
    .rejects.toMatchObject({ code: HEALTH_CONFLICT });
  expect(server.rpc).toHaveBeenCalledTimes(1);
  // The conflict already carries the authoritative row: no extra recovery read.
  expect(server.read).toHaveBeenCalledTimes(1);
  expect(published).toHaveBeenCalledTimes(1);
  expect(published.mock.calls[0][0]).toMatchObject({ row_revision: 1, data: { currentHP: 17 } });
  expect(server.row.data.currentHP).toBe(17);
});

test('a timeout sends nothing again: one read of the server realigns and the command stops', async () => {
  server.rpc.mockImplementationOnce(() => new Promise(() => {}));
  await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { timeoutMs: 20 }))
    .rejects.toMatchObject({ code: HEALTH_TIMEOUT });
  expect(server.rpc).toHaveBeenCalledTimes(1);
  expect(server.read).toHaveBeenCalledTimes(2);
  expect(published).toHaveBeenCalledTimes(1);
  expect(published.mock.calls[0][0]).toMatchObject({ row_revision: 0, data: { currentHP: 30 } });
});

test('a failed RPC is not retried and falls back to reading the authoritative row', async () => {
  server.rpc.mockRejectedValueOnce(new Error('Offline'));
  await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 })).rejects.toThrow('Offline');
  expect(server.rpc).toHaveBeenCalledTimes(1);
  expect(server.read).toHaveBeenCalledTimes(2);
  expect(published).toHaveBeenCalledWith(expect.objectContaining({ row_revision: 0 }));
});

test('a hung command does not block the next one for this character', async () => {
  server.rpc.mockImplementationOnce(() => new Promise(() => {}));
  const first = commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { timeoutMs: 20 });
  const second = commandCharacterVitals('pc', { type: 'modifyHp', delta: -4 }, { timeoutMs: 1_000 });
  await expect(first).rejects.toMatchObject({ code: HEALTH_TIMEOUT });
  // Temporary HP absorbs the 4 damage; the hung first command never committed.
  await expect(second).resolves.toMatchObject({ row_revision: 1, data: { currentHP: 30, tempHP: 1 } });
});

test('rapid clicks in one tab are serialized without dropping damage', async () => {
  await Promise.all([
    commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }),
    commandCharacterVitals('pc', { type: 'modifyHp', delta: -4 }),
  ]);
  expect(server.row.data.currentHP).toBe(23);
  expect(server.rpc).toHaveBeenCalledTimes(2);
});

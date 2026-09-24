import {
  commandCharacterVitals, healthCommandStats, HEALTH_CONFLICT, HEALTH_TIMEOUT,
} from '../../../../../src/shared/cloud/api/cloudCharacters.js';
import { toCharacterDigest } from '../../../../../src/shared/campaign/characterDigest.js';
import { CHARACTER_RECHECK_EVENT, CHARACTER_VITALS_EVENT } from '../../../../../src/shared/cloud/sync/characterEvents.js';

// A database that behaves like commit_character_vitals: an absolute patch is
// applied only against the current digest revision and max-HP basis, and the
// answer is vitals only.
const server = vi.hoisted(() => ({
  data: null, revision: 0, basis: 'h1', exists: true, reads: [], rpc: vi.fn(), digests: vi.fn(), baseMax: vi.fn(),
}));
const VITAL_KEYS = ['currentHP', 'tempHP', 'maxHPBonus', 'deathSaves', 'activeConditions'];
const vitalsOf = (data) => Object.fromEntries(VITAL_KEYS.filter((key) => key in data).map((key) => [key, data[key]]));
const answer = (applied) => ({
  applied, characterId: 'pc', vitals: structuredClone(vitalsOf(server.data)), digestRevision: server.revision, hpBasis: server.basis,
});
const digestRow = () => ({
  character_id: 'pc', campaign_id: 'camp', owner: 'owner', row_revision: server.revision,
  digest: { name: 'Fighter', ...structuredClone(vitalsOf(server.data)), hpBasis: server.basis },
});
// What a follower holds: the digest as it is now.
const held = () => toCharacterDigest(digestRow());
const base = (baseMax = 30, hpBasis = server.basis) => ({ hpBasis, baseMax });

vi.mock('../../../../../src/shared/cloud/supabaseClient.js', () => ({
  requireClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'owner', user_metadata: {} } }, error: null }) },
    rpc: server.rpc,
    from: (table) => ({
      select: (columns) => ({
        eq: () => {
          server.reads.push({ table, columns });
          const row = server.exists ? { id: 'pc', owner: 'owner', row_revision: 7, data: structuredClone(server.data) } : null;
          return {
            single: async () => (row ? { data: row } : { data: null, error: { code: 'PGRST116' } }),
            maybeSingle: async () => ({ data: row }),
          };
        },
      }),
      upsert: async (row) => {
        server.reads.push({ table, upsert: true });
        server.exists = true;
        server.data = structuredClone(row.data);
        return { error: null };
      },
    }),
  }),
}));
vi.mock('../../../../../src/shared/cloud/api/characterDigests.js', async (original) => ({
  ...await original(),
  listCharacterDigests: (...args) => server.digests(...args),
}));
vi.mock('../../../../../src/shared/campaign/characterVitals.js', () => ({
  readBaseMaxHp: (...args) => server.baseMax(...args),
}));

let start = 0;
const vitalsEvents = vi.fn();
const recheckEvents = vi.fn();
const onVitals = (event) => vitalsEvents(event.detail);
const onRecheck = (event) => recheckEvents(event.detail);
const characterReads = () => server.reads.filter((read) => read.table === 'characters' && !read.upsert);

beforeEach(() => {
  server.data = { currentHP: 30, tempHP: 5, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [], notes: 'long notes' };
  // Revisions only grow, as in the database (this tab remembers its last answers).
  server.revision += 100;
  start = server.revision;
  server.basis = 'h1';
  server.exists = true;
  server.reads = [];
  server.digests.mockReset().mockImplementation(async () => (server.exists ? [held()] : []));
  server.baseMax.mockReset().mockImplementation(async (rows) => new Map(rows.map((row) => [row.id, 30])));
  server.rpc.mockReset().mockImplementation(async (_name, args) => {
    if (args.p_digest_revision !== server.revision || args.p_hp_basis !== server.basis) return { data: answer(false) };
    const before = JSON.stringify(vitalsOf(server.data));
    server.data = { ...server.data, ...args.p_patch };
    if (JSON.stringify(vitalsOf(server.data)) !== before) server.revision += 1;
    return { data: answer(true) };
  });
  vitalsEvents.mockReset();
  recheckEvents.mockReset();
  window.addEventListener(CHARACTER_VITALS_EVENT, onVitals);
  window.addEventListener(CHARACTER_RECHECK_EVENT, onRecheck);
});
afterEach(() => {
  window.removeEventListener(CHARACTER_VITALS_EVENT, onVitals);
  window.removeEventListener(CHARACTER_RECHECK_EVENT, onRecheck);
});

describe('normal path: digest + base max in hand', () => {
  test('no read before the commit; the answer is vitals only and is published as vitals', async () => {
    const stats = healthCommandStats();
    const result = await commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { digest: held(), base: base() });
    expect(server.reads).toEqual([]);
    expect(server.digests).not.toHaveBeenCalled();
    expect(server.baseMax).not.toHaveBeenCalled();
    expect(server.rpc).toHaveBeenCalledOnce();
    expect(server.rpc.mock.calls[0][1]).toEqual({
      p_id: 'pc', p_digest_revision: start, p_hp_basis: 'h1',
      p_patch: { currentHP: 27, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [] },
    });
    expect(result).toEqual({
      applied: true, characterId: 'pc', digestRevision: start + 1, hpBasis: 'h1',
      vitals: { currentHP: 27, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [] },
    });
    expect(JSON.stringify(result)).not.toContain('long notes');
    expect(vitalsEvents).toHaveBeenCalledWith(result);
    expect(healthCommandStats()).toEqual({ digest: stats.digest + 1, legacy: stats.legacy });
  });

  test('the heal is clamped by the base max the caller derived plus the synced bonus', async () => {
    server.data.currentHP = 10;
    server.data.maxHPBonus = 4;
    await commandCharacterVitals('pc', { type: 'modifyHp', delta: 50 }, { digest: held(), base: base(20) });
    expect(server.data.currentHP).toBe(24);
  });

  test('two damages from one stale digest: the second is recomputed once from the refusal, both count', async () => {
    const stale = held();
    // Another device commits 10 damage (temp HP absorbs 5 of it).
    server.data = { ...server.data, currentHP: 25, tempHP: 0 };
    server.revision += 1;
    await commandCharacterVitals('pc', { type: 'modifyHp', delta: -3 }, { digest: stale, base: base() });
    expect(server.data.currentHP).toBe(22);
    expect(server.rpc).toHaveBeenCalledTimes(2);
    expect(server.rpc.mock.calls[1][1].p_digest_revision).toBe(start + 1);
    expect(characterReads()).toEqual([]);
  });

  test('an absolute command is never replayed over someone else\'s change', async () => {
    const stale = held();
    server.data.currentHP = 12;
    server.revision += 5; // another client moved HP meanwhile
    await expect(commandCharacterVitals('pc', { type: 'setHp', value: 25 }, { digest: stale, base: base() }))
      .rejects.toMatchObject({ code: HEALTH_CONFLICT });
    expect(server.rpc).toHaveBeenCalledOnce();
    expect(server.data.currentHP).toBe(12);
    // The refusal realigns every view in this tab with no extra read.
    expect(vitalsEvents).toHaveBeenCalledWith(expect.objectContaining({ applied: false, digestRevision: start + 5, vitals: expect.objectContaining({ currentHP: 12 }) }));
    expect(characterReads()).toEqual([]);
    expect(recheckEvents).not.toHaveBeenCalled();
  });

  test('a relative command is not replayed when the max-HP basis moved', async () => {
    const stale = held();
    server.basis = 'h2';
    server.revision += 1;
    await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: 5 }, { digest: stale, base: base(30, 'h1') }))
      .rejects.toMatchObject({ code: HEALTH_CONFLICT });
    expect(server.rpc).toHaveBeenCalledOnce();
  });

  test('rapid clicks in one tab start from the previous answer, not from the digest they were clicked with', async () => {
    const digest = held();
    await Promise.all([
      commandCharacterVitals('pc', { type: 'setHp', value: 20 }, { digest, base: base() }),
      commandCharacterVitals('pc', { type: 'setTempHp', value: 2 }, { digest, base: base() }),
    ]);
    expect(server.data).toMatchObject({ currentHP: 20, tempHP: 2 });
    expect(server.rpc).toHaveBeenCalledTimes(2);
  });
});

describe('failures are never resent', () => {
  test('a timeout sends nothing again and asks followers to recheck, with no sheet read', async () => {
    server.rpc.mockImplementationOnce(() => new Promise(() => {}));
    await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { digest: held(), base: base(), timeoutMs: 20 }))
      .rejects.toMatchObject({ code: HEALTH_TIMEOUT });
    expect(server.rpc).toHaveBeenCalledOnce();
    expect(recheckEvents).toHaveBeenCalledWith({ characterId: 'pc' });
    expect(server.reads).toEqual([]);
  });

  test('a failed RPC is not retried', async () => {
    server.rpc.mockRejectedValueOnce(new Error('Offline'));
    await expect(commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { digest: held(), base: base() })).rejects.toThrow('Offline');
    expect(server.rpc).toHaveBeenCalledOnce();
    expect(recheckEvents).toHaveBeenCalledWith({ characterId: 'pc' });
    expect(server.reads).toEqual([]);
  });

  test('a hung command does not block the next one for this character', async () => {
    server.rpc.mockImplementationOnce(() => new Promise(() => {}));
    const first = commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 }, { digest: held(), base: base(), timeoutMs: 20 });
    const second = commandCharacterVitals('pc', { type: 'modifyHp', delta: -4 }, { digest: held(), base: base(), timeoutMs: 1_000 });
    await expect(first).rejects.toMatchObject({ code: HEALTH_TIMEOUT });
    // Temporary HP absorbs the 4 damage; the hung first command never committed.
    await expect(second).resolves.toMatchObject({ applied: true, vitals: { currentHP: 30, tempHP: 1 } });
  });
});

describe('the rare legacy path', () => {
  test.each([
    ['no digest', () => ({ digest: null, base: base() })],
    ['no base max', () => ({ digest: held(), base: null })],
    ['a base max still being derived', () => ({ digest: held(), base: { hpBasis: 'h1', baseMax: null } })],
    ['a base max of another basis', () => ({ digest: held(), base: base(99, 'old') })],
  ])('%s: reads the digest, then the sheet, and derives the maximum itself', async (_label, context) => {
    const stats = healthCommandStats();
    server.data.currentHP = 10;
    await commandCharacterVitals('pc', { type: 'modifyHp', delta: 50 }, context());
    expect(server.digests).toHaveBeenCalledOnce();
    expect(characterReads()).toHaveLength(1);
    expect(server.baseMax).toHaveBeenCalledOnce();
    expect(server.data.currentHP).toBe(30); // clamped by the derived 30, never by a stale 99
    expect(healthCommandStats()).toEqual({ digest: stats.digest, legacy: stats.legacy + 1 });
  });

  test('a long rest without its exhaustion level needs the sheet', async () => {
    const stats = healthCommandStats();
    await commandCharacterVitals('pc', { type: 'longRest' }, { digest: held(), base: base() });
    expect(characterReads()).toHaveLength(1);
    expect(healthCommandStats().legacy).toBe(stats.legacy + 1);
  });

  test('the first command on a sheet never uploaded inserts it, then commands it once', async () => {
    const { saveCharacter } = await import('../../../../../src/shared/character/profile/store.js');
    saveCharacter('pc', { name: 'Fighter', currentHP: 30, tempHP: 0 }, { emit: false });
    server.exists = false;
    await commandCharacterVitals('pc', { type: 'modifyHp', delta: -8 });
    expect(server.reads.some((read) => read.upsert)).toBe(true);
    expect(server.rpc).toHaveBeenCalledOnce();
    expect(server.data.currentHP).toBe(22);
  });
});

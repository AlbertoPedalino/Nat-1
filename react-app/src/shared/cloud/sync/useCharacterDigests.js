import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { openRealtimeChannel } from '../realtimeChannel.js';
import {
  listCharacterDigestRevisions, listCharacterDigests, readCharacterSheets, safeCharacterIds,
} from '../api/characterDigests.js';
import { readBaseMaxHp } from '../../campaign/characterVitals.js';
import { digestFromVitalsAnswer, isNewerDigest, toCharacterDigest } from '../../campaign/characterDigest.js';
import { CHARACTER_RECHECK_EVENT, CHARACTER_VITALS_EVENT } from './characterEvents.js';
import { listenForRecovery } from './recoveryTriggers.js';
import { diffRevisions, readChanged } from './revisionDiff.js';

const EMPTY = new Map();

// The digests held after a recovery read. A fetched digest replaces the held
// one unless that is newer. Without a `diff` the read was the whole scope, so
// a held digest it lacks has left; with one, only those the diff found gone,
// or named and did not get back in scope (moved or deleted meanwhile).
function mergeRecovered(held, fetched, diff, inScope) {
  const incoming = new Map(fetched.filter(inScope).map((digest) => [digest.characterId, digest]));
  const leaving = diff
    ? [...diff.removed, ...diff.changed.filter((id) => !incoming.has(id))]
    : [...held.keys()].filter((id) => !incoming.has(id));
  let next = held;
  const edit = () => {
    if (next === held) next = new Map(held);
    return next;
  };
  for (const id of leaving) if (next.has(id)) edit().delete(id);
  for (const [id, digest] of incoming) if (isNewerDigest(digest, next.get(id))) edit().set(id, digest);
  return next;
}

// Character digests (16_character_digests.sql) for everyone who needs to know
// about sheets without reading them: the battle map roster and the encounter
// builder. One channel, whatever the number of characters:
//   - `campaignId`: every sheet of a campaign (characters may join or leave);
//   - `characterIds`: exactly these sheets, from any campaign.
//
// Returns the digests and, per character, the base max HP derived for the
// digest's `hpBasis`. A full sheet is read only when that basis is new; a
// digest that only moved hit points or conditions costs a few hundred bytes.
//
// Recovery reads versions first, like every synced list: ids and revisions,
// then only the digests that moved (one full read while nothing is held yet).
// It runs on SUBSCRIBED (first join and every reconnect), a failed command of
// this tab, and the shared recovery triggers (back online, back to the tab,
// every RECOVERY_INTERVAL_MS while shown): a projector or a second screen
// nobody comes back to is repaired too.
//
// `deriveMaxHp: false` is for a consumer that already holds the sheet (an
// editable CharacterSheet derives its own maximum): no sheet is ever read.
export function useCharacterDigests({ campaignId = null, characterIds = null, enabled = true, deriveMaxHp = true } = {}) {
  const { cloudActive } = useAuth();
  const idsKey = campaignId ? '' : safeCharacterIds(characterIds).join(',');
  const scope = useMemo(() => {
    if (campaignId) return { key: `campaign:${campaignId}`, campaignId, characterIds: null };
    if (idsKey) return { key: `ids:${idsKey}`, campaignId: null, characterIds: idsKey.split(',') };
    return null;
  }, [campaignId, idsKey]);
  const active = Boolean(enabled && scope && cloudActive && supabase);

  const [digests, setDigests] = useState(EMPTY);
  const [baseMax, setBaseMax] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const digestsRef = useRef(digests);
  digestsRef.current = digests;
  const baseMaxRef = useRef(baseMax);
  baseMaxRef.current = baseMax;
  const scopeRef = useRef(null);
  scopeRef.current = active ? scope : null;
  const readRef = useRef(0);
  // hpBasis currently being derived, per character, so a burst of digests
  // with the same basis asks for the sheet once.
  const derivingRef = useRef(new Map());
  const deriveRef = useRef(deriveMaxHp);
  deriveRef.current = deriveMaxHp;

  const inScope = useCallback((digest, target = scopeRef.current) => {
    if (!digest || !target) return false;
    if (target.campaignId) return digest.campaignId === target.campaignId;
    return target.characterIds.includes(digest.characterId);
  }, []);

  const upsert = useCallback((digest) => {
    setDigests((current) => {
      const held = current.get(digest.characterId);
      if (!inScope(digest)) {
        if (!held) return current;
        // Moved to another campaign: it leaves this roster.
        const next = new Map(current);
        next.delete(digest.characterId);
        return next;
      }
      if (!isNewerDigest(digest, held)) return current;
      const next = new Map(current);
      next.set(digest.characterId, digest);
      return next;
    });
  }, [inScope]);

  const remove = useCallback((characterId) => {
    setDigests((current) => {
      if (!current.has(characterId)) return current;
      const next = new Map(current);
      next.delete(characterId);
      return next;
    });
  }, []);

  // Derive the base max HP for every digest whose basis is new. Only these
  // sheets are read, and only once per basis: a sheet the rules cannot read is
  // remembered as such until its basis moves, never re-read on every recovery.
  // A network failure is forgotten, so the next reconcile or digest retries it.
  const deriveMissing = useCallback((list) => {
    const target = scopeRef.current;
    if (!target || !deriveRef.current) return;
    const wanted = [];
    for (const digest of list) {
      if (!digest?.hpBasis) continue;
      if (baseMaxRef.current.get(digest.characterId)?.hpBasis === digest.hpBasis) continue;
      if (derivingRef.current.get(digest.characterId) === digest.hpBasis) continue;
      derivingRef.current.set(digest.characterId, digest.hpBasis);
      wanted.push(digest);
    }
    if (!wanted.length) return;
    const settle = (digest) => {
      if (derivingRef.current.get(digest.characterId) === digest.hpBasis) {
        derivingRef.current.delete(digest.characterId);
      }
    };
    readCharacterSheets(wanted.map((digest) => digest.characterId))
      .then(readBaseMaxHp)
      .then((derived) => {
        wanted.forEach(settle);
        if (scopeRef.current !== target) return;
        setBaseMax((current) => {
          const next = new Map(current);
          for (const digest of wanted) {
            next.set(digest.characterId, { hpBasis: digest.hpBasis, baseMax: derived.get(digest.characterId) ?? null });
          }
          return next;
        });
      })
      .catch(() => { wanted.forEach(settle); });
  }, []);

  const reconcile = useCallback(async () => {
    const target = scopeRef.current;
    if (!target) return;
    const request = ++readRef.current;
    const stillWanted = () => request === readRef.current && scopeRef.current === target;
    let fetched;
    let diff = null;
    try {
      if (!digestsRef.current.size) {
        fetched = await listCharacterDigests(target);
      } else {
        const held = new Map([...digestsRef.current].map(([id, digest]) => [id, digest.rowRevision]));
        diff = diffRevisions(await listCharacterDigestRevisions(target), held, (theirs, ours) => theirs > ours);
        if (!stillWanted()) return;
        fetched = await readChanged(diff, {
          fetchAll: () => listCharacterDigests(target),
          fetchSome: (ids) => listCharacterDigests({ characterIds: ids }),
        });
      }
    } catch (_) {
      return; // The next trigger tries again.
    }
    if (!stillWanted()) return;
    const scoped = (digest) => inScope(digest, target);
    setDigests((held) => mergeRecovered(held, fetched, diff, scoped));
    setReady(true);
    // Also retries a maximum whose derivation failed earlier.
    deriveMissing([...mergeRecovered(digestsRef.current, fetched, diff, scoped).values()]);
  }, [deriveMissing, inScope]);

  // Scope changes start from nothing: another campaign's roster must not
  // linger while the new one loads.
  useEffect(() => {
    setDigests(EMPTY);
    setBaseMax(EMPTY);
    setReady(false);
    derivingRef.current.clear();
    readRef.current += 1;
  }, [scope?.key, active]);

  useEffect(() => {
    if (!active) return undefined;
    reconcile();
    const channel = openRealtimeChannel(`gb-character-digests-${scope.key}`, {
      changes: [{
        table: 'character_digests',
        filter: scope.campaignId
          ? `campaign_id=eq.${scope.campaignId}`
          : `character_id=in.(${scope.characterIds.join(',')})`,
        onChange: (payload) => {
          const type = String(payload?.eventType || '').toUpperCase();
          if (type === 'DELETE') {
            const id = payload?.old?.character_id;
            if (id) remove(String(id));
            return;
          }
          const digest = toCharacterDigest(payload?.new);
          if (digest) upsert(digest);
          else reconcile();
        },
      }],
      onStatus: (state) => { if (state === 'SUBSCRIBED') reconcile(); },
    });

    // A health command's answer is here before its digest: show it now.
    const receiveVitals = ({ detail }) => {
      const held = digestsRef.current.get(String(detail?.characterId ?? ''));
      const digest = digestFromVitalsAnswer(detail, held);
      if (digest) upsert(digest);
    };
    // A command of this tab failed or timed out: whether it landed is read
    // from the digests, like any other recovery.
    const recheck = ({ detail }) => {
      const id = String(detail?.characterId ?? '');
      if (scope.campaignId ? digestsRef.current.has(id) : scope.characterIds.includes(id)) reconcile();
    };
    window.addEventListener(CHARACTER_VITALS_EVENT, receiveVitals);
    window.addEventListener(CHARACTER_RECHECK_EVENT, recheck);
    const stopRecovery = listenForRecovery(() => reconcile(), { periodic: true });
    return () => {
      readRef.current += 1;
      window.removeEventListener(CHARACTER_VITALS_EVENT, receiveVitals);
      window.removeEventListener(CHARACTER_RECHECK_EVENT, recheck);
      stopRecovery();
      channel?.close();
    };
  }, [active, reconcile, remove, scope, upsert]);

  useEffect(() => { deriveMissing(digests.values()); }, [deriveMissing, digests]);

  return { digests, baseMax, ready, reconcile };
}

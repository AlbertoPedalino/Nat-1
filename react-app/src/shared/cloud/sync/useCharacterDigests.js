import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { supabase } from '../supabaseClient.js';
import { listCharacterDigests, readCharacterSheets, safeCharacterIds } from '../api/characterDigests.js';
import { readBaseMaxHp } from '../../campaign/characterVitals.js';
import { digestFromVitalsAnswer, isNewerDigest, toCharacterDigest } from '../../campaign/characterDigest.js';
import { CHARACTER_RECHECK_EVENT, CHARACTER_VITALS_EVENT } from './characterEvents.js';
import { coalesceReturns } from './returnGate.js';

const EMPTY = new Map();

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
// Recovery is the same light read everywhere — the digests themselves — on
// SUBSCRIBED (first join and every reconnect), coming back to the tab, going
// online, and a failed command of this tab. Nothing is read on a timer: an
// event Realtime missed is repaired by the next digest of that character (each
// is a whole snapshot) or by the next of these triggers.
//
// `deriveMaxHp: false` is for a consumer that already holds the sheet (an
// editable CharacterSheet derives its own maximum): no sheet is ever read.
export function useCharacterDigests({ campaignId = null, characterIds = null, enabled = true, deriveMaxHp = true } = {}) {
  const { cloudEnabled, status } = useAuth();
  const idsKey = campaignId ? '' : safeCharacterIds(characterIds).join(',');
  const scope = useMemo(() => {
    if (campaignId) return { key: `campaign:${campaignId}`, campaignId, characterIds: null };
    if (idsKey) return { key: `ids:${idsKey}`, campaignId: null, characterIds: idsKey.split(',') };
    return null;
  }, [campaignId, idsKey]);
  const active = Boolean(enabled && scope && cloudEnabled && status === 'authed' && supabase);

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
    let fresh;
    try {
      fresh = await listCharacterDigests(target);
    } catch (_) {
      return; // The next trigger tries again.
    }
    if (request !== readRef.current || scopeRef.current !== target) return;
    setDigests((current) => {
      const incoming = new Map(fresh.filter((digest) => inScope(digest, target)).map((d) => [d.characterId, d]));
      let changed = incoming.size !== current.size;
      const next = new Map();
      for (const [id, digest] of incoming) {
        const held = current.get(id);
        const keep = held && !isNewerDigest(digest, held) ? held : digest;
        if (keep !== held) changed = true;
        next.set(id, keep);
      }
      return changed ? next : current;
    });
    setReady(true);
    // Derive for what is actually held: a newer digest already here wins over
    // the read, and its basis is the one that needs a maximum.
    deriveMissing(fresh.filter((digest) => inScope(digest, target)).map((digest) => {
      const held = digestsRef.current.get(digest.characterId);
      return held && !isNewerDigest(digest, held) ? held : digest;
    }));
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
    let channel;
    try {
      channel = supabase.channel(`gb-character-digests-${scope.key.replace(/[^a-z0-9_,-]/gi, '_').slice(0, 90)}`);
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'character_digests',
        filter: scope.campaignId
          ? `campaign_id=eq.${scope.campaignId}`
          : `character_id=in.(${scope.characterIds.join(',')})`,
      }, (payload) => {
        try {
          const type = String(payload?.eventType || '').toUpperCase();
          if (type === 'DELETE') {
            const id = payload?.old?.character_id;
            if (id) remove(String(id));
            return;
          }
          const digest = toCharacterDigest(payload?.new);
          if (digest) upsert(digest);
          else reconcile();
        } catch (_) {
          // Realtime is opportunistic; the next reconcile repairs.
        }
      });
      channel.subscribe((state) => { if (state === 'SUBSCRIBED') reconcile(); });
    } catch (_) {
      try { if (channel) supabase.removeChannel(channel); } catch (__) {}
      return undefined;
    }

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
    const onReturn = coalesceReturns(() => reconcile());
    const onVisible = () => { if (document.visibilityState === 'visible') onReturn(); };
    const onOnline = () => reconcile();
    window.addEventListener(CHARACTER_VITALS_EVENT, receiveVitals);
    window.addEventListener(CHARACTER_RECHECK_EVENT, recheck);
    window.addEventListener('focus', onReturn);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      readRef.current += 1;
      window.removeEventListener(CHARACTER_VITALS_EVENT, receiveVitals);
      window.removeEventListener(CHARACTER_RECHECK_EVENT, recheck);
      window.removeEventListener('focus', onReturn);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [active, reconcile, remove, scope, upsert]);

  useEffect(() => { deriveMissing(digests.values()); }, [deriveMissing, digests]);

  return { digests, baseMax, ready, reconcile };
}

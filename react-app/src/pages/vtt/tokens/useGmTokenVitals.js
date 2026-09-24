import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../../shared/cloud/supabaseClient.js';
import { listTokenSecretHp } from '../../../shared/cloud/api/vtt.js';
import { listFightRevisions, listFightVitals } from '../../../shared/cloud/api/encounterFights.js';
import { diffRevisions } from '../../../shared/vtt/session/revisionDiff.js';
import { parseSourceRef } from '../../../shared/vtt/tokens/encounterSync.js';
import { withGmTokenVitals } from '../../../shared/vtt/tokens/fightVitals.js';

// The GM's real hit points for the pieces of a scene. Public rows carry HP
// only while a bar is shown, so the GM reads the private sources instead:
// map_token_secrets for standalone pieces and the owning encounter_fights row
// for linked monsters. Both are GM-only under RLS, Realtime included; nothing
// here is ever written back to a piece.
export function useGmTokenVitals({ sceneId, tokens, enabled }) {
  const [byToken, setByToken] = useState({});
  const [fights, setFights] = useState({});
  const requestRef = useRef(0);
  const fightsRef = useRef(fights);
  fightsRef.current = fights;

  const fightKey = useMemo(() => [...new Set((tokens || [])
    .map((token) => parseSourceRef(token?.sourceRef)?.fightId)
    .filter(Boolean))].sort().join(','), [tokens]);

  const reload = useCallback(async () => {
    if (!enabled || !sceneId) return;
    const request = ++requestRef.current;
    const ids = fightKey ? fightKey.split(',') : [];
    const [secretHp, fightRows] = await Promise.all([
      listTokenSecretHp(sceneId).catch(() => null),
      listFightVitals(ids).catch(() => null),
    ]);
    if (request !== requestRef.current) return;
    if (secretHp) setByToken(secretHp);
    if (fightRows) setFights(Object.fromEntries(fightRows.map((row) => [String(row.id), row])));
  }, [enabled, fightKey, sceneId]);

  // The scene's recovery poll. Secret HP is a handful of integers and is read
  // whole; a fight's JSON is fetched only when its updated_at moved. Mount and
  // this channel's own SUBSCRIBED still use the full `reload`.
  const reconcile = useCallback(async () => {
    if (!enabled || !sceneId) return;
    const request = ++requestRef.current;
    const ids = fightKey ? fightKey.split(',') : [];
    const [secretHp, revisions] = await Promise.all([
      listTokenSecretHp(sceneId).catch(() => null),
      listFightRevisions(ids).catch(() => null),
    ]);
    if (request !== requestRef.current) return;
    if (secretHp) setByToken(secretHp);
    if (!revisions) return;
    const diff = diffRevisions(
      revisions.map((row) => ({ id: String(row.id), version: Date.parse(row.updated_at) || 0 })),
      new Map(Object.entries(fightsRef.current).map(([id, row]) => [id, Date.parse(row?.updated_at) || 0])),
    );
    if (diff.clean) return;
    const fresh = diff.changed.length ? await listFightVitals(diff.changed).catch(() => null) : [];
    if (request !== requestRef.current || !fresh) return;
    const byId = new Map(fresh.map((row) => [String(row.id), row]));
    setFights((current) => Object.fromEntries(diff.ids
      .map((id) => [id, byId.get(id) || (diff.changed.includes(id) ? null : current[id])])
      .filter(([, row]) => row)));
  }, [enabled, fightKey, sceneId]);

  useEffect(() => {
    if (!enabled || !sceneId) {
      requestRef.current += 1;
      setByToken({});
      setFights({});
      return undefined;
    }
    reload();
    if (!supabase) return undefined;
    let channel;
    try {
      channel = supabase.channel(`gb-gm-vitals-${sceneId}-${fightKey.replace(/[^a-z0-9_,-]/gi, '_').slice(0, 80)}`);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'map_token_secrets' }, (payload) => {
        const row = payload?.new;
        if (row?.token_id) {
          setByToken((current) => ({
            ...current, [row.token_id]: { hpCurrent: row.hp_current ?? null, hpMax: row.hp_max ?? null },
          }));
        } else if (payload?.old?.token_id) {
          setByToken((current) => {
            const next = { ...current };
            delete next[payload.old.token_id];
            return next;
          });
        }
      });
      if (fightKey) {
        channel.on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'encounter_fights', filter: `id=in.(${fightKey})`,
        }, (payload) => {
          const row = payload?.new;
          if (row?.id) setFights((current) => ({ ...current, [String(row.id)]: row }));
        });
      }
      // A reconnect does not replay missed events: read again.
      channel.subscribe((state) => { if (state === 'SUBSCRIBED') reload(); });
    } catch (_) {
      try { if (channel) supabase.removeChannel(channel); } catch (__) {}
      return undefined;
    }
    return () => {
      requestRef.current += 1;
      try { supabase.removeChannel(channel); } catch (_) {}
    };
  }, [enabled, fightKey, reload, sceneId]);

  // A value this client just saved, shown before its realtime event arrives.
  const setLocal = useCallback((tokenId, vitals) => {
    setByToken((current) => ({ ...current, [tokenId]: vitals }));
  }, []);

  const overlay = useCallback(
    (list) => (enabled ? withGmTokenVitals(list, { byToken, fights }) : list),
    [byToken, enabled, fights],
  );

  return { overlay, reconcile, reload, setLocal };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeVitals, readCampaignVitals } from '../../../shared/campaign/characterVitals.js';
import { toRoster, toRosterEntry } from '../../../shared/campaign/roster.js';
import { listCampaignCharacters } from '../../../shared/cloud/api/campaigns.js';
import {
  listDrawings, listTokenSecrets, listTokens, signMapImage,
} from '../../../shared/cloud/api/vtt.js';
import { toDrawing } from '../../../shared/vtt/map/drawing.js';
import { CHARACTER_ROW_EVENT } from '../../../shared/cloud/sync/characterRows.js';

function attachSecrets(tokens, secrets, held = []) {
  const previous = Object.fromEntries(
    held.filter((token) => token.secretLabel).map((token) => [token.id, token.secretLabel]),
  );
  return tokens.map((token) => {
    const secretLabel = secrets[token.id] || previous[token.id] || '';
    return secretLabel ? { ...token, secretLabel } : token;
  });
}

// Keep inserts, edits and deletions received after a read began, while still
// refreshing untouched rows. Local edits replace objects instead of mutating.
function mergeSnapshot(current, baseline, incoming, protectedIds = new Set()) {
  const before = new Map(baseline.map((item) => [item.id, item]));
  const held = new Map(current.map((item) => [item.id, item]));
  const changed = new Set(protectedIds);
  for (const item of current) {
    if (before.get(item.id) !== item) changed.add(item.id);
  }
  for (const item of baseline) {
    if (!held.has(item.id)) changed.add(item.id);
  }
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [
    ...incoming.flatMap((item) => {
      if (!changed.has(item.id)) return [item];
      return held.has(item.id) ? [held.get(item.id)] : [];
    }),
    ...current.filter((item) => changed.has(item.id) && !incomingIds.has(item.id)),
  ];
}

export function useSceneContent({ scene, isGm, spectator, notify }) {
  const [tokens, setTokens] = useState([]);
  const [roster, setRoster] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [tokenImageUrls, setTokenImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const loadRequestRef = useRef(0);
  const tokenRequestRef = useRef(0);
  const tokensRef = useRef(tokens);
  const drawingsRef = useRef(drawings);
  const tokenMovesRef = useRef(new Map());
  const characterRowsRef = useRef(new Map());
  tokensRef.current = tokens;
  drawingsRef.current = drawings;
  useEffect(() => { characterRowsRef.current.clear(); }, [scene.campaignId]);

  const beginTokenMove = useCallback((ids) => {
    for (const id of ids) tokenMovesRef.current.set(id, (tokenMovesRef.current.get(id) || 0) + 1);
    return () => {
      for (const id of ids) {
        const count = tokenMovesRef.current.get(id) || 0;
        if (count <= 1) tokenMovesRef.current.delete(id);
        else tokenMovesRef.current.set(id, count - 1);
      }
    };
  }, []);

  const loadContent = useCallback(async ({ initial = false } = {}) => {
    const request = ++loadRequestRef.current;
    const tokenRequest = ++tokenRequestRef.current;
    const baselineTokens = tokensRef.current;
    const baselineDrawings = drawingsRef.current;
    const protectedIds = new Set(tokenMovesRef.current.keys());
    if (initial) setLoading(true);
    try {
      const [sceneTokens, characterRows, secrets, sceneDrawings] = await Promise.all([
        listTokens(scene.id),
        scene.campaignId ? listCampaignCharacters(scene.campaignId) : Promise.resolve([]),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
        listDrawings(scene.id),
      ]);
      if (request !== loadRequestRef.current) return;
      if (tokenRequest === tokenRequestRef.current) {
        for (const id of tokenMovesRef.current.keys()) protectedIds.add(id);
        setTokens((current) => mergeSnapshot(
          current, baselineTokens, attachSecrets(sceneTokens, secrets, current), protectedIds,
        ));
      }
      const rows = characterRows.map((row) => {
        const held = characterRowsRef.current.get(row.id);
        if (held && Number(held.row_revision || 0) > Number(row.row_revision || 0)) return held;
        characterRowsRef.current.set(row.id, row);
        return row;
      });
      setDrawings((current) => mergeSnapshot(current, baselineDrawings, sceneDrawings));
      // A reconnect can supersede the initial request. Whichever request wins
      // must release the loading screen; optional vitals do not hold it open.
      setLoading(false);
      try {
        const vitals = await readCampaignVitals(rows);
        if (request === loadRequestRef.current) setRoster((current) => {
          const next = mergeVitals(toRoster(rows), vitals);
          return next.map((entry) => {
            const readRow = rows.find((row) => row.id === entry.characterId);
            return characterRowsRef.current.get(entry.characterId) !== readRow
              ? current.find((item) => item.characterId === entry.characterId) || entry : entry;
          });
        });
      } catch (_) {}
    } catch (cause) {
      if (request === loadRequestRef.current) {
        notify('error', cause?.message || 'Could not load this scene.');
      }
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [isGm, notify, scene.campaignId, scene.id, spectator]);

  useEffect(() => {
    loadContent({ initial: true });
    return () => {
      loadRequestRef.current += 1;
      tokenRequestRef.current += 1;
    };
  }, [loadContent]);

  useEffect(() => {
    let cancelled = false;
    const paths = [...new Set(tokens.map((token) => token.imagePath).filter(Boolean))];
    if (!paths.length) {
      setTokenImageUrls((current) => (Object.keys(current).length ? {} : current));
      return () => { cancelled = true; };
    }
    Promise.all(paths.map(async (path) => [path, await signMapImage(path).catch(() => null)]))
      .then((entries) => { if (!cancelled) setTokenImageUrls(Object.fromEntries(entries)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tokens]);

  const refreshVisibleTokens = useCallback(async () => {
    const request = ++tokenRequestRef.current;
    const baseline = tokensRef.current;
    const protectedIds = new Set(tokenMovesRef.current.keys());
    try {
      const [fresh, secrets] = await Promise.all([
        listTokens(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
      ]);
      if (request !== tokenRequestRef.current) return;
      for (const id of tokenMovesRef.current.keys()) protectedIds.add(id);
      setTokens((current) => mergeSnapshot(
        current, baseline, attachSecrets(fresh, secrets, current), protectedIds,
      ));
    } catch {
      // The row event or the next scene refresh retries without interrupting an
      // active gesture with a transient network toast.
    }
  }, [isGm, scene.id, spectator]);

  const handleDrawingEvent = useCallback((payload) => {
    const type = String(payload?.eventType || '').toUpperCase();
    if (type === 'DELETE') {
      const id = payload?.old?.id || payload?.old_record?.id;
      if (id) setDrawings((current) => current.filter((item) => item.id !== id));
      return;
    }
    const drawing = toDrawing(payload?.new);
    if (!drawing) return;
    setDrawings((current) => (
      current.some((item) => item.id === drawing.id)
        ? current.map((item) => (item.id === drawing.id ? drawing : item))
        : [...current, drawing]
    ));
  }, []);

  const handleCharacterEvent = useCallback((payload) => {
    const row = payload?.new;
    const entry = toRosterEntry(row);
    if (!entry) return;
    const held = characterRowsRef.current.get(row.id);
    if (!held && row.campaign_id !== scene.campaignId) return;
    if (held && Number(held.row_revision || 0) > Number(row.row_revision || 0)) return;
    characterRowsRef.current.set(row.id, row);
    setRoster((current) => {
      if (!current.some((item) => item.characterId === entry.characterId)) {
        return held || row.campaign_id === scene.campaignId ? [...current, entry] : current;
      }
      return current.map((item) => (
        item.characterId === entry.characterId
          ? { ...entry, hpCurrent: item.hpCurrent, hpMax: item.hpMax, tempHp: item.tempHp }
          : item
      ));
    });
    readCampaignVitals([row])
      .then((vitals) => {
        if (characterRowsRef.current.get(row.id) === row) setRoster((current) => mergeVitals(current, vitals));
      })
      .catch(() => {});
  }, [scene.campaignId]);

  useEffect(() => {
    const receive = ({ detail }) => handleCharacterEvent({ new: detail });
    window.addEventListener(CHARACTER_ROW_EVENT, receive);
    return () => window.removeEventListener(CHARACTER_ROW_EVENT, receive);
  }, [handleCharacterEvent]);

  return {
    beginTokenMove,
    drawings,
    handleCharacterEvent,
    handleDrawingEvent,
    loading,
    refreshContent: loadContent,
    refreshVisibleTokens,
    roster,
    setDrawings,
    setRoster,
    setTokens,
    tokenImageUrls,
    tokens,
  };
}

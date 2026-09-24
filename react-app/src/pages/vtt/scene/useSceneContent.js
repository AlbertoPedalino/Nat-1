import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listDrawingIds, listDrawings, listDrawingsByIds, listTokenRevisions, listTokenSecrets,
  listTokens, listTokensByIds, signMapImage,
} from '../../../shared/cloud/api/vtt.js';
import {
  assembleSnapshot, diffRevisions, idsOnly, tooManyToTarget,
} from '../../../shared/vtt/session/revisionDiff.js';
import { toDrawing } from '../../../shared/vtt/map/drawing.js';

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

// The pieces and strokes of one scene. The characters behind the pieces are
// not read here: they come from useCampaignRoster (character digests).
export function useSceneContent({ scene, isGm, spectator, notify }) {
  const [tokens, setTokens] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [tokenImageUrls, setTokenImageUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const loadRequestRef = useRef(0);
  const tokenRequestRef = useRef(0);
  const tokensRef = useRef(tokens);
  const drawingsRef = useRef(drawings);
  const tokenMovesRef = useRef(new Map());
  // Whether a full read has landed for this scene: the light recovery needs
  // something held to compare with.
  const loadedRef = useRef(false);
  tokensRef.current = tokens;
  drawingsRef.current = drawings;

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
      const [sceneTokens, secrets, sceneDrawings] = await Promise.all([
        listTokens(scene.id),
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
      setDrawings((current) => mergeSnapshot(current, baselineDrawings, sceneDrawings));
      loadedRef.current = true;
      // A reconnect can supersede the initial request. Whichever request wins
      // must release the loading screen.
      setLoading(false);
    } catch (cause) {
      if (request === loadRequestRef.current) {
        notify('error', cause?.message || 'Could not load this scene.');
      }
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [isGm, notify, scene.id, spectator]);

  // The recovery poll. Versions first (ids plus updated_at), then only the
  // rows that moved: a quiet table costs a few hundred bytes instead of every
  // stroke and piece again. `fullDrawings` is for a
  // reconnect, where a moved stroke — which has no version to compare — may
  // have been missed.
  const reconcileContent = useCallback(async ({ fullDrawings = false } = {}) => {
    // Nothing held yet to compare against: the full read is the recovery.
    if (!loadedRef.current) return loadContent();
    const request = ++loadRequestRef.current;
    const tokenRequest = ++tokenRequestRef.current;
    const baselineTokens = tokensRef.current;
    const baselineDrawings = drawingsRef.current;
    const protectedIds = new Set(tokenMovesRef.current.keys());
    try {
      const [tokenRevisions, secrets, drawingIds] = await Promise.all([
        listTokenRevisions(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
        fullDrawings ? Promise.resolve(null) : listDrawingIds(scene.id),
      ]);
      if (request !== loadRequestRef.current) return;

      const heldTokens = new Map(baselineTokens.map((token) => [token.id, token]));
      const tokenDiff = diffRevisions(
        tokenRevisions.map(({ id, updatedAt }) => ({ id, version: updatedAt })),
        new Map(baselineTokens.map((token) => [token.id, token.updatedAt])),
      );
      const labelsMoved = Object.entries(secrets).some(([id, label]) => (
        heldTokens.has(id) && (heldTokens.get(id).secretLabel || '') !== label
      ));

      const drawingDiff = drawingIds && diffRevisions(
        drawingIds.map((id) => ({ id })),
        new Map(baselineDrawings.map((drawing) => [drawing.id, undefined])),
        idsOnly,
      );

      const targeted = (diff, fetchAll, fetchSome) => {
        if (!diff.changed.length) return Promise.resolve([]);
        return tooManyToTarget(diff.changed) ? fetchAll() : fetchSome(diff.changed);
      };
      const [freshTokens, freshDrawings] = await Promise.all([
        tokenDiff.clean ? null : targeted(
          tokenDiff, () => listTokens(scene.id), (ids) => listTokensByIds(scene.id, ids),
        ),
        drawingDiff
          ? (drawingDiff.clean ? null : targeted(
            drawingDiff, () => listDrawings(scene.id), (ids) => listDrawingsByIds(scene.id, ids),
          ))
          : listDrawings(scene.id),
      ]);
      if (request !== loadRequestRef.current) return;

      if ((freshTokens || labelsMoved) && tokenRequest === tokenRequestRef.current) {
        for (const id of tokenMovesRef.current.keys()) protectedIds.add(id);
        const incoming = assembleSnapshot(tokenDiff.ids, tokenDiff.changed, freshTokens, heldTokens);
        setTokens((current) => mergeSnapshot(
          current, baselineTokens, attachSecrets(incoming, secrets, current), protectedIds,
        ));
      }

      if (freshDrawings) {
        const incoming = drawingDiff
          ? assembleSnapshot(
            drawingDiff.ids, drawingDiff.changed, freshDrawings,
            new Map(baselineDrawings.map((drawing) => [drawing.id, drawing])),
          )
          : freshDrawings;
        setDrawings((current) => mergeSnapshot(current, baselineDrawings, incoming));
      }
    } catch (_) {
      // Best effort: the next tick, focus or reconnect tries again, and a
      // transient failure must not toast every 30 seconds.
    }
    return undefined;
  }, [isGm, loadContent, scene.id, spectator]);

  useEffect(() => {
    loadedRef.current = false;
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

  return {
    beginTokenMove,
    drawings,
    handleDrawingEvent,
    loading,
    reconcileContent,
    refreshContent: loadContent,
    refreshVisibleTokens,
    setDrawings,
    setTokens,
    tokenImageUrls,
    tokens,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listDrawingRevisions,
  listDrawings,
  listDrawingsByIds,
} from '../../../shared/cloud/api/vttDrawings.js';
import {
  listTokenRevisions,
  listTokenSecrets,
  listTokens,
  listTokensByIds,
} from '../../../shared/cloud/api/vttTokens.js';
import { signMapImage } from '../../../shared/cloud/api/vttMapImages.js';
import {
  assembleSnapshot, diffRevisions, readChanged,
} from '../../../shared/cloud/sync/revisionDiff.js';
import { applyDrawingEvent } from '../../../shared/vtt/session/liveScene.js';
import { createPendingWrites } from '../../../shared/cloud/sync/pendingWrites.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// The GM-only label of each piece. A secrets row read for the piece is the
// answer, an empty label included (cleared elsewhere); the label already held
// only fills in for a piece with no row read (none yet, or not the GM).
export function attachSecrets(tokens, secrets, held = []) {
  const previous = Object.fromEntries(
    held.filter((token) => token.secretLabel).map((token) => [token.id, token.secretLabel]),
  );
  return tokens.map((token) => {
    const secretLabel = Object.hasOwn(secrets, token.id) ? secrets[token.id] : (previous[token.id] || '');
    if (secretLabel) return { ...token, secretLabel };
    if (!token.secretLabel) return token;
    const { secretLabel: _cleared, ...rest } = token;
    return rest;
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
  const [tokenMoves] = useState(createPendingWrites);
  const [drawingWrites] = useState(createPendingWrites);
  // Whether a full read has landed for this scene: the light recovery needs
  // something held to compare with.
  const loadedRef = useRef(false);
  tokensRef.current = tokens;
  drawingsRef.current = drawings;

  // Each move's write is counted per piece. Finishing one answers which pieces
  // have nothing else in flight, so the caller knows whose answer is final.
  const beginTokenMove = useCallback((ids) => tokenMoves.begin(ids), [tokenMoves]);

  // Pieces with a move still being written: their realtime echoes wait.
  const movingTokenIds = useCallback(() => tokenMoves.keys(), [tokenMoves]);

  // The same count for a mark being edited or moved. Finishing answers whether
  // that was the mark's last write in flight, whose row is then final.
  const beginDrawingWrite = useCallback((id) => {
    const finish = drawingWrites.begin(id);
    return () => finish().length > 0;
  }, [drawingWrites]);

  const loadContent = useCallback(async ({ initial = false } = {}) => {
    const request = ++loadRequestRef.current;
    const tokenRequest = ++tokenRequestRef.current;
    const baselineTokens = tokensRef.current;
    const baselineDrawings = drawingsRef.current;
    const protectedIds = tokenMoves.keys();
    if (initial) setLoading(true);
    try {
      const [sceneTokens, secrets, sceneDrawings] = await Promise.all([
        listTokens(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
        listDrawings(scene.id),
      ]);
      if (request !== loadRequestRef.current) return;
      if (tokenRequest === tokenRequestRef.current) {
        for (const id of tokenMoves.keys()) protectedIds.add(id);
        setTokens((current) => mergeSnapshot(
          current, baselineTokens, attachSecrets(sceneTokens, secrets, current), protectedIds,
        ));
      }
      setDrawings((current) => mergeSnapshot(
        current, baselineDrawings, sceneDrawings, drawingWrites.keys(),
      ));
      loadedRef.current = true;
      // A reconnect can supersede the initial request. Whichever request wins
      // must release the loading screen.
      setLoading(false);
    } catch (cause) {
      if (request === loadRequestRef.current) {
        notify('error', failureMessage('Could not load this scene.', cause));
      }
    } finally {
      if (request === loadRequestRef.current) setLoading(false);
    }
  }, [isGm, notify, scene.id, spectator]);

  // The recovery poll. Versions first (ids plus updated_at), then only the
  // rows that moved: a quiet table costs a few hundred bytes instead of every
  // stroke and piece again. `fullDrawings` re-reads every mark, for when what
  // this client shows may differ from the row at the same version (a refused
  // edit's preview).
  const reconcileContent = useCallback(async ({ fullDrawings = false } = {}) => {
    // Nothing held yet to compare against: the full read is the recovery.
    if (!loadedRef.current) return loadContent();
    const request = ++loadRequestRef.current;
    const tokenRequest = ++tokenRequestRef.current;
    const baselineTokens = tokensRef.current;
    const baselineDrawings = drawingsRef.current;
    const protectedIds = tokenMoves.keys();
    try {
      const [tokenRevisions, secrets, drawingRevisions] = await Promise.all([
        listTokenRevisions(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
        fullDrawings ? Promise.resolve(null) : listDrawingRevisions(scene.id),
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

      const drawingDiff = drawingRevisions && diffRevisions(
        drawingRevisions.map(({ id, updatedAt }) => ({ id, version: updatedAt })),
        new Map(baselineDrawings.map((drawing) => [drawing.id, drawing.updatedAt])),
      );

      const [freshTokens, freshDrawings] = await Promise.all([
        tokenDiff.clean ? null : readChanged(tokenDiff, {
          fetchAll: () => listTokens(scene.id), fetchSome: (ids) => listTokensByIds(scene.id, ids),
        }),
        drawingDiff
          ? (drawingDiff.clean ? null : readChanged(drawingDiff, {
            fetchAll: () => listDrawings(scene.id), fetchSome: (ids) => listDrawingsByIds(scene.id, ids),
          }))
          : listDrawings(scene.id),
      ]);
      if (request !== loadRequestRef.current) return;

      if ((freshTokens || labelsMoved) && tokenRequest === tokenRequestRef.current) {
        for (const id of tokenMoves.keys()) protectedIds.add(id);
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
        setDrawings((current) => mergeSnapshot(
          current, baselineDrawings, incoming, drawingWrites.keys(),
        ));
      }
    } catch (_) {
      // Best effort: the next tick, focus or reconnect tries again, and a
      // transient failure must not toast every 30 seconds.
      return false;
    }
    return true;
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
    const protectedIds = tokenMoves.keys();
    try {
      const [fresh, secrets] = await Promise.all([
        listTokens(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
      ]);
      if (request !== tokenRequestRef.current) return;
      for (const id of tokenMoves.keys()) protectedIds.add(id);
      setTokens((current) => mergeSnapshot(
        current, baseline, attachSecrets(fresh, secrets, current), protectedIds,
      ));
    } catch {
      // The row event or the next scene refresh retries without interrupting an
      // active gesture with a transient network toast.
    }
  }, [isGm, scene.id, spectator]);

  const handleDrawingEvent = useCallback((payload) => {
    setDrawings((current) => applyDrawingEvent(current, payload, {
      pendingIds: drawingWrites.keys(),
    }));
  }, []);

  return {
    beginDrawingWrite,
    beginTokenMove,
    movingTokenIds,
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

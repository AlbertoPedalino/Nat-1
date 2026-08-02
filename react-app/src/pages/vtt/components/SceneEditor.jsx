import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Eye, Shield } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { toRoster } from '../../../shared/campaign/roster.js';
import { listCampaignCharacters } from '../../../shared/cloud/campaigns.js';
import {
  createToken,
  deleteToken,
  listTokens,
  signMapImage,
  updateScene,
  updateToken,
  uploadMapImage,
} from '../../../shared/cloud/vtt.js';
import {
  applyTokenEvent,
  dropGhost,
  movableFilter,
  pruneGhosts,
  putGhost,
  resolveTokens,
} from '../../../shared/vtt/liveScene.js';
import { toScene } from '../../../shared/vtt/scene.js';
import { useSceneLive } from '../../../shared/vtt/useSceneLive.js';
import { useSceneRole } from '../../../shared/vtt/useSceneRole.js';
import RosterPanel from './RosterPanel.jsx';
import SceneToolbar from './SceneToolbar.jsx';
import SceneViewport from './SceneViewport.jsx';

const GRID_SAVE_DELAY = 600;
const GHOST_SWEEP_MS = 2000;

export default function SceneEditor({ scene, onSceneChange }) {
  const { notify } = useToast();
  const role = useSceneRole(scene.campaignId);
  const [tokens, setTokens] = useState([]);
  const [ghosts, setGhosts] = useState({});
  const [roster, setRoster] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const gridTimerRef = useRef(null);
  const draggingRef = useRef(null);
  const gridEditRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTokens(scene.id),
      // Only the GM places pieces, so only the GM needs the roster.
      role.isGm && scene.campaignId ? listCampaignCharacters(scene.campaignId) : Promise.resolve([]),
    ])
      .then(([sceneTokens, characterRows]) => {
        if (cancelled) return;
        setTokens(sceneTokens);
        setRoster(toRoster(characterRows));
      })
      .catch((cause) => {
        if (!cancelled) notify('error', cause?.message || 'Could not load this scene.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify, role.isGm, scene.campaignId, scene.id]);

  useEffect(() => {
    let cancelled = false;
    if (!scene.imagePath) {
      setImageUrl(null);
      return () => { cancelled = true; };
    }
    signMapImage(scene.imagePath)
      .then((url) => { if (!cancelled) setImageUrl(url); })
      .catch(() => { if (!cancelled) setImageUrl(null); });
    return () => { cancelled = true; };
  }, [scene.imagePath]);

  useEffect(() => () => clearTimeout(gridTimerRef.current), []);

  const handleTokenEvent = useCallback((payload) => {
    setTokens((current) => applyTokenEvent(current, payload, { draggingId: draggingRef.current }));
    const id = payload?.new?.id || payload?.old?.id;
    // The committed row supersedes whatever the drag preview was showing.
    if (id) setGhosts((current) => dropGhost(current, id));
  }, []);

  const handleSceneEvent = useCallback((payload) => {
    const next = toScene(payload?.new);
    // Ignore remote grid changes while this client is editing the fields, or
    // the debounced echo overwrites what is being typed.
    if (next && !gridEditRef.current) onSceneChange(next);
  }, [onSceneChange]);

  const handleRemoteDrag = useCallback((payload) => {
    if (!payload?.id) return;
    setGhosts((current) => putGhost(current, payload));
  }, []);

  const { sendDrag } = useSceneLive({
    sceneId: scene.id,
    onTokenEvent: handleTokenEvent,
    onSceneEvent: handleSceneEvent,
    onRemoteDrag: handleRemoteDrag,
  });

  // A client that vanishes mid-drag never sends its release; sweeping keeps its
  // piece from being pinned at the ghost position forever.
  useEffect(() => {
    const timer = setInterval(() => setGhosts((current) => pruneGhosts(current)), GHOST_SWEEP_MS);
    return () => clearInterval(timer);
  }, []);

  const canMove = useMemo(
    () => movableFilter({ isGm: role.isGm, ownedCharacterIds: role.ownedCharacterIds }),
    [role.isGm, role.ownedCharacterIds],
  );

  const handleDragToken = useCallback((token, position) => {
    draggingRef.current = token.id;
    sendDrag({ id: token.id, x: position.x, y: position.y });
  }, [sendDrag]);

  const handleMoveToken = useCallback(async (token, position) => {
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...position } : item
    )));
    try {
      await updateToken(token.id, position);
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not move that token.');
    } finally {
      // Released only after the write settles: until then a remote echo would
      // still be our own move coming back.
      draggingRef.current = null;
    }
  }, [notify]);

  const handleGridChange = useCallback((grid) => {
    gridEditRef.current = true;
    onSceneChange({ ...scene, grid });
    clearTimeout(gridTimerRef.current);
    gridTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { grid })
        .catch((cause) => notify('error', cause?.message || 'Could not save the grid.'))
        .finally(() => { gridEditRef.current = false; });
    }, GRID_SAVE_DELAY);
  }, [notify, onSceneChange, scene]);

  const handleUploadMap = useCallback(async (file) => {
    setBusy(true);
    try {
      const path = await uploadMapImage(scene.campaignId, scene.id, file);
      onSceneChange(await updateScene(scene.id, { imagePath: path }));
    } catch (cause) {
      notify('error', cause?.message || 'Could not upload that map.');
    } finally {
      setBusy(false);
    }
  }, [notify, onSceneChange, scene.campaignId, scene.id]);

  const addToken = useCallback(async (token) => {
    setBusy(true);
    try {
      const created = await createToken(scene.id, token);
      setTokens((current) => (
        current.some((item) => item.id === created.id) ? current : [...current, created]
      ));
      setSelectedId(created.id);
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

  const nextFreeCell = useCallback(() => {
    const taken = new Set(tokens.map((token) => `${Math.round(token.x)}:${Math.round(token.y)}`));
    for (let row = 0; row < 20; row += 1) {
      for (let col = 0; col < 20; col += 1) {
        if (!taken.has(`${col}:${row}`)) return { x: col, y: row };
      }
    }
    return { x: 0, y: 0 };
  }, [tokens]);

  const handlePlaceCharacter = useCallback((entry) => addToken({
    ...nextFreeCell(),
    layer: 'tokens',
    characterId: entry.characterId,
    label: entry.name,
    color: entry.color,
  }), [addToken, nextFreeCell]);

  const handleAddToken = useCallback((layer) => addToken({
    ...nextFreeCell(),
    layer,
    label: layer === 'gm' ? 'Hidden' : 'Token',
  }), [addToken, nextFreeCell]);

  const handleDeleteToken = useCallback(async (token) => {
    setBusy(true);
    try {
      await deleteToken(token.id);
      setTokens((current) => current.filter((item) => item.id !== token.id));
      setSelectedId(null);
    } catch (cause) {
      notify('error', cause?.message || 'Could not remove that token.');
    } finally {
      setBusy(false);
    }
  }, [notify]);

  const selectedToken = useMemo(
    () => tokens.find((token) => token.id === selectedId) || null,
    [selectedId, tokens],
  );

  const visibleTokens = useMemo(
    () => resolveTokens(tokens, ghosts, draggingRef.current),
    [ghosts, tokens],
  );

  if (loading || role.loading) return <CircularProgress size={24} />;

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1">{scene.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {tokens.length} token{tokens.length === 1 ? '' : 's'} · cell {scene.grid.size}px
          </Typography>
        </Box>
        <Chip
          size="small"
          icon={role.isGm ? <Shield size={13} /> : <Eye size={13} />}
          label={role.isGm ? 'GM' : 'Player view'}
          color={role.isGm ? 'primary' : 'default'}
          variant="outlined"
        />
      </Stack>

      {role.isGm ? (
        <SceneToolbar
          scene={scene}
          busy={busy}
          selectedToken={selectedToken}
          onUploadMap={handleUploadMap}
          onGridChange={handleGridChange}
          onDeleteToken={handleDeleteToken}
        />
      ) : null}

      <Box sx={role.isGm ? layoutSx : singleColumnSx}>
        <SceneViewport
          scene={scene}
          imageUrl={imageUrl}
          tokens={visibleTokens}
          selectedId={selectedId}
          snap
          canMove={canMove}
          onSelect={setSelectedId}
          onDragToken={handleDragToken}
          onMoveToken={handleMoveToken}
        />
        {role.isGm ? (
          <RosterPanel
            roster={roster}
            tokens={tokens}
            busy={busy}
            onPlaceCharacter={handlePlaceCharacter}
            onAddHiddenToken={handleAddToken}
          />
        ) : null}
      </Box>

      {!role.isGm ? (
        <Typography variant="caption" color="text.secondary">
          You can move the pieces standing for your own characters.
        </Typography>
      ) : null}
    </Stack>
  );
}

const layoutSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 260px' },
  gap: 1.5,
  alignItems: 'start',
};

const singleColumnSx = { display: 'grid', gap: 1.5 };

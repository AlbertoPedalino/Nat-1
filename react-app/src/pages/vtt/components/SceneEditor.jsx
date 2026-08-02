import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
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
import { canMoveToken } from '../../../shared/vtt/scene.js';
import RosterPanel from './RosterPanel.jsx';
import SceneToolbar from './SceneToolbar.jsx';
import SceneViewport from './SceneViewport.jsx';

const GRID_SAVE_DELAY = 600;

export default function SceneEditor({ scene, onSceneChange }) {
  const { notify } = useToast();
  const [tokens, setTokens] = useState([]);
  const [roster, setRoster] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const gridTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTokens(scene.id),
      scene.campaignId ? listCampaignCharacters(scene.campaignId) : Promise.resolve([]),
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
  }, [notify, scene.campaignId, scene.id]);

  // The bucket is private, so the <img> needs a fresh signed URL whenever the
  // map changes. The path is what we store; the URL is disposable.
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

  // This is the GM's own editor, so every piece is movable here. The same check
  // exists in the database; phase 3 passes the real role for the player view.
  const canMove = useCallback((token) => canMoveToken(token, { isGm: true }), []);

  const handleMoveToken = useCallback(async (token, position) => {
    // Optimistic: the piece stays where it was dropped and rolls back only if
    // the write is refused.
    setTokens((current) => current.map((item) => (
      item.id === token.id ? { ...item, ...position } : item
    )));
    try {
      await updateToken(token.id, position);
    } catch (cause) {
      setTokens((current) => current.map((item) => (item.id === token.id ? token : item)));
      notify('error', cause?.message || 'Could not move that token.');
    }
  }, [notify]);

  // Typing in the grid fields fires per keystroke; the scene row should not.
  const handleGridChange = useCallback((grid) => {
    onSceneChange({ ...scene, grid });
    clearTimeout(gridTimerRef.current);
    gridTimerRef.current = setTimeout(() => {
      updateScene(scene.id, { grid }).catch((cause) => {
        notify('error', cause?.message || 'Could not save the grid.');
      });
    }, GRID_SAVE_DELAY);
  }, [notify, onSceneChange, scene]);

  const handleUploadMap = useCallback(async (file) => {
    setBusy(true);
    try {
      const path = await uploadMapImage(scene.campaignId, scene.id, file);
      const updated = await updateScene(scene.id, { imagePath: path });
      onSceneChange(updated);
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
      setTokens((current) => [...current, created]);
      setSelectedId(created.id);
    } catch (cause) {
      notify('error', cause?.message || 'Could not add that token.');
    } finally {
      setBusy(false);
    }
  }, [notify, scene.id]);

  // New pieces land on the first free square of the top-left area rather than
  // stacking on each other.
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

  if (loading) return <CircularProgress size={24} />;

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h1">{scene.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {tokens.length} token{tokens.length === 1 ? '' : 's'} · cell {scene.grid.size}px
        </Typography>
      </Box>

      <SceneToolbar
        scene={scene}
        busy={busy}
        selectedToken={selectedToken}
        onUploadMap={handleUploadMap}
        onGridChange={handleGridChange}
        onDeleteToken={handleDeleteToken}
      />

      <Box sx={layoutSx}>
        <SceneViewport
          scene={scene}
          imageUrl={imageUrl}
          tokens={tokens}
          selectedId={selectedId}
          snap
          canMove={canMove}
          onSelect={setSelectedId}
          onMoveToken={handleMoveToken}
        />
        <RosterPanel
          roster={roster}
          tokens={tokens}
          busy={busy}
          onPlaceCharacter={handlePlaceCharacter}
          onAddHiddenToken={handleAddToken}
        />
      </Box>
    </Stack>
  );
}

const layoutSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1fr) 260px' },
  gap: 1.5,
  alignItems: 'start',
};

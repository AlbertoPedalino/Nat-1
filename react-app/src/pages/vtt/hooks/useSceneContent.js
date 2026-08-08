import { useCallback, useEffect, useState } from 'react';
import { mergeVitals, readCampaignVitals } from '../../../shared/campaign/characterVitals.js';
import { toRoster, toRosterEntry } from '../../../shared/campaign/roster.js';
import { listCampaignCharacters } from '../../../shared/cloud/campaigns.js';
import {
  listDrawings, listTokenSecrets, listTokens, signMapImage,
} from '../../../shared/cloud/vtt.js';
import { toDrawing } from '../../../shared/vtt/drawing.js';

function attachSecrets(tokens, secrets, held = []) {
  const previous = Object.fromEntries(
    held.filter((token) => token.secretLabel).map((token) => [token.id, token.secretLabel]),
  );
  return tokens.map((token) => {
    const secretLabel = secrets[token.id] || previous[token.id] || '';
    return secretLabel ? { ...token, secretLabel } : token;
  });
}

export function useSceneContent({ scene, isGm, spectator, notify }) {
  const [tokens, setTokens] = useState([]);
  const [roster, setRoster] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [tokenImageUrls, setTokenImageUrls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listTokens(scene.id),
      scene.campaignId ? listCampaignCharacters(scene.campaignId) : Promise.resolve([]),
      isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
      listDrawings(scene.id),
    ])
      .then(([sceneTokens, characterRows, secrets, sceneDrawings]) => {
        if (cancelled) return;
        setTokens(attachSecrets(sceneTokens, secrets));
        setRoster(toRoster(characterRows));
        setDrawings(sceneDrawings);
        readCampaignVitals(characterRows)
          .then((vitals) => { if (!cancelled) setRoster((current) => mergeVitals(current, vitals)); })
          .catch(() => {});
      })
      .catch((cause) => {
        if (!cancelled) notify('error', cause?.message || 'Could not load this scene.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isGm, notify, scene.campaignId, scene.id, spectator]);

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
    try {
      const [fresh, secrets] = await Promise.all([
        listTokens(scene.id),
        isGm && !spectator ? listTokenSecrets(scene.id) : Promise.resolve({}),
      ]);
      setTokens((current) => attachSecrets(fresh, secrets, current));
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
    setRoster((current) => current.map((item) => (
      item.characterId === entry.characterId
        ? { ...entry, hpCurrent: item.hpCurrent, hpMax: item.hpMax, tempHp: item.tempHp }
        : item
    )));
    readCampaignVitals([row])
      .then((vitals) => setRoster((current) => mergeVitals(current, vitals)))
      .catch(() => {});
  }, []);

  return {
    drawings,
    handleCharacterEvent,
    handleDrawingEvent,
    loading,
    refreshVisibleTokens,
    roster,
    setDrawings,
    setRoster,
    setTokens,
    tokenImageUrls,
    tokens,
  };
}

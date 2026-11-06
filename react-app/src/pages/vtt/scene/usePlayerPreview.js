import { useCallback, useEffect, useState } from 'react';

// The GM's player preview and the editing surfaces it has to close. They live
// together so the list the preview resets cannot drift from the state that
// exists: every panel, menu and dialog that could write as the GM is here.
export function usePlayerPreview({ isGm }) {
  const [paintMode, setPaintMode] = useState('select');
  // Both top-left panels open in the same spot, so only one of them is out at a
  // time: 'pictures', 'hexcrawl' or nothing.
  const [openCorner, setOpenCorner] = useState(null);
  const [menu, setMenu] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [monsterOpen, setMonsterOpen] = useState(false);
  const [placementDrag, setPlacementDrag] = useState(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState(null);
  const [contentView, setContentView] = useState('map');
  // A local audit mode for the GM. The account keeps GM permissions, while the
  // viewport receives only the same player-safe projection as the projector.
  const [playerPreviewRequested, setGmPlayerPreview] = useState(false);
  const gmPlayerPreview = isGm && playerPreviewRequested;

  useEffect(() => {
    if (!isGm) setGmPlayerPreview(false);
  }, [isGm]);

  const handleTogglePlayerPreview = useCallback(() => {
    if (!gmPlayerPreview) {
      // The preview is deliberately read-only. Reset every editing surface so
      // elevated GM writes cannot happen behind a player-looking board.
      setContentView('map');
      setPaintMode('select');
      setOpenCorner(null);
      setMenu(null);
      setPlacementDrag(null);
      setSelectedDrawingId(null);
      setImportOpen(false);
      setMonsterOpen(false);
    }
    setGmPlayerPreview((current) => !current);
  }, [gmPlayerPreview]);

  return {
    gmPlayerPreview,
    handleTogglePlayerPreview,
    paintMode,
    setPaintMode,
    openCorner,
    setOpenCorner,
    menu,
    setMenu,
    importOpen,
    setImportOpen,
    monsterOpen,
    setMonsterOpen,
    placementDrag,
    setPlacementDrag,
    selectedDrawingId,
    setSelectedDrawingId,
    contentView,
    setContentView,
  };
}

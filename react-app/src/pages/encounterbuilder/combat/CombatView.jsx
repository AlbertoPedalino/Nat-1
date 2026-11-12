import { useEffect, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { ArrowLeft, ArrowRight, RotateCcw, Swords, X } from 'lucide-react';
import { isFightResumable } from '../../../shared/encounter/library.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import CombatantCard from './CombatantCard.jsx';
import Reinforcements from './Reinforcements.jsx';
import { StatBlockPanel } from '../bestiary/StatBlockDialog.jsx';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Panel from '../../../shared/ui/Panel.jsx';
import StatePanel from '../../../shared/ui/StatePanel.jsx';

export default function CombatView() {
  const { state, dispatch } = useEncounterBuilder();
  const combat = state.combat;
  const listRef = useRef(null);
  const activeRef = useRef(null);
  const currentTurn = combat?.currentTurn;
  const round = combat?.round;

  // Keep the active combatant roughly centered in the scrollable roster as turns
  // advance, so its card never hides behind the scroll edges. Scoped to the list
  // container (not the page) so the turn controls above it stay put.
  useEffect(() => {
    const container = listRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const top = active.offsetTop - (container.clientHeight - active.clientHeight) / 2;
    // Honor the OS "reduce motion" setting: jump instantly instead of animating.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [currentTurn, round]);

  if (!combat?.combatants?.length) {
    return (
      <StatePanel
        icon={Swords}
        title="No active encounter"
        action={<Button variant="contained" onClick={() => dispatch({ type: 'setView', view: 'builder' })}>Back to Builder</Button>}
      >
        Launch an encounter from Builder or resume a saved fight from Library.
      </StatePanel>
    );
  }

  const current = combat.combatants[combat.currentTurn] || null;

  // Closing is reversible only through the Library, and a fight launched from an
  // unsaved encounter never gets a card there — say so before it goes.
  const handleClose = () => {
    const activeFight = state.fights.find((fight) => fight.id === state.activeFightId) || null;
    const message = isFightResumable(state.library, activeFight)
      ? 'Close this encounter? It stops being active; resume it from the Library.'
      : 'Close this encounter? It is not saved in the Library, so its progress cannot be resumed.';
    if (!confirmAction(message)) return;
    dispatch({ type: 'closeCombat' });
  };

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) minmax(340px,0.8fr)' }, gap: 2 }}>
        <Stack spacing={2}>
          <Panel icon={Swords} title={`Round ${combat.round}`}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
              <Typography sx={{ color: 'text.secondary' }}>
                Turn: <Box component="span" sx={{ color: 'primary.main', fontWeight: FONT_WEIGHTS.heavy }}>{current?.name || '—'}</Box>
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<ArrowLeft size={ICON_SIZES.sm} />} onClick={() => dispatch({ type: 'prevTurn' })}>
                  Previous
                </Button>
                <Button variant="contained" color="error" endIcon={<ArrowRight size={ICON_SIZES.sm} />} onClick={() => dispatch({ type: 'nextTurn' })}>
                  Next
                </Button>
                <Button variant="outlined" startIcon={<RotateCcw size={ICON_SIZES.sm} />} onClick={() => dispatch({ type: 'rerollInitiative' })}>
                  Reroll All
                </Button>
                <Button variant="outlined" startIcon={<X size={ICON_SIZES.sm} />} onClick={handleClose}>
                  Close Encounter
                </Button>
              </Stack>
            </Stack>
          </Panel>
          <Reinforcements />
          {/* Cap the roster height so it scrolls internally instead of pushing the
              turn controls (Previous/Next/Reroll) off-screen on big encounters. */}
          <Box ref={listRef} sx={combatantListSx}>
            <Stack spacing={1}>
              {combat.combatants.map((combatant, index) => {
                const isActive = index === combat.currentTurn;
                return (
                  <Box key={combatant.id} ref={isActive ? activeRef : null}>
                    <CombatantCard combatant={combatant} active={isActive} />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Stack>
        <StatBlockPanel />
      </Box>
    </>
  );
}

const combatantListSx = {
  // position:relative so the active card's offsetTop is measured against this
  // container, which the centering scroll math in the effect above relies on.
  position: 'relative',
  maxHeight: { xs: '60vh', lg: 'calc(100vh - 240px)' },
  overflowY: 'auto',
  // Room for the scrollbar so it never overlaps a card's active-turn border.
  pr: 0.5,
  // The Roll Log launcher is fixed over the bottom-left corner and sits above
  // this list, so the roster needs to scroll far enough for the last card to
  // clear it. Sized to the button's height plus its viewport offset.
  pb: { xs: 7.5, sm: 8.5 },
};

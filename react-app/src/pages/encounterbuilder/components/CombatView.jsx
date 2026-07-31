import { useEffect, useRef } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { ArrowLeft, ArrowRight, RotateCcw, Swords } from 'lucide-react';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import CombatantCard from './CombatantCard.jsx';
import Reinforcements from './Reinforcements.jsx';
import RollLogLauncher from './RollLogLauncher.jsx';
import { StatBlockPanel } from './StatBlockDialog.jsx';

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
      <Paper sx={{ p: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
        <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
          <Swords size={28} />
          <Typography variant="h2">No active encounter</Typography>
          <Typography color="text.secondary">Launch an encounter from Builder or resume a saved fight from Library.</Typography>
          <Button variant="contained" onClick={() => dispatch({ type: 'setView', view: 'builder' })}>Back to Builder</Button>
        </Stack>
      </Paper>
    );
  }

  const current = combat.combatants[combat.currentTurn] || null;

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) minmax(340px,0.8fr)' }, gap: 2 }}>
        <Stack spacing={2}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h2">Round {combat.round}</Typography>
                <Typography color="text.secondary">
                  Turn: <Box component="span" sx={{ color: 'primary.main', fontWeight: 800 }}>{current?.name || '—'}</Box>
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button variant="outlined" startIcon={<ArrowLeft size={15} />} onClick={() => dispatch({ type: 'prevTurn' })}>
                  Previous
                </Button>
                <Button variant="contained" color="error" endIcon={<ArrowRight size={15} />} onClick={() => dispatch({ type: 'nextTurn' })}>
                  Next
                </Button>
                <Button variant="outlined" startIcon={<RotateCcw size={15} />} onClick={() => dispatch({ type: 'rerollInitiative' })}>
                  Reroll All
                </Button>
                <Button variant="outlined" onClick={() => dispatch({ type: 'setView', view: 'builder' })}>
                  Builder
                </Button>
              </Stack>
            </Stack>
          </Paper>
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
      <RollLogLauncher />
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
};

import { useState } from 'react';
import { Button, Stack, Tab, Tabs } from '@mui/material';
import { BookOpen, Library, Swords, Handshake, Skull } from 'lucide-react';
import ToolPageShell from '../../app/navigation/ToolPageShell.jsx';
import DiceControl from '../../shared/character/dice/DiceControl.jsx';
import GmRollsShownSwitch from '../../shared/character/dice/GmRollsShownSwitch.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import BuilderView from './builder/BuilderView.jsx';
import CombatView from './combat/CombatView.jsx';
import LibraryView from './library/LibraryView.jsx';
import StatBlockDialog from './bestiary/StatBlockDialog.jsx';
import RollSharingControls from './rolls/RollSharingControls.jsx';
import DiceToast from '../../shared/character/dice/DiceToast.jsx';
import CriticalFumblesDialog from './rolls/CriticalFumblesDialog.jsx';
import NegotiationDialog from './negotiation/NegotiationDialog.jsx';
import { EncounterBuilderProvider, useEncounterBuilder } from './state/EncounterBuilderContext.jsx';
import { UI_COLORS, uiAlpha } from '../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES } from '../../shared/ui/fonts.js';

export default function EncounterBuilderPage() {
  const tool = useToolInstance('encounters');
  if (!tool.ready) return <CloudInstanceLoading label="encounter" />;

  return (
    <EncounterBuilderProvider key={`${tool.id}:${tool.revision}`} instanceId={tool.id}>
      <EncounterBuilderShell tool={tool} />
    </EncounterBuilderProvider>
  );
}

function EncounterBuilderShell({ tool }) {
  const {
    state, dispatch, rollSync,
  } = useEncounterBuilder();
  const [fumblesOpen, setFumblesOpen] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [diceToast, setDiceToast] = useState(null);

  const handleCustomRoll = (formula) => {
    const entry = rollSync.rollCustom(formula);
    if (entry) setDiceToast(entry);
  };

  return (
    <ToolPageShell
      tool={tool}
      sectionKey="encounters"
      title="Encounter Builder"
      backTo="/library/encounters"
      backLabel="Encounters"
      actions={(
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <DiceControl
              log={state.rollLog}
              onRoll={handleCustomRoll}
              onClear={() => dispatch({ type: 'clearRollLog' })}
              emptyText="No rolls yet. Click statblock dice, attacks, or abilities."
              settings={<GmRollsShownSwitch campaignId={rollSync.campaignId} />}
            />
            <Button
              size="small"
              variant="outlined"
              startIcon={<Skull size={14} />}
              onClick={() => setFumblesOpen(true)}
              sx={utilityButtonSx}
            >
              Fumbles
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Handshake size={14} />}
              onClick={() => setNegotiationOpen(true)}
              sx={utilityButtonSx}
            >
              Negotiate
            </Button>
          </Stack>
          <Tabs
            value={state.view}
            onChange={(_, value) => dispatch({ type: 'setView', view: value })}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab icon={<BookOpen size={15} />} iconPosition="start" value="builder" label="Builder" />
            <Tab icon={<Library size={15} />} iconPosition="start" value="library" label="Library" />
            <Tab icon={<Swords size={15} />} iconPosition="start" value="combat" label="Encounter" disabled={!state.combat} />
          </Tabs>
        </Stack>
      )}
      after={(
        <>
          <StatBlockDialog />
          <CriticalFumblesDialog open={fumblesOpen} onClose={() => setFumblesOpen(false)} />
          <NegotiationDialog open={negotiationOpen} onClose={() => setNegotiationOpen(false)} />
          {diceToast ? <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}
        </>
      )}
    >
      <RollSharingControls />
      {state.view === 'builder' ? <BuilderView /> : null}
      {state.view === 'library' ? <LibraryView /> : null}
      {state.view === 'combat' ? <CombatView /> : null}
      {state.view !== 'combat' && state.combat ? (
        <Button variant="outlined" startIcon={<Swords size={15} />} onClick={() => dispatch({ type: 'setView', view: 'combat' })} sx={{ alignSelf: 'flex-start' }}>
          Return to active encounter
        </Button>
      ) : null}
    </ToolPageShell>
  );
}

const utilityButtonSx = {
  flexShrink: 0,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  letterSpacing: '0.08em',
  color: UI_COLORS.goldLight,
  borderColor: uiAlpha(UI_COLORS.goldLight, 0.4),
};

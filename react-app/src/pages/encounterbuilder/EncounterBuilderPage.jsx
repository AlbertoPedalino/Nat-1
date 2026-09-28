import { useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import { BookOpen, Library, Swords, Dices, Handshake, Skull } from 'lucide-react';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import LinkedToolsMenu from '../../app/navigation/LinkedToolsMenu.jsx';
import CustomRollDialog from '../../shared/character/dice/CustomRollDialog.jsx';
import { useToolInstance } from '../../shared/instances/useToolInstance.js';
import CloudInstanceLoading from '../../shared/instances/CloudInstanceLoading.jsx';
import InstanceConflictBanner from '../../shared/instances/InstanceConflictBanner.jsx';
import BuilderView from './builder/BuilderView.jsx';
import CombatView from './combat/CombatView.jsx';
import LibraryView from './library/LibraryView.jsx';
import StatBlockDialog from './bestiary/StatBlockDialog.jsx';
import RollSharingControls from './rolls/RollSharingControls.jsx';
import RollLogLauncher from './rolls/RollLogLauncher.jsx';
import EncounterDiceToast, { buildEncounterDiceToast } from './rolls/EncounterDiceToast.jsx';
import CriticalFumblesDialog from './rolls/CriticalFumblesDialog.jsx';
import NegotiationDialog from './negotiation/NegotiationDialog.jsx';
import { EncounterBuilderProvider, useEncounterBuilder } from './state/EncounterBuilderContext.jsx';

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
  const { state, dispatch, roll } = useEncounterBuilder();
  const [customRollOpen, setCustomRollOpen] = useState(false);
  const [fumblesOpen, setFumblesOpen] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [diceToast, setDiceToast] = useState(null);

  const handleCustomRoll = (formula) => {
    // GM roll — generic, no actor attribution.
    const result = roll(formula, 'Custom Roll', null);
    if (result) setDiceToast(buildEncounterDiceToast(result));
  };

  return (
    <Box sx={pageSx}>
      <AppTopBar home backTo="/library/encounters" backLabel="Encounters">
        <LinkedToolsMenu sectionKey="encounters" instanceId={tool.id} initialLinkGroupId={tool.linkGroupId} />
      </AppTopBar>
      <Box sx={contentSx}>
        <Stack spacing={2}>
          <InstanceConflictBanner tool={tool} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h1">Encounter Builder</Typography>
              <Typography variant="body2" color="text.secondary">Instance {tool.id}</Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Dices size={14} />}
                  onClick={() => setCustomRollOpen(true)}
                  sx={utilityButtonSx}
                >
                  Roll
                </Button>
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
          </Stack>
          <RollSharingControls />
          {state.view === 'builder' ? <BuilderView /> : null}
          {state.view === 'library' ? <LibraryView /> : null}
          {state.view === 'combat' ? <CombatView /> : null}
          {state.view !== 'combat' && state.combat ? (
            <Button variant="outlined" startIcon={<Swords size={15} />} onClick={() => dispatch({ type: 'setView', view: 'combat' })} sx={{ alignSelf: 'flex-start' }}>
              Return to active encounter
            </Button>
          ) : null}
        </Stack>
      </Box>
      <StatBlockDialog />
      <RollLogLauncher />
      <CustomRollDialog
        open={customRollOpen}
        onClose={() => setCustomRollOpen(false)}
        onRoll={handleCustomRoll}
      />
      <CriticalFumblesDialog open={fumblesOpen} onClose={() => setFumblesOpen(false)} />
      <NegotiationDialog open={negotiationOpen} onClose={() => setNegotiationOpen(false)} />
      {diceToast ? <EncounterDiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}
    </Box>
  );
}

const pageSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  pt: APP_TOP_BAR_HEIGHT,
};

const contentSx = {
  maxWidth: 1500,
  mx: 'auto',
  px: { xs: 1.25, md: 2 },
  py: 2,
};

const utilityButtonSx = {
  flexShrink: 0,
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  color: '#edd48a',
  borderColor: 'rgba(237,212,138,0.4)',
};

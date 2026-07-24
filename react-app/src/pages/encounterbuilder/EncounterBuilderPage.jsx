import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import { BookOpen, Library, Swords, Dices, Handshake, Skull } from 'lucide-react';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../components/AppTopBar.jsx';
import SaveInstanceButton from '../../components/SaveInstanceButton.jsx';
import CustomRollDialog from '../../shared/character/CustomRollDialog.jsx';
import { useToast } from '../../shared/ToastProvider.jsx';
import BuilderView from './components/BuilderView.jsx';
import CombatView from './components/CombatView.jsx';
import LibraryView from './components/LibraryView.jsx';
import StatBlockDialog from './components/StatBlockDialog.jsx';
import EncounterDiceToast, { buildEncounterDiceToast } from './components/EncounterDiceToast.jsx';
import CriticalFumblesDialog from './components/CriticalFumblesDialog.jsx';
import NegotiationDialog from './components/NegotiationDialog.jsx';
import { resolveInstance } from './logic/storage.js';
import { EncounterBuilderProvider, useEncounterBuilder } from './state/EncounterBuilderContext.jsx';

export default function EncounterBuilderPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(() => resolveInstance(location.search));

  useEffect(() => {
    const next = resolveInstance(location.search);
    setInstance(next);
    if (next.replaceSearch) {
      navigate({ pathname: location.pathname, search: next.replaceSearch }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <EncounterBuilderProvider
      key={instance.id}
      instanceId={instance.id}
      instanceSaved={instance.saved}
      onInstanceSaved={() => setInstance((prev) => ({ ...prev, saved: true }))}
    >
      <EncounterBuilderShell instance={instance} />
    </EncounterBuilderProvider>
  );
}

function EncounterBuilderShell({ instance }) {
  const { state, dispatch, saveInstance, instanceSaved, roll } = useEncounterBuilder();
  const { notify } = useToast();
  const [customRollOpen, setCustomRollOpen] = useState(false);
  const [fumblesOpen, setFumblesOpen] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [diceToast, setDiceToast] = useState(null);

  const handleSaveInstance = () => {
    const entry = saveInstance();
    if (entry) notify('success', 'Encounter instance saved locally.');
  };

  const handleCustomRoll = (formula) => {
    // GM roll — generic, no actor attribution.
    const result = roll(formula, 'Custom Roll', null);
    if (result) setDiceToast(buildEncounterDiceToast(result));
  };

  return (
    <Box sx={pageSx}>
      <AppTopBar home>
        <SaveInstanceButton saved={instanceSaved} onClick={handleSaveInstance} />
      </AppTopBar>
      <Box sx={contentSx}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h1">Encounter Builder</Typography>
              <Typography variant="body2" color="text.secondary">Instance {instance.id}</Typography>
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

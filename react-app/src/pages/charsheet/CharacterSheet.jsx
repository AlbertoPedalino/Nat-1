import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SHEET_AREAS, SHEET_GRID_ITEM_SX, sheetColumnSx, sheetGridSx, sheetResponsive } from './layout/layout.js';
import SheetHeader from './layout/SheetHeader.jsx';
import AbilityScores from './stats/AbilityScores.jsx';
import HPBlock from './resources/HPBlock.jsx';
import SavingThrows from './stats/SavingThrows.jsx';
import Senses from './stats/Senses.jsx';
import Proficiencies from './proficiency/Proficiencies.jsx';
import Skills from './stats/Skills.jsx';
import Movement from './stats/Movement.jsx';
import RightTop from './stats/RightTop.jsx';
import TabsPanel from './layout/TabsPanel.jsx';
import RestDialogs from './resources/RestDialogs.jsx';
import { useRests } from './resources/useRests.js';
import SheetDiceToast from './layout/SheetDiceToast.jsx';
import SheetDiceDock from './layout/SheetDiceDock.jsx';
import SheetConflictBanner from '../../shared/ui/SheetConflictBanner.jsx';
import { ProficiencySetsProvider } from './proficiency/ProficiencySetsContext.jsx';
import { SheetActionsProvider } from './state/SheetActionsContext.jsx';
import { useSheetVitals } from './state/useSheetVitals.js';
import { useSheetRolls } from './state/useSheetRolls.js';
import { useSheetDocument } from './state/useSheetDocument.js';
import { useSheetEditors } from './state/useSheetEditors.js';
import StatePanel from '../../shared/ui/StatePanel.jsx';
import AppPage from '../../app/navigation/AppPage.jsx';
import TopBarButton from '../../shared/ui/TopBarButton.jsx';
import { getActiveCharId } from '../../shared/character/profile/store.js';
import { NEW_CHARACTER, characterBuilderPath } from '../../shared/character/profile/characterRoutes.js';

const noopEffect = () => {};

// The top bar's way back to this character's builder.
function BuilderButton({ C, charId }) {
  const navigate = useNavigate();
  return (
    <TopBarButton
      icon={ArrowLeft}
      label="Builder"
      onClick={() => {
        const params = new URLSearchParams(window.location.search);
        // Use the sheet's own id first: the online sheet route is
        // /campaign-sheet?id=…, so params.get('char') is null there and we
        // must not fall back to a stale gb:active_char (would open a blank
        // or wrong builder). C.id covers chars whose id lives in the data.
        const targetId = charId || C?.id
          || params.get('char') || params.get('id')
          || getActiveCharId() || NEW_CHARACTER;
        navigate(characterBuilderPath(targetId));
      }}
    />
  );
}

export default function CharacterSheet({
  externalChar = null,
  externalCharId = null,
  // The sheet revision of `externalChar`; with `onSheetRow` the parent takes a
  // newer row when this sheet finds its content changed elsewhere.
  externalSheetRevision = null,
  onSheetRow = null,
  onSheetDeleted = null,
  readOnly = false,
  embedded = false,
  liveDigest,
  onRoll = null,
  showOwnRollToast = true,
} = {}) {
  const [C, setC] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [charId, setCharId] = useState(null);
  const {
    toastStore, logStore, showDiceToast, showNotice, rollCustom, rollD20, rollSave, rollSkill,
  } = useSheetRolls({ C, sheet, charId, onRoll, showOwnRollToast });
  const [resources, setResources] = useState({});
  const [freeCastUses, setFreeCastUses] = useState({});
  const [conditionEntries, setConditionEntries] = useState({});
  const {
    persist, syncSheet, sheetConflict, loadRemoteVersion, keepLocalVersion,
  } = useSheetDocument({
    externalChar, externalCharId, externalSheetRevision, onSheetRow, onSheetDeleted, readOnly, liveDigest,
    C, setC, sheet, setSheet, charId, setCharId, setResources, setFreeCastUses, setConditionEntries,
  });

  useEffect(() => {
    if (embedded) return;
    const characterName = String(C?.name || '').trim();
    if (characterName) document.title = characterName;
  }, [C?.name, embedded]);

  const {
    updateCurrentCharacter, saveResourcesState, updateXp, actions: effectiveActions,
  } = useSheetEditors({
    C, setSheet, setResources, setFreeCastUses, persist, syncSheet, rollD20, showDiceToast, showNotice, readOnly,
  });

  const rest = useRests({
    C, sheet, setSheet, resources, setResources, freeCastUses, setFreeCastUses, persist, showDiceToast, showNotice,
  });

  const {
    adjustHP,
    adjustTempHP,
    adjustMaxHpBonus,
    setCurrentHP,
    setTempHP,
    setMaxHpBonus,
    setDeathSave,
    rollDeathSave,
    setExhaustion,
    toggleCondition,
    clearConditions,
    effectActions,
    toggleInspiration,
  } = useSheetVitals({ sheet, setSheet, persist, showDiceToast, showNotice });

  const readOnlyEffectActions = useMemo(() => ({
    add: noopEffect, remove: noopEffect, readOnly: true,
  }), []);

  const noop = useCallback(() => {}, []);

  if (!C || !sheet) {
    const notFound = <StatePanel title="No character found">Go back to the builder to create a character.</StatePanel>;
    return embedded ? notFound : <AppPage topBar={{ home: true }}>{notFound}</AppPage>;
  }

  const gridSx = sheetGridSx(embedded);

  return (
    <ProficiencySetsProvider character={C}>
    <SheetActionsProvider value={effectiveActions}>
    {/* Full bleed: the header is a band across the page, the panels a column
        of their own. No bottom padding: the dice dock is the sheet's last row
        and holds it. A read-only sheet has no builder to go back to. */}
    <AppPage
      embedded={embedded}
      fullBleed
      topBar={{ home: true, start: readOnly ? null : <BuilderButton C={C} charId={charId} /> }}
      after={(
        <>
          <SheetDiceToast toastStore={toastStore} showOwnRollToast={showOwnRollToast} />
          <RestDialogs C={C} sheet={sheet} rest={rest} />
        </>
      )}
    >
      <SheetHeader C={C} sheet={sheet} charId={charId} readOnly={readOnly} embedded={embedded} onShortRest={rest.openShortRest} onLongRest={rest.openLongRest} onUpdateXp={updateXp} onUpdateCharacter={updateCurrentCharacter} />
      {/* Clipped sideways only, so the panels' ink shadows show at the bottom. */}
      <Box sx={{ ...sheetColumnSx(embedded), overflowX: 'clip' }}>
        {sheetConflict ? (
          <SheetConflictBanner onLoadRemote={loadRemoteVersion} onKeepLocal={keepLocalVersion} />
        ) : null}
        <Stack direction={sheetResponsive(embedded, { xs: 'column', md: 'row-reverse' })} spacing={0.75} sx={{ pt: '0.55rem', alignItems: 'stretch' }}>
          <HPBlock sheet={sheet} fillWidth={embedded}
            onHeal={readOnly ? noop : (amt) => adjustHP(1, amt)} onDamage={readOnly ? noop : (amt) => adjustHP(-1, amt)}
            onTempHP={readOnly ? noop : adjustTempHP} onMaxHPBonus={readOnly ? noop : adjustMaxHpBonus}
            onSetHP={readOnly ? noop : setCurrentHP} onSetTempHP={readOnly ? noop : setTempHP} onSetMaxHPBonus={readOnly ? noop : setMaxHpBonus}
            onDeathSave={readOnly ? noop : rollDeathSave} onDeathSaveSet={readOnly ? noop : setDeathSave} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AbilityScores C={C} sheet={sheet} embedded={embedded} onRoll={rollD20} />
          </Box>
        </Stack>
        <Box sx={{
          display: 'grid',
          width: '100%',
          ...gridSx,
          pt: '0.55rem',
          alignItems: 'start',
          minWidth: 0,
        }}>
          {/* Left column: `display: contents` on xs lets each child participate in the
              outer grid via its own gridArea. On md the wrapper collapses into a single
              `leftCol` grid cell containing the panels as flex children, decoupling
              their row heights from the right column. */}
          <Box sx={{
            display: sheetResponsive(embedded, { xs: 'contents', md: 'flex' }),
            flexDirection: sheetResponsive(embedded, { md: 'column' }),
            gap: sheetResponsive(embedded, { md: '0.55rem' }),
            gridArea: sheetResponsive(embedded, { md: SHEET_AREAS.leftCol }),
            ...SHEET_GRID_ITEM_SX,
          }}>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.saves } }}>
              <SavingThrows C={C} sheet={sheet} onRoll={rollSave} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.senses } }}>
              <Senses C={C} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.movement } }}>
              <Movement C={C} sheet={sheet} />
            </Box>
            <Box sx={{ gridArea: { xs: SHEET_AREAS.profs } }}>
              <Proficiencies C={C} />
            </Box>
          </Box>
          <Box sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.skills }}>
            <Skills C={C} sheet={sheet} onRoll={rollSkill} />
          </Box>
          <Stack spacing={0.5} sx={{ ...SHEET_GRID_ITEM_SX, gridArea: SHEET_AREAS.right }}>
            <RightTop C={C} sheet={sheet} embedded={embedded} onRoll={rollD20}
              onToggleCondition={readOnly ? noop : toggleCondition} onClearConditions={readOnly ? noop : clearConditions}
              effectActions={readOnly ? readOnlyEffectActions : effectActions}
              onSetExhaustion={readOnly ? noop : setExhaustion}
              conditionEntries={conditionEntries}
              onToggleInspiration={readOnly ? noop : toggleInspiration}
              resources={resources} setResources={readOnly ? noop : saveResourcesState} onShowToast={showDiceToast} />
            <TabsPanel C={C} sheet={sheet}
              resources={resources} freeCastUses={freeCastUses} />
          </Stack>
        </Box>
      </Box>
      <SheetDiceDock embedded={embedded} logStore={logStore} onRoll={rollCustom} />
    </AppPage>
    </SheetActionsProvider>
    </ProficiencySetsProvider>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { SHEET_AREAS, SHEET_GRID, SHEET_GRID_ITEM_SX, sheetColumnSx } from './layout/layout.js';
import TopBar from './layout/TopBar.jsx';
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
import DiceToast from '../../shared/character/dice/DiceToast.jsx';
import SheetDiceDock from './layout/SheetDiceDock.jsx';
import SheetConflictBanner from '../../shared/ui/SheetConflictBanner.jsx';
import { ProficiencySetsProvider } from './proficiency/ProficiencySetsContext.jsx';
import { SheetActionsProvider } from './state/SheetActionsContext.jsx';
import { useSheetVitals } from './state/useSheetVitals.js';
import { useSheetRolls } from './state/useSheetRolls.js';
import { useSheetDocument } from './state/useSheetDocument.js';
import { useSheetEditors } from './state/useSheetEditors.js';
import { FONT_SIZES } from '../../shared/ui/fonts.js';

const noopEffect = () => {};

const EMBEDDED_SHEET_GRID = {
  gridTemplateColumns: '1fr',
  gridTemplateAreas: `
    "${SHEET_AREAS.saves}"
    "${SHEET_AREAS.skills}"
    "${SHEET_AREAS.senses}"
    "${SHEET_AREAS.movement}"
    "${SHEET_AREAS.profs}"
    "${SHEET_AREAS.right}"
  `,
  gap: '0.55rem',
};

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
  const [tab, setTab] = useState(0);
  const {
    diceToast, setDiceToast, rollLog, setRollLog, showDiceToast, showNotice, rollCustom, rollD20, rollSave, rollSkill,
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
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary', fontSize: FONT_SIZES.lead }}>
        No character found. Go back to the builder to create a character.
      </Box>
    );
  }

  const sheetGridSx = embedded ? EMBEDDED_SHEET_GRID : SHEET_GRID;

  return (
    <ProficiencySetsProvider character={C}>
    <SheetActionsProvider value={effectiveActions}>
    {/* No bottom padding: the dice dock is the sheet's last row and holds it. */}
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: 'background.default', width: '100%' }}>
      <TopBar C={C} sheet={sheet} charId={charId} readOnly={readOnly} embedded={embedded} onShortRest={rest.openShortRest} onLongRest={rest.openLongRest} onUpdateXp={updateXp} onUpdateCharacter={updateCurrentCharacter} />
      <Box sx={{ ...sheetColumnSx(embedded), overflow: 'hidden' }}>
        {sheetConflict ? (
          <SheetConflictBanner onLoadRemote={loadRemoteVersion} onKeepLocal={keepLocalVersion} />
        ) : null}
        <Stack direction={embedded ? 'column' : { xs: 'column', md: 'row-reverse' }} spacing={0.75} sx={{ pt: '0.55rem', alignItems: embedded ? 'stretch' : { md: 'stretch' } }}>
          <HPBlock sheet={sheet} fillWidth={embedded}
            onHeal={readOnly ? noop : (amt) => adjustHP(1, amt)} onDamage={readOnly ? noop : (amt) => adjustHP(-1, amt)}
            onTempHP={readOnly ? noop : adjustTempHP} onMaxHPBonus={readOnly ? noop : adjustMaxHpBonus}
            onSetHP={readOnly ? noop : setCurrentHP} onSetTempHP={readOnly ? noop : setTempHP} onSetMaxHPBonus={readOnly ? noop : setMaxHpBonus}
            onDeathSave={readOnly ? noop : rollDeathSave} onDeathSaveSet={readOnly ? noop : setDeathSave} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <AbilityScores C={C} sheet={sheet} onRoll={rollD20} />
          </Box>
        </Stack>
        <Box sx={{
          display: 'grid',
          width: '100%',
          ...sheetGridSx,
          pt: '0.55rem',
          alignItems: 'start',
          minWidth: 0,
        }}>
          {/* Left column: `display: contents` on xs lets each child participate in the
              outer grid via its own gridArea. On md the wrapper collapses into a single
              `leftCol` grid cell containing the panels as flex children, decoupling
              their row heights from the right column. */}
          <Box sx={{
            display: embedded ? 'contents' : { xs: 'contents', md: 'flex' },
            flexDirection: embedded ? undefined : { md: 'column' },
            gap: embedded ? undefined : { md: '0.55rem' },
            gridArea: embedded ? undefined : { md: SHEET_AREAS.leftCol },
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
            <RightTop C={C} sheet={sheet} onRoll={rollD20}
              onToggleCondition={readOnly ? noop : toggleCondition} onClearConditions={readOnly ? noop : clearConditions}
              effectActions={readOnly ? readOnlyEffectActions : effectActions}
              onSetExhaustion={readOnly ? noop : setExhaustion}
              conditionEntries={conditionEntries}
              onToggleInspiration={readOnly ? noop : toggleInspiration}
              resources={resources} setResources={readOnly ? noop : saveResourcesState} onShowToast={showDiceToast} />
            <TabsPanel C={C} sheet={sheet} tab={tab} setTab={setTab}
              resources={resources} freeCastUses={freeCastUses} />
          </Stack>
        </Box>
      </Box>
      <SheetDiceDock embedded={embedded} rollLog={rollLog} onRoll={rollCustom} onClearLog={() => setRollLog([])} />
      {diceToast && (showOwnRollToast || diceToast.notice) ? <DiceToast toast={diceToast} onClose={() => setDiceToast(null)} /> : null}

      <RestDialogs C={C} sheet={sheet} rest={rest} />
    </Box>
    </SheetActionsProvider>
    </ProficiencySetsProvider>
  );
}

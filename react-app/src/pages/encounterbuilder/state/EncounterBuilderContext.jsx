import { createContext, memo, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import { rollDice } from '../../../shared/character/dice/rollNotation.js';
import { encounterReducer, createInitialState } from './reducer.js';
import { useEncounterPersistence } from './useEncounterPersistence.js';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';
import { useCampaignPlayers } from '../campaign/useCampaignPlayers.js';
import { useCharacterVitalSync } from '../campaign/useCharacterVitalSync.js';
import { useCharacterVitalDispatch } from '../campaign/useCharacterVitalDispatch.js';
import { useExternalFightSync } from '../sync/useExternalFightSync.js';
import { useCloudFights } from '../sync/useCloudFights.js';
import { useMonsterVitalDispatch } from '../sync/useMonsterVitalDispatch.js';
import { useEncounterRolls } from '../rolls/useEncounterRolls.js';
import { encounterRollActor } from '../rolls/rollActor.js';

const EncounterBuilderContext = createContext(null);
// `dispatch` alone, which never changes: a part that only acts (a combatant's
// card, its conditions and reminders) reads it here and is not redrawn by every
// change of the builder.
const EncounterDispatchContext = createContext(null);

export function EncounterBuilderProvider({ instanceId, opening = true, children }) {
  const [state, reduce] = useReducer(encounterReducer, undefined, createInitialState);
  // Enemy vitals go to their fight row; a linked player's to their sheet;
  // everything else straight to the reducer.
  const cloudFightsRef = useRef(null);
  const monsterVitals = useMonsterVitalDispatch({ state, reduce, cloudRef: cloudFightsRef });
  // Filled below by useCharacterVitalSync; read by player health commands.
  const characterVitalsRef = useRef(null);
  const dispatch = useCharacterVitalDispatch(state.combat, monsterVitals.dispatch, characterVitalsRef);
  const characterIds = [...new Set([
    ...state.players.map((p) => p.sourceId),
    ...(state.combat?.combatants || []).filter((p) => p.type === 'player').map((p) => p.sourceId),
  ].filter(Boolean))];
  const characterVitals = useCharacterVitalSync({ characterIds, dispatch: reduce, activeFightId: state.activeFightId });
  characterVitalsRef.current = characterVitals;
  const characterDigests = characterVitals.digests;
  const monsterDb = useMonsterDb();
  const campaignPlayers = useCampaignPlayers();
  const rollSync = useEncounterRolls({
    instanceId, players: state.players, campaigns: campaignPlayers.campaigns, dispatch,
  });
  const { shareRoll } = rollSync;
  useEncounterPersistence({
    instanceId,
    opening,
    monsters: monsterDb.monsters,
    monsterStatus: monsterDb.status,
    state,
    dispatch,
  });

  // Fights have a row each, and the row is the record. The blob beside them —
  // party, library — is still pushed on a timer, which suits what only this page
  // edits; a fight is written by the battle map too, and a blob cannot hold
  // something two writers touch without one of them losing. Enemy vitals in
  // the row are the only authority for them: the battle map writes them there
  // and its pieces display a copy the database derives.
  const cloudFights = useCloudFights({
    instanceId,
    fights: state.fights,
    library: state.library,
    activeFightId: state.activeFightId,
    dispatch,
    isVitalsBusy: monsterVitals.isBusy,
  });
  cloudFightsRef.current = cloudFights;

  // Dungeon rooms handed across by the battle map, and other tabs of this
  // instance, arrive through local storage. With a cloud fight that cache may
  // bring structure but never enemy vitals.
  useExternalFightSync({
    instanceId,
    activeFightId: state.activeFightId,
    fights: state.fights,
    library: state.library,
    monsters: monsterDb.monsters,
    dispatch,
    cloudFights: cloudFights.canSync,
  });

  const getRollActor = useCallback(() => {
    return encounterRollActor({ selectedStatblock: state.selectedStatblock, combat: state.combat, instanceId });
  }, [state.combat, state.selectedStatblock, instanceId]);

  // `actorOverride` lets a caller force the attribution (pass `null` for a
  // generic GM roll with no actor). Omit it to default to the selected/current
  // combatant via getRollActor().
  const roll = useCallback((notation, type, actorOverride, note = '', { localOnly = false, advantage } = {}) => {
    const result = rollDice(notation, type, Math.random, { advantage });
    if (!result) return null;
    const identity = actorOverride !== undefined ? { actorName: actorOverride || 'GM' } : getRollActor();
    const actor = identity.actorName;
    const resolvedNote = typeof note === 'function' ? note(result) : note;
    const annotated = { ...result, ...identity, note: String(resolvedNote || '') };
    shareRoll(annotated, actor, { localOnly });
    return { ...annotated, actor };
  }, [getRollActor, shareRoll]);

  const value = useMemo(() => ({
    state,
    dispatch,
    monsterDb,
    campaignPlayers,
    characterDigests,
    rollSync,
    instanceId,
    roll,
  }), [campaignPlayers, characterDigests, rollSync, instanceId, monsterDb, roll, state, dispatch]);

  return (
    <EncounterDispatchContext.Provider value={dispatch}>
    <EncounterBuilderContext.Provider value={value}>
      {children}
    </EncounterBuilderContext.Provider>
    </EncounterDispatchContext.Provider>
  );
}

export function useEncounterBuilder() {
  const context = useContext(EncounterBuilderContext);
  if (!context) throw new Error('useEncounterBuilder must be used within EncounterBuilderProvider.');
  return context;
}

export function useEncounterDispatch() {
  const dispatch = useContext(EncounterDispatchContext);
  if (!dispatch) throw new Error('useEncounterDispatch must be used within EncounterBuilderProvider.');
  return dispatch;
}

// A panel of the builder that is redrawn only when what it shows changes.
// `picks.state` names the keys of the builder state it reads (it gets `state`
// with those keys only), `picks.context` the other context values it uses
// (dispatch, monsterDb, roll…; stable while unchanged), and the panel is
// memoized on them, key by key. Every builder change otherwise redraws every
// panel that reads the context; measured on a name typed (2026-11-13), Party
// alone took up to 20ms. Every top-level panel of the page is one.
export function encounterPanel({ state: stateKeys = [], context: contextKeys = [] }, Panel) {
  const Memo = memo(Panel, (before, after) => sameProps(before, after, stateKeys));
  function SelectedPanel(props) {
    const context = useEncounterBuilder();
    const picked = {};
    contextKeys.forEach((key) => { picked[key] = context[key]; });
    const state = {};
    stateKeys.forEach((key) => { state[key] = context.state[key]; });
    return <Memo {...props} {...picked} state={state} />;
  }
  SelectedPanel.displayName = `encounterPanel(${Panel.name || 'Panel'})`;
  return SelectedPanel;
}

function sameProps(before, after, stateKeys) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (key === 'state') {
      if (stateKeys.some((name) => before.state[name] !== after.state[name])) return false;
    } else if (before[key] !== after[key]) {
      return false;
    }
  }
  return true;
}

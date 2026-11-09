import { useEffect, useMemo, useState } from 'react';
import { Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { buildCombat, restoreFight } from '../../../shared/encounter/combat.js';
import { hydrateEncounterItems } from '../../../shared/bestiary/monsterUtils.js';
import { combatantToToken, importableCombatants } from '../../../shared/vtt/tokens/encounterImport.js';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';
import { compareText } from '../../../shared/lists.js';
import PlacementDialog from './PlacementDialog.jsx';
import { placementLayer, previewToken } from '../../../shared/vtt/tokens/placement.js';
import { useEncounterSaves } from './useEncounterSaves.js';
import {
  ANY_QUEST, NO_QUEST, buildImportEntries, entriesInQuest, questValue,
} from './encounterImportEntries.js';
import EncounterSaveSelect from './EncounterSaveSelect.jsx';
import EncounterGroupCard from './EncounterGroupCard.jsx';
import { noticeSx } from './encounterImportStyles.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';

// The encounters come from the GM's Encounter Builder saves, in this browser and
// in the cloud (see useEncounterSaves for how the two are reconciled).
export default function EncounterImportDialog({
  open, onClose, onImport, busy, placing = false, onPlacementDragStart, onPlacementDragEnd,
}) {
  const monsterDb = useMonsterDb();
  const [questKey, setQuestKey] = useState(ANY_QUEST);
  const [entryKey, setEntryKey] = useState('');
  const [hidden, setHidden] = useState(false);
  const {
    instances, instanceId, pickInstance, listNotice, listing, fetching, fetchNotice, fights, library,
  } = useEncounterSaves(open);

  // The filter belongs to the save being looked at, not to the dialog: keeping a
  // quest from the previous instance would hide everything in this one.
  useEffect(() => { setQuestKey(ANY_QUEST); }, [instanceId]);

  const entries = useMemo(() => buildImportEntries(fights, library), [fights, library]);

  const quests = useMemo(
    () => [...new Set(entries.map((entry) => entry.quest).filter(Boolean))]
      .sort(compareText),
    [entries],
  );
  const unquested = entries.some((entry) => !entry.quest);
  const visible = useMemo(() => entriesInQuest(entries, questKey), [entries, questKey]);

  // The quest chosen decides what there is to pick from, so the encounter is
  // read off the list rather than held beside it: a choice the filter no longer
  // offers falls back to the first that it does, in the same render as the
  // filter itself.
  const currentKey = visible.some((entry) => entry.key === entryKey)
    ? entryKey
    : visible[0]?.key || '';
  const selected = useMemo(
    () => visible.find((entry) => entry.key === currentKey) || null,
    [currentKey, visible],
  );

  // Hydrated against the bestiary, not against an empty list. A snapshot stores
  // only a reference to each creature, so without the database `monsterData`
  // comes back null — which meant every imported piece fell back to the default
  // artwork and to a single square.
  //
  // An encounter with no fight is rolled up here only to be looked at: what
  // lands on the map comes from the launch itself, so reading down the list
  // writes nothing into the builder.
  const combatants = useMemo(() => {
    if (!selected) return [];
    if (selected.fight) return importableCombatants(restoreFight(selected.fight, monsterDb.monsters));
    const encounter = hydrateEncounterItems(selected.card?.encounter, monsterDb.monsters);
    return importableCombatants(buildCombat(encounter, [], selected.encounterId));
  }, [monsterDb.monsters, selected]);

  const layer = placementLayer(hidden);
  const preview = useMemo(() => (combatants.length
    ? previewToken(combatantToToken(combatants[0], { layer, instanceId, fightId: selected?.fight?.id }))
    : null), [combatants, instanceId, layer, selected]);

  return (
    <PlacementDialog
      open={open}
      onClose={onClose}
      placing={placing}
      maxWidth="xs"
      title="Import from an encounter"
      actions={(
        <>
            <Button onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              variant="contained"
              disabled={busy || !combatants.length}
              onClick={() => onImport(combatants, {
                layer,
                instanceId,
                fightId: selected?.fight?.id || null,
                encounterId: selected?.encounterId ?? null,
              })}
            >
              Place them
            </Button>
        </>
      )}
    >
      <Stack spacing={2} sx={{ pt: 0.5 }}>
        {listNotice ? <Typography sx={noticeSx}>{listNotice}</Typography> : null}
        {!instances.length && listing ? (
          <LoadingLine label="Loading your encounter saves…" />
        ) : null}
        {!instances.length && !listing ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No Encounter Builder saves yet. Prepare one in the Encounter Builder, and sign in to
            see the ones made on another device.
          </Typography>
        ) : null}
        {instances.length ? (
          <>
            <EncounterSaveSelect
              instances={instances}
              value={instanceId}
              onPick={pickInstance}
              fetching={fetching}
            />
            {fetchNotice ? <Typography sx={noticeSx}>{fetchNotice}</Typography> : null}

            {quests.length ? (
              <TextField
                select
                size="small"
                label="Quest"
                value={questKey}
                onChange={(event) => setQuestKey(event.target.value)}
              >
                <MenuItem value={ANY_QUEST}>All quests</MenuItem>
                {quests.map((quest) => (
                  <MenuItem key={quest} value={questValue(quest)}>{quest}</MenuItem>
                ))}
                {unquested ? <MenuItem value={NO_QUEST}>No quest</MenuItem> : null}
              </TextField>
            ) : null}

            <TextField
              select
              size="small"
              label="Encounter"
              value={currentKey}
              onChange={(event) => setEntryKey(event.target.value)}
              disabled={!visible.length}
              helperText={visible.length
                ? null
                : fetching ? 'Waiting for the cloud copy…' : (entries.length
                  ? 'No encounter in this quest.'
                  : 'This save has no encounter to import yet.')}
            >
              {visible.map((entry) => (
                <MenuItem key={entry.key} value={entry.key}>{entry.name}</MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={<Switch size="small" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />}
              label={<Typography variant="body2">Place on the GM layer</Typography>}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hidden
                ? 'The party will not receive these pieces until you move them to the token layer.'
                : 'The party sees these pieces as soon as they land.'}
            </Typography>

            <EncounterGroupCard
              combatants={combatants}
              preview={preview}
              layer={layer}
              instanceId={instanceId}
              selected={selected}
              busy={busy}
              bestiaryLoading={monsterDb.status === 'loading'}
              onPlacementDragStart={onPlacementDragStart}
              onPlacementDragEnd={onPlacementDragEnd}
            />
          </>
        ) : null}
      </Stack>
    </PlacementDialog>
  );
}

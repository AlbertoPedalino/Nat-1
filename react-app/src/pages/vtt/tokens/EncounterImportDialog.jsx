import { useMemo, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { buildCombat, restoreFight } from '../../../shared/encounter/combat.js';
import { hydrateEncounterItems } from '../../../shared/bestiary/monsterUtils.js';
import { combatantToToken, importableCombatants } from '../../../shared/vtt/tokens/encounterImport.js';
import { useMonsterDb } from '../../../shared/bestiary/useMonsterDb.js';
import PlacementDialog from './PlacementDialog.jsx';
import GmLayerSwitch from './GmLayerSwitch.jsx';
import { placementLayer, previewToken } from '../../../shared/vtt/tokens/placement.js';
import { useEncounterSaves } from './useEncounterSaves.js';
import { buildImportEntries } from './encounterImportEntries.js';
import { questFilterField } from '../../../shared/encounter/library.js';
import ListFilterBar from '../../../shared/ui/ListFilterBar.jsx';
import { useListFilter } from '../../../shared/ui/useListFilter.js';
import EncounterSaveSelect from './EncounterSaveSelect.jsx';
import EncounterGroupCard from './EncounterGroupCard.jsx';
import { noticeSx } from './encounterImportStyles.js';
import { LoadingLine } from '../../../shared/ui/LoadStatus.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import { CancelButton } from '../../../shared/ui/SheetDialog.jsx';
import SelectField from '../../../shared/ui/SelectField.jsx';

// An encounter is found by its name or its quest, and filtered by quest.
const entryText = (entry) => [entry.name, entry.quest];
const QUEST_FIELDS = [questFilterField((entry) => entry.quest)];

// The encounters come from the GM's Encounter Builder saves, in this browser and
// in the cloud (see useEncounterSaves for how the two are reconciled).
export default function EncounterImportDialog({
  open, onClose, onImport, busy, placing = false, onPlacementDragStart, onPlacementDragEnd,
}) {
  const monsterDb = useMonsterDb();
  const [entryKey, setEntryKey] = useState('');
  const [hidden, setHidden] = useState(false);
  const {
    instances, instanceId, pickInstance, listNotice, listing, fetching, fetchNotice, fights, library,
  } = useEncounterSaves(open);

  const entries = useMemo(() => buildImportEntries(fights, library), [fights, library]);

  // The search and the quest filter belong to the save being looked at, not
  // to the dialog: a quest kept from the previous save would hide everything
  // in this one.
  const filter = useListFilter(entries, { getText: entryText, fields: QUEST_FIELDS, resetKey: instanceId });
  const { visible } = filter;

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
            <CancelButton onClick={onClose} disabled={busy} />
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
          <EmptyLine>
            No Encounter Builder saves yet. Prepare one in the Encounter Builder, and sign in to
            see the ones made on another device.
          </EmptyLine>
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

            {entries.length ? <ListFilterBar filter={filter} what="encounters" sx={{ mb: 0 }} /> : null}

            <SelectField
              label="Encounter"
              value={currentKey}
              onChange={setEntryKey}
              disabled={!visible.length}
              helperText={visible.length
                ? null
                : fetching ? 'Waiting for the cloud copy…' : (entries.length
                  ? null
                  : 'This save has no encounter to import yet.')}
              options={visible.map((entry) => ({ value: entry.key, label: entry.name }))}
            />

            <GmLayerSwitch checked={hidden} onChange={setHidden} />

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

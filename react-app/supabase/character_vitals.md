# Shared character health

`characters.data` is authoritative for current HP, temporary HP, max-HP bonus,
death saves and conditions. Encounter/fight/token snapshots are display caches.

## Deploy

1. Run `13_character_vitals.sql` in the project's Supabase SQL Editor, after the
   existing `01_schema.sql` and `04_characters_realtime.sql`. It is safe to run again and
   retains every character's existing values.
2. Deploy the matching frontend build.
3. Open a character in two encounters, an embedded sheet and `/campaign-sheet`.
   Apply damage from both users, then return to Builder and relaunch/resume an
   older fight. All views should converge on the same character HP.

## Write protocol

Health controls submit an intent (damage, heal, set HP, rest, etc.). The client
computes an absolute vitals patch from what it already follows: the character
digest (`16_character_digests.sql`: vitals, `row_revision`, `hpBasis`) and a
base max HP derived for that `hpBasis` (the sheet derives its own; the battle
map and the builder use `useCharacterDigests().baseMax`). Nothing is read first.
`commit_character_vitals(p_id, p_digest_revision, p_hp_basis, p_patch)` locks
the character and commits only if its digest is still that revision and basis.
The max-HP rules stay in JavaScript; the database only checks the basis. The
digest moves only with vitals, max-HP inputs and roster facts, so autosaving
notes, resources, slots or coins never conflicts with a health command
(inventory does: items can feed max HP).

The answer is vitals only — `{ applied, characterId, vitals, digestRevision,
hpBasis }`, a few hundred bytes — never the sheet. It is published in the tab as
`CHARACTER_VITALS_EVENT` (`shared/cloud/sync/characterEvents.js`), which
previews the digest and is never taken for a whole sheet.

Each command is sent once. A stale digest or basis is never applied: the answer
carries the current vitals and every view realigns on it. A relative command
(`modifyHp`, `modifyTempHp`, `grantTempHp`, `modifyMaxHp`, `deathSaveRoll`)
explicitly refused that way is recomputed once from that answer, since it
certainly did not land; absolute ones (set HP, patches, token edits, toggles)
are not, and the user repeats them if they still make sense. An RPC error or a
timeout (8 s, `HEALTH_COMMAND_TIMEOUT_MS`) is not retried; the tab's followers
of that character run their light recovery (`CHARACTER_RECHECK_EVENT`). A
request that timed out may still commit later; its digest then arrives like any
other change. No operation ledger or history is stored: rerunning this
migration drops the former `character_vital_operations` table and both former
RPC signatures. The RPC uses caller RLS and fails when the caller cannot update
the character.

Rare legacy path (`healthCommandRoute` names why): a caller with no digest yet,
no base max, or a base max of another basis reads the digest, then the sheet,
and derives the base max itself; a sheet never uploaded is inserted first.
`healthCommandStats()` counts both paths.

The database trigger preserves health during ordinary full-sheet updates and
upserts. It assigns server revisions and timestamps: every UPDATE that changes
the row (sheet save, upsert, rename, campaign move, `ON DELETE SET NULL`, the
health RPC) advances `row_revision` by exactly one; a client-supplied value is
discarded, and a write that leaves the row as it was keeps the revision. Open
views compare revisions before downloading a sheet, so an unchanged save costs
nobody a download. Re-run this file to install that rule on an existing project.
Only an intentional health commit advances `vitals_revision`. As with editing
the sheet itself, authorized clients are trusted to supply legal game actions;
this is concurrency control, not an anti-cheat boundary.

Views accept RPC responses and realtime events in revision order. Every open
sheet — editable or read-only — takes vitals from `character_digests` only. A
failed command shows an error and leaves the confirmed value visible; it is not
silently stored as an offline edit. Local sheets excluded from cloud
synchronization remain local.

## Sheet content: `sheet_revision`

`characters.sheet_revision` is the version of a sheet's content: it advances by
one, in `protect_character_vitals`, when `name` or `data` outside the vitals and
the runtime-only keys changes (an item, a note, a resource, a level). Health
commands, no-ops, campaign moves and a save that only re-adds a runtime-only key
leave it alone. `17_character_sheet_revisions.sql` projects it to
`character_sheet_revisions` (one row per character, no sheet content, RLS as the
digests, Realtime with DELETE), which is what an open sheet follows
(`useCharacterSheetRevision`): nobody subscribes to `characters`.

- A newer revision on a clean sheet → one full read (`structural-refresh`) and
  the sheet takes it: a cloud sheet through its parent, a local sheet as the
  cloud's copy (stored without a push back, `gb:char-sync:<id>` metadata
  aligned).
- Whole-sheet saves are conditional (`… and sheet_revision = expected`) and
  answer with the revision they produced; a stale one writes nothing and fails
  with `SHEET_CONFLICT` (told apart from a missing permission by a read-back).
  The sheet then reads the cloud version (`conflict-refresh`) and asks: load
  it, or keep the local changes (an explicit save, conditional on that
  version). No automatic merge.
- Own echo: a save's revision becomes known (`CHARACTER_SHEET_SAVED_EVENT`); a
  newer revision seen while a save is pending or in flight is held until it
  settles, so an echo arriving before the save's answer downloads nothing.
- Recovery: one light read of `sheet_revision` on SUBSCRIBED, focus/visibility
  and online. No periodic timer.

## Runtime-only fields

An open sheet attaches the optional-feature catalog (`optionalFeatureEntries`)
to the character it renders. It is identical for every character and rebuilt
on every open, so it is never stored: `stripRuntimeOnlyCharacterFields`
(`src/shared/character/profile/runtimeFields.js`) removes it at every
persistence boundary (local store, every `characters.data` write, pull, builder
save), and this file's `strip_character_runtime_fields` (INSERT) and
`protect_character_vitals` (UPDATE) remove `character_runtime_only_keys()` on
the database side, before the no-op and revision rules run. A save that only
re-adds it changes nothing. `16_character_digests.sql` leaves it out of
`hpBasis`. Older rows are cleaned once by
`maintenance/remove_optional_feature_entries.sql`.

## Validation

`npm test` includes PostgreSQL/PGlite tests covering stale full saves,
upsert defaults, interleaved client revisions, removal of the legacy ledger and RLS,
the revision of every character write path and no-op writes,
plus command/API/UI tests for concurrent edits and stale encounter restores.
PGlite tests exercise PostgreSQL SQL semantics locally; they do not deploy to or
verify the production Supabase project's configuration.

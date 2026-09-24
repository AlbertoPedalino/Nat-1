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

Views accept RPC responses and realtime events in revision order. Editable
sheets take vitals from `character_digests` only; a read-only viewer follows
its row and, after reconnect/focus and every 30 s, checks `row_revision` and
downloads the row only when it moved. A failed command shows an error and
leaves the confirmed value visible; it is not silently stored as an offline edit.
Local sheets excluded from cloud synchronization remain local.

## Validation

`npm test` includes PostgreSQL/PGlite tests covering stale full saves,
upsert defaults, interleaved client revisions, removal of the legacy ledger and RLS,
the revision of every character write path and no-op writes,
plus command/API/UI tests for concurrent edits and stale encounter restores.
PGlite tests exercise PostgreSQL SQL semantics locally; they do not deploy to or
verify the production Supabase project's configuration.

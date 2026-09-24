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
reads the character row, loads the same rules used by the sheet to calculate its
maximum HP, and derives a patch. `commit_character_vitals(p_id, p_revision,
p_patch)` locks the row and commits only against that exact `row_revision`.
This avoids maintaining a second D&D rules engine in SQL.

Each command is sent once. A stale revision is never applied: the RPC returns
the current row, every view realigns on it, and the user repeats the action if
it still makes sense. An RPC error or a timeout (8 s, `HEALTH_COMMAND_TIMEOUT_MS`)
is not retried either; the client performs one bounded read of the character
row and realigns on that. A request that timed out may still commit later; its
realtime event then arrives like any other. No operation ledger or history is
stored: rerunning this migration drops the former `character_vital_operations`
table and the four-argument RPC. The RPC uses caller RLS and fails when the
caller cannot update the character.

The database trigger preserves health during ordinary full-sheet updates and
upserts. It assigns server revisions and timestamps.
Only an intentional health commit advances `vitals_revision`. As with editing
the sheet itself, authorized clients are trusted to supply legal game actions;
this is concurrency control, not an anti-cheat boundary.

Views accept RPC responses and realtime events in revision order and refresh
after reconnect/focus and periodically. A failed command shows an error and
leaves the confirmed value visible; it is not silently stored as an offline edit.
Local sheets excluded from cloud synchronization remain local.

## Validation

`npm test` includes a PostgreSQL/PGlite test covering stale full saves,
upsert defaults, interleaved client revisions, removal of the legacy ledger and RLS,
plus command/API/UI tests for concurrent edits and stale encounter restores.
PGlite tests exercise PostgreSQL SQL semantics locally; they do not deploy to or
verify the production Supabase project's configuration.

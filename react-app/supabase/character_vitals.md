# Shared character health

`characters.data` is authoritative for current HP, temporary HP, max-HP bonus,
death saves and conditions. Encounter/fight/token snapshots are display caches.

## Deploy

1. Run `character_vitals.sql` in the project's Supabase SQL Editor, after the
   existing `schema.sql` and `combat_sync.sql`. It is safe to run again and
   retains every character's existing values.
2. Deploy the matching frontend build.
3. Open a character in two encounters, an embedded sheet and `/campaign-sheet`.
   Apply damage from both users, then return to Builder and relaunch/resume an
   older fight. All views should converge on the same character HP.

## Write protocol

Health controls submit an intent (damage, heal, set HP, rest, etc.). The client
reads the character row, loads the same rules used by the sheet to calculate its
maximum HP, and derives a patch. `commit_character_vitals` locks the row and
commits only against that exact `row_revision`. On conflict the client reapplies
the original intent to the returned row, including any changed class/feat data.
This avoids maintaining a second D&D rules engine in SQL.

Each command has a UUID. The operation ledger makes transport retries idempotent,
including a response lost after commit. Keep ledger entries while a character
exists; deleting the character cascades to its ledger. The RPC uses caller RLS
and fails when the caller cannot update the character.

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
upsert defaults, interleaved client revisions, duplicate operation IDs and RLS,
plus command/API/UI tests for concurrent edits and stale encounter restores.
PGlite tests exercise PostgreSQL SQL semantics locally; they do not deploy to or
verify the production Supabase project's configuration.

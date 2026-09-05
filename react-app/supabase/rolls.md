# Campaign roll logs

Apply `rolls.sql` in the Supabase SQL editor after `campaigns.sql` and
`vtt.sql`. It grants the campaign GM access to private roll broadcasts;
it creates no history table. Without these policies, hidden rolls still sync
between tabs of the same browser/account, but cannot reach another device.
Never fall back to the public channel for hidden rolls.

In Encounter Builder, select **Roll log campaign** (inferred when the imported
party belongs to one campaign). **Show my rolls to players** starts off.
The campaign and visibility choices are saved for this instance in this browser.
The visibility choice applies to future rolls; it never republishes old rolls.

The encounter, battle map and player sheets receive campaign rolls while open.
Hidden encounter rolls appear in GM logs only. Logs are held in memory;
clearing a log affects that view only, and reloading clears its history.

Verify with a GM and a player signed into separate browsers:

1. Open the encounter, the GM map, and the player's sheet/map in one campaign.
2. Roll on the player sheet and map; each open campaign log should receive one entry.
3. Leave sharing off and roll a monster attack and a custom roll in the encounter.
   They should appear in both GM logs, with no player log, toast or dice animation.
4. Turn sharing on and repeat. The new rolls should reach the player logs too.
5. Open another campaign and verify it receives none of these rolls.

Authorization uses [Supabase Realtime policies](https://supabase.com/docs/guides/realtime/authorization).

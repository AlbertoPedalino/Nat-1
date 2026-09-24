# Cloud sync (Supabase) — setup

Lets players save their sheet to the cloud so the GM can see it. **Optional**: without
the env vars the app runs 100% local (localStorage), exactly like before.

## 1. Create the Supabase project (free)
1. Go to https://supabase.com → sign up → **New project**.
2. Pick a name + a database password (save it). Region close to you.
3. Wait ~2 min for it to provision.

## 2. Create the tables
Open **SQL Editor** → **New query**, paste the entire contents of each file
below and **Run**, one query per file, **in the order of their number prefix**.
Every file is safe to re-run; when a file changes, run it again on existing
projects. A new script takes the next number and a row in this table:
`tests/logic/shared/cloud/schema-order.sql.test.js` applies the whole numbered
sequence twice to a local Postgres and fails on a missing or repeated number,
or on a script missing from this table.

| # | File | What it adds |
|---|------|--------------|
| 1 | [`01_schema.sql`](supabase/01_schema.sql) | Profiles, characters, auth trigger |
| 2 | [`02_sections.sql`](supabase/02_sections.sql) | GM Board, Encounter Builder and DM Screen saves (owner-only), linked-tool groups |
| 3 | [`03_campaigns.sql`](supabase/03_campaigns.sql) | Campaigns, members, invite codes |
| 4 | [`04_characters_realtime.sql`](supabase/04_characters_realtime.sql) | Realtime for character sheets (drops the retired `patch_character_data`) |
| 5 | [`05_character_art.sql`](supabase/05_character_art.sql) | Private `character-art` portrait bucket |
| 6 | [`06_vtt.sql`](supabase/06_vtt.sql) | Battle map: scenes, tokens, secrets, drawings, `map-images` bucket |
| 7 | [`07_atmosphere.sql`](supabase/07_atmosphere.sql) | Scene atmosphere column |
| 8 | [`08_encounter_fights.sql`](supabase/08_encounter_fights.sql) | One cloud row per encounter fight |
| 9 | [`09_dungeon.sql`](supabase/09_dungeon.sql) | Dungeon rooms on scenes |
| 10 | [`10_hexcrawl.sql`](supabase/10_hexcrawl.sql) | Hexcrawl cells, campaign clock and log |
| 11 | [`11_campaign_tools.sql`](supabase/11_campaign_tools.sql) | Independent campaign tool links (migrates existing links once; rerunning keeps later unlinks) and the dungeon Encounter Builder selection |
| 12 | [`12_rolls.sql`](supabase/12_rolls.sql) | Private realtime channels for shared rolls — see [`rolls.md`](supabase/rolls.md) |
| 13 | [`13_character_vitals.sql`](supabase/13_character_vitals.sql) | Character health commands and revisions — see [`character_vitals.md`](supabase/character_vitals.md) |
| 14 | [`14_token_vitals.sql`](supabase/14_token_vitals.sql) | Enemy health authority in fights, GM-only token HP, public HP projection |

Run 13 and 14 **before** deploying a frontend that needs them: the app sends
health changes only through their RPCs.

## 3. Turn OFF email confirmation
Players log in with username only (mapped to a synthetic email), so there is no inbox.
- **Authentication → Sign In / Providers → Email** → disable **Confirm email** → Save.

## 4. Get your keys
- **Project Settings → API**:
  - `Project URL`  → `VITE_SUPABASE_URL`
  - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`  (safe to ship; RLS protects data)
  - ⚠️ Never use the `service_role` key in the frontend.

## 5. Configure the app
Create `react-app/.env` (copy from `.env.example`):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_AUTH_EMAIL_DOMAIN=players.gmboard.local
```

`.env` is git-ignored. For **GitHub Pages** the build is static, so the values get baked
into the bundle at build time. If you build in GitHub Actions, add the two `VITE_*` as
repository **secrets** and pass them as env to `npm run build`.

## 6. Make yourself the GM
1. Run the app, open the cloud menu (top-right), **Registrati** with your name+password.
2. In Supabase **SQL Editor** run:
   ```sql
   update public.profiles set role = 'gm' where username = 'YOUR_NAME';
   ```
3. Reload. The cloud menu now shows **Schede giocatori** → `/library/characters`.

## How it works
- **Players**: press **Cloud** → *Accedi / Registrati* once. After that sync is **always on**:
  every edit (builder or sheet) is pushed to the cloud automatically (debounced ~1s). The Cloud
  button shows a green dot when everything is saved. No buttons to press.
- **GM**: cloud menu → *Schede giocatori* (`/library/characters`) lists every player's latest sheet.
  *Apri* opens it in the normal sheet view; *JSON* downloads the raw data.
- Logged out = pure local, nothing leaves the browser. The cloud stores only: users
  (login + role) and the full sheet JSON. Local save always works offline and is never removed.
- **Campaigns** (login menu → *Campaigns*): create a campaign (you get an invite code) or
  join one with a code. Attach your characters to a campaign; everyone in that campaign can
  **view** each other's sheets read-only (only the owner can edit).
- **Character health** (HP, temp HP, death saves, conditions) is changed only through
  `commit_character_vitals` (`13_character_vitals.sql`): one command per edit against the
  row revision; ordinary sheet saves cannot change it. `04_characters_realtime.sql` adds
  `public.characters` to Realtime so every open view follows.
- **Enemy health** lives in the fight row (`encounter_fights`) and is changed only through
  `commit_fight_combatant_vitals`. Standalone map pieces keep real HP in the GM-only
  `map_token_secrets`. `map_tokens` carries HP only while the GM shows the bar
  (`14_token_vitals.sql`), so hidden HP never reach players.

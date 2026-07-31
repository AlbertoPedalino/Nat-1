# Cloud sync (Supabase) — setup

Lets players save their sheet to the cloud so the GM can see it. **Optional**: without
the env vars the app runs 100% local (localStorage), exactly like before.

## 1. Create the Supabase project (free)
1. Go to https://supabase.com → sign up → **New project**.
2. Pick a name + a database password (save it). Region close to you.
3. Wait ~2 min for it to provision.

## 2. Create the tables
1. Open **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. For the campaigns feature, run [`supabase/campaigns.sql`](supabase/campaigns.sql) too (a second query).
4. For Encounter Builder combat-to-sheet HP sync, run [`supabase/combat_sync.sql`](supabase/combat_sync.sql) too.
   Re-run this file once on existing projects to enable live Supabase Realtime
   updates for open combats.

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
3. Reload. The cloud menu now shows **Schede giocatori** → `/gmsheets`.

## How it works
- **Players**: press **Cloud** → *Accedi / Registrati* once. After that sync is **always on**:
  every edit (builder or sheet) is pushed to the cloud automatically (debounced ~1s). The Cloud
  button shows a green dot when everything is saved. No buttons to press.
- **GM**: cloud menu → *Schede giocatori* (`/gmsheets`) lists every player's latest sheet.
  *Apri* opens it in the normal sheet view; *JSON* downloads the raw data.
- Logged out = pure local, nothing leaves the browser. The cloud stores only: users
  (login + role) and the full sheet JSON. Local save always works offline and is never removed.
- **Campaigns** (login menu → *Campaigns*): create a campaign (you get an invite code) or
  join one with a code. Attach your characters to a campaign; everyone in that campaign can
  **view** each other's sheets read-only (only the owner can edit).
- **Encounter combat sync** uses `patch_character_data` from `supabase/combat_sync.sql`.
  It applies a shallow, allowlisted top-level JSON patch; object fields such as
  `deathSaves` must be sent as complete sub-objects. The same SQL also adds
  `public.characters` to the Supabase Realtime publication for live sheet updates.

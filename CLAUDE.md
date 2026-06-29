# GM-Board

React 19 + Vite + MUI + Supabase SPA in `react-app/`. D&D 5.5e (2024) character builder + live sheet.

## Commands
- Build (primary smoke check): `cd react-app && npm run build`
- Dev server: `cd react-app && npm run dev`
- Tests: `npm test` is currently a no-op (`node --test`, no suite under `src/`).

## Hard rules
- D&D data is fetched at runtime from the configured 5etools mirror. **Never** vendor, copy, or commit 5etools JSON or image assets; preserve runtime fetching.
- Only 2024 source codes are allowed (whitelist in `react-app/src/shared/character/sourcePriority.js`). Reject legacy 2014 (PHB/DMG/MM) and homebrew.
- Builder and Sheet share one serialized character schema — changes must round-trip both ways.

## Architecture
Accumulated structure, file map, and gotchas live in **`.agent-loop/memory.md`** — read it before exploring the codebase.

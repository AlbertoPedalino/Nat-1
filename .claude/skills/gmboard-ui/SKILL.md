---
name: gmboard-ui
description: GM-Board frontend conventions — MUI dark fantasy theme, sx-prop styling, shared color helpers. Use before writing or changing any UI code in react-app/.
---

# GM-Board UI Conventions

GM-Board is a dark-only fantasy UI: gold primary (`#d7ad52`), parchment text on near-black paper, Georgia serif. All of this lives in `react-app/src/theme.js` — never hardcode these values in components.

## Styling rules

- Style exclusively with the MUI `sx` prop. Do not introduce `styled()` components, CSS files, or inline `style={}` — the codebase has zero of them and one idiom keeps it greppable.
- Reference theme tokens, not literals: `color: 'text.secondary'`, `bgcolor: 'background.paper'`, `borderColor: 'divider'`. A hex value in a component is almost always wrong; if a new color is genuinely needed, add it to the palette in `theme.js`.
- Entity tinting (class/species/feat chips, tokens) goes through the helpers in `react-app/src/shared/entityColors.js` (`chipTintStyle`, `ENTITY_COLORS`). Extend those helpers rather than computing alpha tints locally.
- The theme is dark-mode only. Never add `prefers-color-scheme` handling or light-mode variants.

## Component rules

- Icons come from `lucide-react`, not `@mui/icons-material`.
- `react-window` is installed but not yet used anywhere in `src` — there is no existing list pattern to copy. When building a NEW list that renders hundreds of rows, use it for virtualization instead of a plain `.map()`; do not retrofit existing lists unasked.
- Shared UI lives in `react-app/src/components/`; page-specific pieces stay under their page folder in `react-app/src/pages/<page>/`.
- Toasts go through `ToastProvider` / `AppToast` in `react-app/src/shared/` — do not add ad-hoc snackbars.

## Layout and responsiveness

- Builder and Sheet pages are dense, table-like layouts; preserve keyboard focus order and existing spacing rhythm (`theme.shape.borderRadius` is 8 — don't override per component).
- Use MUI responsive values (`sx={{ width: { xs: 1, md: 480 } }}`) instead of media queries.

## Verify

After UI changes run `cd react-app && npm run build` (the project's primary smoke check) and confirm no new console errors in the affected page.

import { useStyleShapes } from './themeIds.js';
import MomentParticles from './MomentParticles.jsx';

// What a roll's moment draws round its bubble, as the chosen style draws it
// (shapes.js moments.<moment>.effect): its particles (MomentParticles.jsx: a
// glyph, a mode, a look; the comic's sparkles popping and stars circling).
// Laid inside the bubble, which must be positioned; key it by the throw so it
// plays again, and give it the throw as `seed`.
export default function RollMomentEffect({ moment, seed = '' }) {
  const { moments } = useStyleShapes();
  return moment ? <MomentParticles {...moments[moment].effect} seed={seed} /> : null;
}

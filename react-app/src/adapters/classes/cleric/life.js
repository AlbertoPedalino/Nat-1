import { createAdapterBindings } from '../../adapterBindings.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetEffects,
    registerSubclassRuntimeConfig,
    registerSubclassSheetSpellModifiers,
  } = createAdapterBindings(registry, context);
// Life Domain (XPHB): tutte le feature sono passive, nessuna scelta di build.
// L3: Disciple of Life, Preserve Life (CD)
// L6: Blessed Healer
// L17: Supreme Healing
registerSubclassAdapter("Cleric_Life", function (cls, lv, specs) {
  // nessuna spec
});

registerSubclassSheetSpellModifiers("Cleric_Life", [
  function (ctx) {
    if (!ctx || ctx.kind !== "heal") return ctx?.formula;
    if (!ctx.usesSpellSlot) return ctx?.formula;
    if (!ctx.hasHealContext) return ctx?.formula;
    const castLevel = Number(ctx.castLevel || 0);
    if (!Number.isFinite(castLevel) || castLevel < 1) return ctx?.formula;

    const text = String(ctx.formula || "").replace(/\s+/g, "");
    const m = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) return ctx?.formula;

    const count = Number(m[1] || 0);
    const faces = Number(m[2] || 0);
    const mod = Number(m[3] || 0) + 2 + castLevel;
    if (!Number.isFinite(count) || !Number.isFinite(faces) || count < 1 || faces < 1) return ctx?.formula;
    return withModifier(`${count}d${faces}`, mod);
  }
]);

registerSubclassSheetActions("Cleric_Life", [
  { name: "Preserve Life", cat: "action", resKey: "channel_div",
    inlinePills: ({ ownerLevel }) => [
      { label: "Pool", value: `${Math.max(1, Number(ownerLevel || 1) * 5)} HP` }
    ] },
]);
}


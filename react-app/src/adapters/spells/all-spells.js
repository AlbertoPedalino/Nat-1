import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerGlobalSpellAdapter } = createAdapterBindings(registry, context);



  // Promote the _adapterData fields readers use to the top of the record.
  registerGlobalSpellAdapter(function (spell) {
    var out = spell && typeof spell === "object" ? Object.assign({}, spell) : spell;
    if (!out || typeof out !== "object") return out;

    var d = out._adapterData;
    if (!d || typeof d !== "object") return out;

    if (d.baseDie     != null) out.baseDie     = d.baseDie;
    if (d.upcastDie   != null) out.upcastDie   = d.upcastDie;
    if (d.heal          != null) out.heal          = d.heal;
    if (d.concentration != null) out.concentration = d.concentration;
    if (d.castingTime   != null) out.castingTime   = d.castingTime;
    if (d.duration      != null) out.durationText  = d.duration;
    if (d.range         != null) out.rangeText     = d.range;

    return out;
  });


}


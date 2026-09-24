// Live fog painting travels as deltas (see fogDelta in fog.js): each frame
// carries only the cells it flipped, numbered within its stroke. A receiver
// applies them in order; once one is missing — joined mid-stroke, a dropped
// frame — the rest of that stroke is ignored, and the full snapshot sent when
// the brush lifts (plus the saved row) puts everyone back on the same fog.

export function newFogStroke() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// `streams`: a Map kept by the receiver, one entry per painter.
export function acceptFogDelta(streams, actor, delta) {
  const seq = Number(delta?.seq);
  if (!delta?.stroke || !Number.isInteger(seq) || seq < 0) return false;
  const key = actor || 'unknown';
  const held = streams.get(key);
  if (!held || held.stroke !== delta.stroke) {
    streams.set(key, { stroke: delta.stroke, seq, broken: seq !== 0 });
  } else {
    held.broken = held.broken || seq !== held.seq + 1;
    held.seq = seq;
  }
  return !streams.get(key).broken;
}

import { useCallback, useEffect, useRef, useState } from 'react';

// A browser keeps only a handful of WebGL contexts per page — fewer on phones
// and tablets — and takes the oldest one away when another is opened. A
// canvas that goes away does not give its context back until it is garbage
// collected, so a long evening of weather changes and areas of effect piled
// them up until the weather's own context was the one taken: it broke there
// and then, and only switching the effect off and on again brought it back.
// Every overlay gives its context back the moment its canvas goes, and one
// whose context is taken anyway starts again on a new canvas, which is what
// that switch did by hand.

const RECOVERY_DELAY_MS = 400;
// Lost this often in this long, the GPU is not coming back: stop asking.
const LOSS_WINDOW_MS = 30000;
const MAX_LOSSES = 3;

export function releaseContext(gl) {
  try {
    if (gl && !gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch (_) {
    // Nothing more to give back.
  }
}

// `generation` keys the canvas: a new one is a new canvas, with a new context.
// `recover` is called from the canvas's webglcontextlost handler; `failed`
// says recovery gave up and the overlay should fall back to what it draws
// without WebGL. `reset` forgets the losses, for when the overlay is switched
// off.
export function useContextRecovery() {
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  const lossesRef = useRef([]);
  const timerRef = useRef(0);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const recover = useCallback(() => {
    const now = Date.now();
    lossesRef.current = [...lossesRef.current.filter((at) => now - at < LOSS_WINDOW_MS), now];
    clearTimeout(timerRef.current);
    if (lossesRef.current.length > MAX_LOSSES) {
      setFailed(true);
      return;
    }
    timerRef.current = setTimeout(() => setGeneration((value) => value + 1), RECOVERY_DELAY_MS);
  }, []);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    lossesRef.current = [];
    setFailed(false);
  }, []);

  return { generation, failed, recover, reset };
}

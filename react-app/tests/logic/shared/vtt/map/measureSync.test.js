import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEASURE_BROADCAST_MS,
  MEASURE_KEEPALIVE_MS,
  createMeasurePublisher,
  nearlySameMeasure,
} from '../../../../../src/shared/vtt/map/measureSync.js';

function harness() {
  let clock = 0;
  let nextId = 1;
  const timers = new Map();
  const sent = [];
  const publisher = createMeasurePublisher({
    send: (value) => sent.push(value),
    now: () => clock,
    schedule: (run, ms) => { const id = nextId++; timers.set(id, { run, at: clock + ms }); return id; },
    cancel: (id) => timers.delete(id),
  });
  const advance = (ms) => {
    const until = clock + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      clock = due[1].at;
      due[1].run();
    }
    clock = until;
  };
  return { publisher, sent, advance, timers };
}

const ruler = (x, label = `${x}`) => ({ shape: 'line', from: { x: 0, y: 0 }, to: { x, y: 0 }, label });

test('a fast drag is thinned to one message per interval, the last position included', () => {
  const { publisher, sent, advance } = harness();
  publisher.update(ruler(1));
  for (let step = 2; step <= 20; step += 1) {
    advance(5);
    publisher.update(ruler(step));
  }
  // 95ms of pointer moves: the first at once, then trailing sends.
  advance(MEASURE_BROADCAST_MS);
  assert.ok(sent.length <= 3, `sent ${sent.length}`);
  assert.deepEqual(sent.at(-1), ruler(20));
});

test('a position already sent is not sent again', () => {
  const { publisher, sent, advance } = harness();
  publisher.update(ruler(1));
  advance(100);
  publisher.update({ ...ruler(1), to: { x: 1.01, y: 0.01 } });
  advance(100);
  assert.equal(sent.length, 1);
  assert.equal(nearlySameMeasure(ruler(1), ruler(2)), false);
});

test('release always clears the table, and only if it was shown something', () => {
  const { publisher, sent, advance } = harness();
  publisher.finish();
  assert.deepEqual(sent, []);
  publisher.update(ruler(1));
  advance(10);
  publisher.update(ruler(5));
  publisher.finish();
  advance(1000);
  assert.deepEqual(sent, [ruler(1), null]);
});

test('a ruler held still is refreshed for the receivers, and stops after release', () => {
  const { publisher, sent, advance } = harness();
  publisher.update(ruler(3));
  advance(MEASURE_KEEPALIVE_MS * 2 + 1);
  assert.equal(sent.length, 3);
  publisher.finish();
  advance(MEASURE_KEEPALIVE_MS * 3);
  assert.equal(sent.at(-1), null);
  assert.equal(sent.length, 4);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { promptText } from '../../../../src/shared/ui/promptText.js';

test('the answer comes back trimmed, the prompt shows the current value', () => {
  let shown;
  const answer = promptText('Scene name', 'Tavern', (message, initial) => { shown = [message, initial]; return '  Ambush  '; });
  assert.equal(answer, 'Ambush');
  assert.deepEqual(shown, ['Scene name', 'Tavern']);
});

test('a cancelled or empty prompt answers null', () => {
  assert.equal(promptText('Name', '', () => null), null);
  assert.equal(promptText('Name', '', () => '   '), null);
});

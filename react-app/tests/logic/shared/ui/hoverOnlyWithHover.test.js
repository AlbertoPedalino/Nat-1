import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compile, middleware, prefixer, rulesheet, serialize, stringify } from 'stylis';
import { gateHover } from '../../../../src/shared/ui/hoverOnlyWithHover.js';

// The rules the cache would insert, as Emotion's own serializer builds them.
function inserted(css) {
  const rules = [];
  serialize(compile(css), middleware([prefixer, gateHover, stringify, rulesheet((rule) => rules.push(rule))]));
  return rules;
}

describe('hover only where there is a hover', () => {
  it('gates a hover rule under (hover: hover)', () => {
    assert.deepEqual(inserted('.a{color:red;&:hover{color:blue;}}'), [
      '.a{color:red;}',
      '@media (hover: hover){.a:hover{color:blue;}}',
    ]);
  });

  it('splits a list that mixes hover with focus', () => {
    assert.deepEqual(inserted('.a{&:hover,&:focus-visible{color:blue;}}'), [
      '@media all{.a:focus-visible{color:blue;}@media (hover: hover){.a:hover{color:blue;}}}',
    ]);
  });

  it('gates a hover inside another media query', () => {
    assert.deepEqual(inserted('@media (min-width:900px){.a:hover{color:blue;}}'), [
      '@media (min-width:900px){@media (hover: hover){.a:hover{color:blue;}}}',
    ]);
  });

  it("leaves the author's own hover query alone", () => {
    assert.deepEqual(inserted('.a:hover{color:blue;@media (hover: none){color:red;}}'), [
      '@media (hover: hover){.a:hover{color:blue;}}',
      '@media (hover: none){.a:hover{color:red;}}',
    ]);
  });

  it('leaves rules without hover as they are', () => {
    assert.deepEqual(inserted('.a{color:red;&:focus-visible{color:blue;}}'), [
      '.a{color:red;}',
      '.a:focus-visible{color:blue;}',
    ]);
  });
});

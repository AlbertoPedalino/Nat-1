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

  it("leaves the author's own (hover: hover) query as it is", () => {
    assert.deepEqual(inserted('@media (hover: hover){.a:hover{color:blue;}}'), [
      '@media (hover: hover){.a:hover{color:blue;}}',
    ]);
  });

  // MUI's IconButton and ToggleButton reset their hover fill to transparent
  // on a touch device; with every hover gated that reset only emptied the
  // button a finger had just tapped (the battle map showed through it).
  it('drops a touch device hover reset', () => {
    assert.deepEqual(inserted('.a:hover{background-color:gold;@media (hover: none){background-color:transparent;}}'), [
      '@media (hover: hover){.a:hover{background-color:gold;}}',
    ]);
  });

  it('keeps what else a (hover: none) query holds', () => {
    assert.deepEqual(inserted('@media (hover: none){.a{opacity:1;}}'), [
      '@media (hover: none){.a{opacity:1;}}',
    ]);
  });

  it('leaves rules without hover as they are', () => {
    assert.deepEqual(inserted('.a{color:red;&:focus-visible{color:blue;}}'), [
      '.a{color:red;}',
      '.a:focus-visible{color:blue;}',
    ]);
  });
});

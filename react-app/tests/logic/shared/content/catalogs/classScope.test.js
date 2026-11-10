import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classScopedData,
  fixedSubclassShortName,
  resolveClassData,
  ruleClassOf,
} from '../../../../../src/shared/content/catalogs/classScope.js';

// A World of Warcraft class skin is a `_copy` of an XPHB class: the base
// class's features and subclasses, its own swaps on top.
const paladin = {
  name: 'Paladin', source: 'XPHB', hd: { faces: 10 },
  classFeatures: ['Lay on Hands|Paladin|XPHB|1', 'Channel Divinity|Paladin|XPHB|3', { classFeature: 'Paladin Subclass|Paladin|XPHB|3', gainSubclassFeature: true }],
};
const deathKnight = {
  name: 'Death Knight', source: 'WoW', reskinOf: ['Paladin|XPHB'], isHero: true,
  _copy: { name: 'Paladin', source: 'XPHB' }, includeSubclassesFrom: ['Paladin|XPHB'],
  classFeatures: ['Death Coil|Death Knight|WoW|1', 'Channel Divinity|Paladin|XPHB|3', { classFeature: 'Death Knight Subclass|Death Knight|WoW|3', gainSubclassFeature: true }],
};
const druidWow = { name: 'Druid', source: 'WoW', reskinOf: ['Druid|XPHB'], _copy: { name: 'Druid', source: 'XPHB' }, includeSubclassesFrom: ['Druid|XPHB'] };
const druid = { name: 'Druid', source: 'XPHB', classFeatures: ['Wild Shape|Druid|XPHB|2'] };

const feature = (name, className, classSource, level, entries = []) => ({ name, className, classSource, level, source: classSource, entries });
const classFeatures = [
  feature('Lay on Hands', 'Paladin', 'XPHB', 1),
  feature('Channel Divinity', 'Paladin', 'XPHB', 3, [{ type: 'refClassFeature', classFeature: 'Divine Sense|Paladin|XPHB|3' }]),
  feature('Divine Sense', 'Paladin', 'XPHB', 3),
  feature('Paladin Subclass', 'Paladin', 'XPHB', 3),
  feature('Death Coil', 'Death Knight', 'WoW', 1),
  feature('Death Knight Subclass', 'Death Knight', 'WoW', 3),
  feature('Wild Shape', 'Druid', 'XPHB', 2),
];
const moon = { name: 'Circle of the Moon', shortName: 'Moon', source: 'XPHB', className: 'Druid', classSource: 'XPHB', subclassFeatures: ['Circle of the Moon|Druid|XPHB|Moon|XPHB|3'] };
const devotion = { name: 'Oath of Devotion', shortName: 'Devotion', source: 'XPHB', className: 'Paladin', classSource: 'XPHB', subclassFeatures: [] };
const ebonBlade = { name: 'Oath of the Ebon Blade', shortName: 'Ebon Blade', source: 'WoW', className: 'Death Knight', classSource: 'WoW', subclassFeatures: [] };
const subclassFeatures = [
  { name: 'Circle of the Moon', className: 'Druid', classSource: 'XPHB', subclassShortName: 'Moon', subclassSource: 'XPHB', level: 3, source: 'XPHB', entries: [] },
];

function load() {
  const allClasses = [paladin, deathKnight, druid, druidWow];
  return resolveClassData({
    allClasses, classes: allClasses, allSubclasses: [moon, devotion, ebonBlade], subclasses: [moon, devotion, ebonBlade], classFeatures, subclassFeatures,
  });
}

test('a skin comes resolved with its rule class and the base features it replaces', () => {
  const data = load();
  const dk = data.classes.find((cls) => cls.name === 'Death Knight');
  assert.equal(dk.source, 'WoW');
  assert.deepEqual(dk.ruleClass, { name: 'Paladin', source: 'XPHB' });
  assert.deepEqual(dk.removedFeatures, ['Lay on Hands', 'Paladin Subclass']);
  assert.equal(dk.hd.faces, 10);
  assert.equal(ruleClassOf(dk), 'Paladin');
  assert.equal(ruleClassOf(paladin), 'Paladin');
});

test('a skin lists its own and kept base features, named after it', () => {
  const data = load();
  const dk = data.classes.find((cls) => cls.name === 'Death Knight');
  const { allFeatures } = classScopedData(data, dk);
  // A nested feature follows its parent (Divine Sense inside Channel Divinity).
  assert.deepEqual(allFeatures.map((f) => f.name), ['Death Coil', 'Channel Divinity', 'Divine Sense', 'Death Knight Subclass']);
  assert.ok(allFeatures.every((f) => f.className === 'Death Knight'));
});

test('a renamed skin inherits the base class features and subclasses', () => {
  const data = load();
  const skin = data.classes.find((cls) => cls.name === 'Druid' && cls.source === 'WoW');
  const { allFeatures, subclasses, allSubFeatures } = classScopedData(data, skin);
  assert.deepEqual(allFeatures.map((f) => f.name), ['Wild Shape']);
  assert.deepEqual(subclasses.map((s) => `${s.shortName}|${s.className}|${s.classSource}`), ['Moon|Druid|WoW']);
  assert.deepEqual(allSubFeatures.map((f) => `${f.name}|${f.classSource}`), ['Circle of the Moon|WoW']);
});

test('Death Knight and Demon Hunter fix their own subclass, the Evoker does not', () => {
  const data = load();
  const dk = data.classes.find((cls) => cls.name === 'Death Knight');
  // The Paladin's subclasses are listed under it too, but are not its own.
  const { subclasses } = classScopedData(data, dk);
  assert.deepEqual(subclasses.map((sub) => sub.shortName), ['Ebon Blade', 'Devotion']);
  assert.equal(fixedSubclassShortName(dk, subclasses), 'Ebon Blade');
  const evoker = { name: 'Evoker', source: 'WoW', isHero: true };
  assert.equal(fixedSubclassShortName(evoker, [{ shortName: 'Draconic', className: 'Evoker', classSource: 'WoW', isReprint: true }]), null);
  assert.equal(fixedSubclassShortName(druid, data.subclasses), null);
});

test('a skin keeps the spells of its own features apart', () => {
  const dk = resolveClassData({
    allClasses: [paladin], classes: [{ ...deathKnight, additionalSpells: [{ prepared: { 2: ['rune strike|wow'] } }] }],
    allSubclasses: [], subclasses: [], classFeatures, subclassFeatures: [],
  }).classes[0];
  assert.equal(dk.skinAdditionalSpells.length, 1);
});

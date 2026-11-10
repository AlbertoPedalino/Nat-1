import { createAdapterBindings } from '../../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    _ARTISAN_TOOLS,
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
  } = createAdapterBindings(registry, context);
const _BM_MANEUVERS = [
  'Ambush', 'Bait and Switch', "Commander's Strike", 'Commanding Presence',
  'Disarming Attack', 'Distracting Strike', 'Evasive Footwork', 'Feinting Attack',
  'Goading Attack', 'Lunging Attack', 'Maneuvering Attack', 'Menacing Attack',
  'Parry', 'Precision Attack', 'Pushing Attack', 'Rally',
  'Riposte', 'Sweeping Attack', 'Tactical Assessment', 'Trip Attack',
];

const _BM_STUDENT_SKILLS = [
  'Acrobatics', 'Animal Handling', 'Athletics', 'History',
  'Insight', 'Intimidation', 'Perception', 'Survival',
];

// +3 a L3, +2 a L7, +2 a L10, +2 a L15 (totale max 9)
const _BM_SLOTS = [
  { idx: 1, level: 3 }, { idx: 2, level: 3 }, { idx: 3, level: 3 },
  { idx: 4, level: 7 }, { idx: 5, level: 7 },
  { idx: 6, level: 10 }, { idx: 7, level: 10 },
  { idx: 8, level: 15 }, { idx: 9, level: 15 },
];

registerSubclassAdapter("Fighter_Battle Master", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_bm_student_tool',
      label: "Student of War — Artisan's Tool",
      type: 'generic_choice',
      from: _ARTISAN_TOOLS || [],
      count: 1,
      level: 3
    });
    specs.push({
      key: 'subclass_bm_student_skill',
      label: "Student of War — Skill Proficiency",
      type: 'skill_choice',
      from: _BM_STUDENT_SKILLS,
      count: 1,
      level: 3
    });
  }
  _BM_SLOTS.forEach(function (slot) {
    if (lv >= slot.level) {
      specs.push({
        key: 'subclass_bm_maneuver_' + slot.idx,
        label: 'Battle Maneuver ' + slot.idx,
        type: 'generic_choice',
        from: _BM_MANEUVERS,
        count: 1,
        level: slot.level
      });
    }
  });
});

registerSubclassSheetActions("Fighter_Battle Master", [
  { name: "Combat Maneuvers", cat: "attack", resKey: "superiority_dice", minLevel: 3 },
  { name: "Know Your Enemy", cat: "bonus", resKey: "know_your_enemy", minLevel: 7 },
  { name: "Relentless", cat: "action", minLevel: 15 },
]);
registerSubclassSheetResources("Fighter_Battle Master", [
  { key: "superiority_dice", name: "Superiority Dice", actionName: "Combat Maneuvers", recharge: "SR",
    max: (lv) => lv >= 15 ? 6 : lv >= 7 ? 5 : 4,
    die: (lv) => lv >= 18 ? "d12" : lv >= 10 ? "d10" : "d8",
    pool: true, track: "used" },
  { key: "know_your_enemy", name: "Know Your Enemy", recharge: "LR", max: () => 1 },
]);

registerSubclassSheetEffects("Fighter_Battle Master", [

  { type: "toolProficiency", count: 1, minLevel: 3, note: "Student of War: artisan's tool choice." },
  { type: "skillProficiency", values: ["History", "Insight", "Performance", "Persuasion"], count: 1, minLevel: 3, note: "Student of War." },
]);

}


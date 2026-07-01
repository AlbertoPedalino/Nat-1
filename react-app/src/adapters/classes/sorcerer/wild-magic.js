import { createAdapterBindings } from '../../adapterBindings.js';
import { classLevel } from '../../../shared/character/classLevel.js';

export default function install(registry, context = {}) {
  const {
    registerSubclassAdapter,
    registerSubclassSheetActions,
    registerSubclassSheetResources,
    registerSubclassSheetEffects,
    registerResourceSideEffect,
  } = createAdapterBindings(registry, context);

registerSubclassAdapter("Sorcerer_Wild Magic", function (cls, lv, specs) {});

registerSubclassSheetActions("Sorcerer_Wild Magic", [
  {
    "name": "Wild Magic",
    "icon": "",
    "cat": "action",
    "uses": "Special",
    "minLevel": 3,
    "detailType": "panel",
    "desc": "Tides of Chaos, Wild Magic Surge and related Sorcerer features. Click to expand.",
    "detail": {
      "levelClass": "Sorcerer",
      "sections": [
        {
          "title": "Wild Magic Surge (Lv.3)",
          "minLevel": 3,
          "body": "Once per turn, after casting a <b>Sorcerer spell with a spell slot</b>, you can roll <b>d20</b>.<br/>On a <b>20</b> → roll <b>d100</b> on the Wild Magic Surge table.<br/>The effect is too wild to be affected by Metamagic."
        },
        {
          "title": "Tides of Chaos (Lv.3)",
          "minLevel": 3,
          "body": "Give yourself <b>Advantage</b> on one <b>d20 test</b> before rolling.<br/>If you cast a <b>Sorcerer spell with a spell slot</b> before recharging via Long Rest, you automatically roll on the <b>Wild Magic Surge table</b>.<br/>Recharge: <b>Long Rest</b> or after rolling on the <b>Wild Magic Surge table</b>."
        },
        {
          "title": "Bend Luck (Lv.6)",
          "minLevel": 6,
          "body": "<b>Reaction</b> — after a creature you see rolls a <b>d20 test</b>, spend <b>1 Sorcery Point</b> to roll <b>1d4</b>.<br/>Add or subtract the result from that roll (your choice)."
        },
        {
          "title": "Controlled Chaos (Lv.14)",
          "minLevel": 14,
          "accent": "#70b7a6",
          "body": "<b>Passive</b> — when you roll on the Wild Magic Surge table, roll <b>twice</b> and pick either result."
        },
        {
          "title": "Tamed Surge (Lv.18)",
          "minLevel": 18,
          "body": "<b>1 / Long Rest.</b> After casting a Sorcerer spell with a slot, choose an effect from the Wild Magic Surge table instead of rolling.<br/>Can't choose the <b>final row</b>. If the chosen effect requires a roll, you must make it."
        }
      ],
      "roll": {
        "tableKey": "wildMagicSurge",
        "title": "Roll Wild Magic Surge Table",
        "subtitle": "Roll d100 on the Wild Magic Surge table.",
        "label": "Roll d100",
        "dualRollFromLevel": 14,
        "dualLabel": "Roll Two (Controlled Chaos)",
        "dualNote": "Controlled Chaos active: roll twice and pick either result.",
        "sourceLink": "https://5e.tools/tables.html",
        "sourceLinkLabel": "Open Wild Magic Surge table on 5e.tools"
      }
    }
  },
  {
    "name": "Bend Luck",
    "icon": "",
    "cat": "reaction",
    "uses": "1 Sorcery Point",
    "resKey": "sorc_pts",
    "minLevel": 6,
    "desc": "Reaction — immediately after another creature you can see rolls a d20 for a D20 Test: spend 1 Sorcery Point to roll 1d4 and apply the number as a bonus or penalty (your choice) to the d20 roll."
  }
]);
registerSubclassSheetResources("Sorcerer_Wild Magic", [
  {
    "key": "wild_magic",
    "name": "Wild Magic",
    "icon": "zap",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  },
  {
    "key": "wild_tides",
    "name": "Tides of Chaos",
    "icon": "zap",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "wild_tamed",
    "name": "Tamed Surge",
    "icon": "sparkles",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Wild Magic", [
  { type: "advantage", target: "d20", minLevel: 3, note: "Tides of Chaos." },
  { type: "rollModifier", minLevel: 6, note: "Bend Luck: add/subtract 1d4." },
  { type: "passiveNote", minLevel: 14, note: "Controlled Chaos: roll twice on Wild Magic Surge table and pick either result." },
  { type: "passiveNote", minLevel: 18, note: "Tamed Surge: pick a non-final Wild Magic Surge effect 1/LR instead of rolling." },
]);

function getSorcererLevel(C) {
  return classLevel(C, 'Sorcerer');
}

if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('wild_magic', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    const sorcererLevel = getSorcererLevel(C);
    if (sorcererLevel < 3) return null;
    const resources = ctx.resources || {};
    return {
      type: 'wild_magic_controller',
      sorcererLevel,
      tidesAvailable: (resources.wild_tides || 0) > 0,
      tamedAvailable: (resources.wild_tamed || 0) > 0,
      label: 'Wild Magic',
    };
  });
}
}

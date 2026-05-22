// Narrative effects (advantage/disadvantage, immunity-by-condition, attacker
// modifiers, etc.) for items whose mechanics 5etools expresses only in
// `entries` text. Keyed by `"Item Name|SOURCE"`.
//
// Each effect bag may contain:
//   advantageOnSkill:                       ['stealth', ...]
//   advantageOnSaveAgainst:                 ['spell', 'poison', ...]
//   disadvantageOnAttackersAgainstYou:      'note shown in chip'
//   conditionImmunities:                    ['grappled', 'paralyzed', ...]
//   passiveTraits:                          ['short note for chip']
//
// Adding an entry here is the canonical way to enable an item's narrative
// effect in calculations — no per-item code is needed.

export const ITEM_NARRATIVE_EFFECTS = {
  // Cloak of Elvenkind: advantage on Dex (Stealth) checks while hooded.
  'Cloak of Elvenkind|XDMG': {
    advantageOnSkill: ['stealth'],
  },

  // Boots of Elvenkind: footsteps make no sound; advantage on Stealth checks
  // made to move silently (treated as full Stealth adv for simplicity).
  'Boots of Elvenkind|XDMG': {
    advantageOnSkill: ['stealth'],
  },

  // Cloak of Displacement: attackers have disadvantage on attack rolls until
  // you take damage / become incapacitated. Pipeline treats as always-on; the
  // user reads the chip note to know the caveat.
  'Cloak of Displacement|XDMG': {
    disadvantageOnAttackersAgainstYou: 'Until you take damage or are incapacitated',
  },

  // Mantle of Spell Resistance: advantage on saves vs spells.
  'Mantle of Spell Resistance|XDMG': {
    advantageOnSaveAgainst: ['spell'],
  },

  // Spellguard Shield: advantage on saves vs spells/magical effects;
  // attackers have disadvantage on spell attacks against you.
  'Spellguard Shield|XDMG': {
    advantageOnSaveAgainst: ['spell'],
    disadvantageOnAttackersAgainstYou: 'Vs spell attacks only',
  },

  // Robe of Eyes: advantage on Perception/Investigation/Insight checks that
  // rely on sight; can't be blinded by surprise.
  'Robe of Eyes|XDMG': {
    advantageOnSkill: ['perception', 'investigation', 'insight'],
  },

  // Gloves of Swimming and Climbing: advantage on Athletics for swim/climb.
  'Gloves of Swimming and Climbing|XDMG': {
    advantageOnSkill: ['athletics'],
  },

  // Necklace of Adaptation: advantage on saves vs harmful gases.
  'Necklace of Adaptation|XDMG': {
    advantageOnSaveAgainst: ['poison gas'],
  },

  // Amulet of Proof against Detection and Location: hidden from divination
  // magic; advantage on saves vs divination spells.
  'Amulet of Proof against Detection and Location|XDMG': {
    advantageOnSaveAgainst: ['divination'],
  },

  // Ring of Free Action: movement can't be reduced; immune to grappled,
  // paralyzed, restrained.
  'Ring of Free Action|XDMG': {
    advantageOnSaveAgainst: ['restraint'],
    conditionImmunities: ['grappled', 'paralyzed', 'restrained'],
    passiveTraits: ['Movement not reduced by magic/spells'],
  },

  // Ring of Feather Falling: no falling damage.
  'Ring of Feather Falling|XDMG': {
    passiveTraits: ['No falling damage'],
  },

  // Ring of Mind Shielding: thoughts can't be read; immune to scrying/charmed
  // by telepathic effects.
  'Ring of Mind Shielding|XDMG': {
    advantageOnSaveAgainst: ['divination'],
    passiveTraits: ['Thoughts/alignment hidden', 'Telepathy-only-with-consent'],
  },

  // Periapt of Health: immune to contracting disease.
  'Periapt of Health|XDMG': {
    passiveTraits: ['Immune to contracting disease'],
  },

  // Periapt of Wound Closure: auto-stabilize at 0 HP on each turn; HD heal
  // doubled effectiveness.
  'Periapt of Wound Closure|XDMG': {
    passiveTraits: ['Auto-stabilize at 0 HP', 'Hit Dice heal doubled'],
  },

  // Ioun Stone, Awareness: can't be surprised.
  'Ioun Stone, Awareness|XDMG': {
    passiveTraits: ["Can't be surprised"],
  },

  // Ioun Stone, Sustenance: no food/water needed.
  'Ioun Stone, Sustenance|XDMG': {
    passiveTraits: ['No food or water needed'],
  },

  // Ioun Stone, Regeneration: regain 15 HP/hour if at least 1 HP.
  'Ioun Stone, Regeneration|XDMG': {
    passiveTraits: ['Regain 15 HP/hour (above 0 HP)'],
  },

  // Amulet of Health: already has structured ability override — narrative
  // note covers the "no effect if CON >= 19" clause for transparency.

  // Gloves of Missile Snaring: reaction to halve ranged damage.
  'Gloves of Missile Snaring|XDMG': {
    passiveTraits: ['Reaction: halve ranged weapon damage'],
  },

  // Cloak of Protection: covered by structured `bonusAc` + `bonusSavingThrow`
  // already. No narrative entry needed.

  // Hat of Wizardry: bonus cantrip + once/day spell.
  'Hat of Wizardry|XDMG': {
    passiveTraits: ['+1 wizard cantrip known', '1/day disguise self / minor illusion / prestidigitation'],
  },

  // Cloak of the Bat: advantage on Stealth; conditional fly 40 in dim/dark.
  'Cloak of the Bat|XDMG': {
    advantageOnSkill: ['stealth'],
    passiveTraits: ['Fly 40 ft in Dim Light or Darkness (grip cloak)'],
  },

  // Cloak of Arachnida: spider climb + web immunity, no save vs poison from spiders.
  'Cloak of Arachnida|XDMG': {
    advantageOnSaveAgainst: ['poison'],
    passiveTraits: ['Spider Climb (climb speed = walk)', 'Move through webs without hindrance'],
  },

  // Boots of Speed: bonus action double speed 10 min; attackers DIS when active.
  'Boots of Speed|XDMG': {
    passiveTraits: ['Bonus Action: double Speed 10 min/day', 'Attackers DIS while active'],
  },

  // Winged Boots: fly 30 ft for 4 hours/day total (limited use, modifySpeed handled).
  'Winged Boots|XDMG': {
    passiveTraits: ['Fly 30 ft up to 4 hours/day'],
  },

  // Eyes of Minute Seeing: see fine detail at 1 ft → adv Investigation close-up.
  'Eyes of Minute Seeing|XDMG': {
    advantageOnSkill: ['investigation'],
    passiveTraits: ['See fine detail within 1 ft as if normal'],
  },

  // Eyes of the Eagle: adv on Perception checks involving sight.
  'Eyes of the Eagle|XDMG': {
    advantageOnSkill: ['perception'],
  },

  // Ring of Spell Turning: adv on saves vs any spell that targets only you;
  // crit-success reflects spell back.
  'Ring of Spell Turning|XDMG': {
    advantageOnSaveAgainst: ['spell'],
    passiveTraits: ['Reflect spell on save crit (single-target spells)'],
  },

  // Sentinel Shield: adv on Initiative + Perception.
  'Sentinel Shield|XDMG': {
    advantageOnSkill: ['perception'],
    passiveTraits: ['Advantage on Initiative'],
  },

  // Talisman of the Sphere: adv Arcana to control Sphere of Annihilation.
  'Talisman of the Sphere|XDMG': {
    advantageOnSkill: ['arcana'],
  },

  // Perfume of Bewitching: 1-hour adv on Charisma checks (limited consumable);
  // surface as passive note (user tracks 1h duration).
  'Perfume of Bewitching|XDMG': {
    advantageOnSkill: ['deception', 'persuasion'],
    passiveTraits: ['1 hour (after application)'],
  },

  // Boots of False Tracks: leaves different humanoid tracks.
  'Boots of False Tracks|XDMG': {
    passiveTraits: ['Leaves false humanoid footprints'],
  },

  // Gloves of Thievery: +5 bonus to Sleight of Hand and lockpicking.
  'Gloves of Thievery|XDMG': {
    passiveTraits: ['+5 to Sleight of Hand', '+5 to Dex checks to pick locks'],
  },

  // Goggles of Night: darkvision 60 ft (no structured field in 5etools).
  'Goggles of Night|XDMG': {
    passiveTraits: ['Darkvision 60 ft (worn)'],
  },

  // Lantern of Revealing: invisible creatures visible in 30 ft bright light.
  'Lantern of Revealing|XDMG': {
    passiveTraits: ['Reveals invisible creatures within 30 ft (bright)'],
  },

  // Slippers of Spider Climbing: climb speed = walk, walk on ceilings (no
  // structured modifySpeed in 5etools for this item).
  'Slippers of Spider Climbing|XDMG': {
    passiveTraits: ['Climb speed = walk', 'Climb walls/ceilings hands-free'],
  },

  // Necklace of Prayer Beads: bead spells via Bonus Action.
  'Necklace of Prayer Beads|XDMG': {
    passiveTraits: ['Bonus Action to cast bead spells'],
  },

  // Ring of Jumping: bonus action cast Jump on self.
  'Ring of Jumping|XDMG': {
    passiveTraits: ['Bonus Action: cast Jump on self'],
  },

  // Pipes of Haunting: 30-ft fear save (active), no passive numeric.
  // Skipped (active ability).
};

function narrativeKey(name, source) {
  if (!name) return '';
  return source ? `${name}|${source}` : name;
}

export function getItemNarrativeEffects(name, source) {
  return ITEM_NARRATIVE_EFFECTS[narrativeKey(name, source)] || null;
}

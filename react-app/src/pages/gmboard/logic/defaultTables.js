const DEF_WEATHER = [
  { s: 'Spring', sole: 10, pioggia: 19 },
  { s: 'Summer', sole: 16, pioggia: 20 },
  { s: 'Autumn', sole: 8, pioggia: 19 },
  { s: 'Winter', sole: 4, pioggia: 10 },
];

const DEF_EVENTS = [
  { r: 2, name: 'Dungeon', type: 'other' },
  { r: 3, name: 'Cave', type: 'other' },
  { r: 4, name: 'Ruins', type: 'other' },
  { r: 5, name: 'Obstacle', type: 'other' },
  { r: 6, name: 'Encounter', type: 'encounter' },
  { r: 7, name: 'Encounter', type: 'encounter' },
  { r: 8, name: 'Env. Damage/Trap', type: 'other' },
  { r: 9, name: 'Env. Damage/Trap', type: 'other' },
  { r: 10, name: 'Enemy Camp', type: 'camp_nemico' },
  { r: 11, name: 'Enemy Camp', type: 'camp_nemico' },
  { r: 12, name: 'Battlefield', type: 'other' },
  { r: 13, name: 'Battlefield', type: 'other' },
  { r: 14, name: 'Abandoned Structure', type: 'other' },
  { r: 15, name: 'Abandoned Structure', type: 'other' },
  { r: 16, name: 'Merchant/Traveler', type: 'other' },
  { r: 17, name: 'Merchant/Traveler', type: 'other' },
  { r: 18, name: 'Tracks/Clues', type: 'other' },
  { r: 19, name: 'Tracks/Clues', type: 'other' },
  { r: 20, name: 'Loot', type: 'loot' },
  { r: 21, name: 'Loot', type: 'loot' },
  { r: 22, name: 'Loot', type: 'loot' },
  { r: 23, name: 'Friendly Signs', type: 'other' },
  { r: 24, name: 'Friendly Signs', type: 'other' },
  { r: 25, name: 'Merchant/Traveler', type: 'other' },
  { r: 26, name: 'Merchant/Traveler', type: 'other' },
  { r: 27, name: 'Inhabited Structure', type: 'other' },
  { r: 28, name: 'Inhabited Structure', type: 'other' },
  { r: 29, name: 'Sacred Place', type: 'other' },
  { r: 30, name: 'Sacred Place', type: 'other' },
  { r: 31, name: 'Friendly Camp', type: 'other' },
  { r: 32, name: 'Friendly Camp', type: 'other' },
  { r: 33, name: 'Env. Damage/Trap', type: 'other' },
  { r: 34, name: 'Env. Damage/Trap', type: 'other' },
  { r: 35, name: 'Encounter', type: 'encounter' },
  { r: 36, name: 'Encounter', type: 'encounter' },
  { r: 37, name: 'Obstacle', type: 'other' },
  { r: 38, name: 'Ruins', type: 'other' },
  { r: 39, name: 'Cave', type: 'other' },
  { r: 40, name: 'Dungeon', type: 'other' },
];

const DEF_LOOT = [
  { r: 2, tipo: 'Cursed Item', rarita: 'Legendary', qualita: 'Corrupted', valore: '75×Lv', extra: '(1/4 val)' },
  { r: 3, tipo: 'Weapon / Armor', rarita: 'Very Rare', qualita: 'Damaged', valore: '60×Lv', extra: '(1/4 val)' },
  { r: 4, tipo: 'Magic Item', rarita: 'Rare', qualita: 'Damaged', valore: '45×Lv', extra: '(1/4 val)' },
  { r: 5, tipo: 'Weapon / Armor', rarita: 'Uncommon', qualita: 'Damaged', valore: '5×Lv', extra: '(1/4 val)' },
  { r: 6, tipo: 'Equipment', rarita: 'Common', qualita: 'Damaged', valore: '2.5×Lv', extra: '(1/4 val)' },
  { r: 7, tipo: 'Materials', rarita: 'Common', qualita: 'Damaged', valore: '2.5×Lv', extra: '(1/4 val)' },
  { r: 8, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 9, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 10, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 11, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 12, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 13, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 14, tipo: 'Nothing found', rarita: '—', qualita: '—', valore: '—', extra: '' },
  { r: 15, tipo: 'Consumable', rarita: 'Common', qualita: 'Standard', valore: '10×Lv', extra: '' },
  { r: 16, tipo: 'Weapon / Armor', rarita: 'Common', qualita: 'Fine', valore: '10×Lv', extra: '' },
  { r: 17, tipo: 'Magic Item', rarita: 'Uncommon', qualita: 'Masterwork', valore: '20×Lv', extra: '' },
  { r: 18, tipo: 'Magic Weapon / Armor', rarita: 'Rare', qualita: 'Masterwork', valore: '180×Lv', extra: '' },
  { r: 19, tipo: 'Magic Weapon / Armor', rarita: 'Very Rare', qualita: 'Pristine', valore: '240×Lv', extra: '' },
  { r: 20, tipo: 'Artifact / Relic', rarita: 'Legendary', qualita: 'Pristine', valore: '300×Lv', extra: '' },
];

const DEF_COMPL = [
  { r: 2, type: 'Encounter' }, { r: 3, type: 'Environment Damage' }, { r: 4, type: 'Environment' },
  { r: 5, type: 'Encounter' }, { r: 6, type: 'Environment Damage' }, { r: 7, type: 'Environment' },
  { r: 8, type: 'None' }, { r: 9, type: 'None' }, { r: 10, type: 'None' }, { r: 11, type: 'None' },
  { r: 12, type: 'None' }, { r: 13, type: 'None' }, { r: 14, type: 'None' },
  { r: 15, type: 'Environment' }, { r: 16, type: 'Environment Damage' }, { r: 17, type: 'Encounter' },
  { r: 18, type: 'Environment' }, { r: 19, type: 'Environment Damage' }, { r: 20, type: 'Encounter' },
];

function mkEnc(data) {
  return data.map(([r, diff, lv, xp]) => ({ r, diff, lv, xp }));
}

const DEF_ENC = [
  mkEnc([[2, 'High', '4', 500], [3, 'High', '4', 500], [4, 'High', '4', 400], [5, 'High', '3', 375], [6, 'Moderate', '3', 250], [7, 'Moderate', '3', 225], [8, 'Moderate', '2', 225], [9, 'Moderate', '2', 200], [10, 'Moderate', '2', 200], [11, 'Moderate', '2', 150], [12, 'Moderate', '2', 150], [13, 'Moderate', '1', 150], [14, 'Low', '1', 100], [15, 'Low', '1', 100], [16, 'Low', '1', 100], [17, 'Low', '1', 100], [18, 'Low', '1', 75], [19, 'Low', '1', 75], [20, 'Low', '1', 50], [21, 'Low', '1', 50], [22, 'Low', '1', 50], [23, 'Low', '1', 75], [24, 'Low', '1', 75], [25, 'Low', '1', 100], [26, 'Low', '1', 100], [27, 'Low', '1', 100], [28, 'Low', '1', 100], [29, 'Moderate', '1', 150], [30, 'Moderate', '2', 150], [31, 'Moderate', '2', 150], [32, 'Moderate', '2', 200], [33, 'Moderate', '2', 200], [34, 'Moderate', '2', 225], [35, 'Moderate', '3', 225], [36, 'Moderate', '3', 250], [37, 'High', '3', 375], [38, 'High', '4', 400], [39, 'High', '4', 500], [40, 'High', '4', 500]]),
  mkEnc([[2, 'High', '10', 3100], [3, 'High', '10', 3100], [4, 'High', '10', 2600], [5, 'High', '10', 2300], [6, 'Moderate', '9', 2100], [7, 'Moderate', '9', 2000], [8, 'Moderate', '9', 1700], [9, 'Moderate', '8', 1700], [10, 'Moderate', '8', 1600], [11, 'Moderate', '8', 1400], [12, 'Moderate', '7', 1300], [13, 'Moderate', '7', 1300], [14, 'Low', '7', 1100], [15, 'Low', '6', 1000], [16, 'Low', '6', 1000], [17, 'Low', '6', 750], [18, 'Low', '5', 750], [19, 'Low', '5', 600], [20, 'Low', '5', 500], [21, 'Low', '5', 500], [22, 'Low', '5', 500], [23, 'Low', '5', 600], [24, 'Low', '5', 750], [25, 'Low', '6', 750], [26, 'Low', '6', 1000], [27, 'Low', '6', 1000], [28, 'Low', '7', 1100], [29, 'Moderate', '7', 1300], [30, 'Moderate', '7', 1300], [31, 'Moderate', '8', 1400], [32, 'Moderate', '8', 1600], [33, 'Moderate', '8', 1700], [34, 'Moderate', '9', 1700], [35, 'Moderate', '9', 2000], [36, 'Moderate', '9', 2100], [37, 'High', '10', 2300], [38, 'High', '10', 2600], [39, 'High', '10', 3100], [40, 'High', '10', 3100]]),
  mkEnc([[2, 'High', '16', 9800], [3, 'High', '16', 9800], [4, 'High', '16', 7800], [5, 'High', '16', 6200], [6, 'Moderate', '15', 6100], [7, 'Moderate', '15', 5400], [8, 'Moderate', '15', 5400], [9, 'Moderate', '14', 4900], [10, 'Moderate', '14', 4700], [11, 'Moderate', '14', 4200], [12, 'Moderate', '13', 4100], [13, 'Moderate', '13', 3800], [14, 'Low', '13', 3700], [15, 'Low', '12', 3300], [16, 'Low', '12', 2900], [17, 'Low', '12', 2900], [18, 'Low', '11', 2600], [19, 'Low', '11', 2200], [20, 'Low', '11', 1900], [21, 'Low', '11', 1900], [22, 'Low', '11', 1900], [23, 'Low', '11', 2200], [24, 'Low', '11', 2600], [25, 'Low', '12', 2900], [26, 'Low', '12', 2900], [27, 'Low', '12', 3300], [28, 'Low', '13', 3700], [29, 'Moderate', '13', 3800], [30, 'Moderate', '13', 4100], [31, 'Moderate', '14', 4200], [32, 'Moderate', '14', 4700], [33, 'Moderate', '14', 4900], [34, 'Moderate', '15', 5400], [35, 'Moderate', '15', 5400], [36, 'Moderate', '15', 6100], [37, 'High', '16', 6200], [38, 'High', '16', 7800], [39, 'High', '16', 9800], [40, 'High', '16', 9800]]),
  mkEnc([[2, 'High', '20', 22000], [3, 'High', '20', 22000], [4, 'High', '20', 17200], [5, 'High', '19', 14200], [6, 'Moderate', '19', 14200], [7, 'Moderate', '19', 13200], [8, 'Moderate', '19', 11700], [9, 'Moderate', '18', 11700], [10, 'Moderate', '18', 10700], [11, 'Moderate', '18', 8700], [12, 'Moderate', '18', 8700], [13, 'Moderate', '17', 7200], [14, 'Low', '17', 7200], [15, 'Low', '17', 6400], [16, 'Low', '17', 5500], [17, 'Low', '17', 5000], [18, 'Low', '17', 5000], [19, 'Low', '17', 4500], [20, 'Low', '17', 4500], [21, 'Low', '17', 4500], [22, 'Low', '17', 4500], [23, 'Low', '17', 4500], [24, 'Low', '17', 5000], [25, 'Low', '17', 5000], [26, 'Low', '17', 5500], [27, 'Low', '17', 6400], [28, 'Low', '17', 7200], [29, 'Moderate', '17', 7200], [30, 'Moderate', '18', 8700], [31, 'Moderate', '18', 8700], [32, 'Moderate', '18', 10700], [33, 'Moderate', '18', 11700], [34, 'Moderate', '19', 11700], [35, 'Moderate', '19', 13200], [36, 'Moderate', '19', 14200], [37, 'High', '19', 14200], [38, 'High', '20', 17200], [39, 'High', '20', 22000], [40, 'High', '20', 22000]]),
];

function mkTrap(data) {
  return data.map(([r, tipo, lv, dc, danno]) => ({ r, tipo, lv, dc, danno }));
}

const DEF_TRAP = [
  mkTrap([[2, 'Deadly', '4', 15, '11 (2d10)'], [3, 'Deadly', '3–4', 14, '11 (2d10)'], [4, 'Deadly', '3', 13, '11 (2d10)'], [5, 'Deadly', '3', 13, '11 (2d10)'], [6, 'Nuisance', '2–3', 12, '5 (1d10)'], [7, 'Nuisance', '2–3', 12, '5 (1d10)'], [8, 'Nuisance', '2', 11, '5 (1d10)'], [9, 'Nuisance', '2', 11, '5 (1d10)'], [10, 'Nuisance', '1', 10, '5 (1d10)'], [11, 'Nuisance', '1', 10, '5 (1d10)'], [12, 'Nuisance', '1', 10, '5 (1d10)'], [13, 'Nuisance', '2', 11, '5 (1d10)'], [14, 'Nuisance', '2', 11, '5 (1d10)'], [15, 'Nuisance', '2–3', 12, '5 (1d10)'], [16, 'Nuisance', '2–3', 12, '5 (1d10)'], [17, 'Deadly', '3', 13, '11 (2d10)'], [18, 'Deadly', '3', 13, '11 (2d10)'], [19, 'Deadly', '3–4', 14, '11 (2d10)'], [20, 'Deadly', '4', 15, '11 (2d10)']]),
  mkTrap([[2, 'Deadly', '10', 17, '22 (4d10)'], [3, 'Deadly', '9–10', 16, '22 (4d10)'], [4, 'Deadly', '8–9', 15, '22 (4d10)'], [5, 'Deadly', '8–9', 15, '22 (4d10)'], [6, 'Nuisance', '7–8', 14, '11 (2d10)'], [7, 'Nuisance', '7–8', 14, '11 (2d10)'], [8, 'Nuisance', '6', 13, '11 (2d10)'], [9, 'Nuisance', '6', 13, '11 (2d10)'], [10, 'Nuisance', '5', 12, '11 (2d10)'], [11, 'Nuisance', '5', 12, '11 (2d10)'], [12, 'Nuisance', '5', 12, '11 (2d10)'], [13, 'Nuisance', '6', 13, '11 (2d10)'], [14, 'Nuisance', '6', 13, '11 (2d10)'], [15, 'Nuisance', '7–8', 14, '11 (2d10)'], [16, 'Nuisance', '7–8', 14, '11 (2d10)'], [17, 'Deadly', '8–9', 15, '22 (4d10)'], [18, 'Deadly', '8–9', 15, '22 (4d10)'], [19, 'Deadly', '9–10', 16, '22 (4d10)'], [20, 'Deadly', '10', 17, '22 (4d10)']]),
  mkTrap([[2, 'Deadly', '16', 19, '55 (10d10)'], [3, 'Deadly', '15–16', 18, '55 (10d10)'], [4, 'Deadly', '14–15', 17, '55 (10d10)'], [5, 'Deadly', '14–15', 17, '55 (10d10)'], [6, 'Nuisance', '13–14', 16, '22 (4d10)'], [7, 'Nuisance', '13–14', 16, '22 (4d10)'], [8, 'Nuisance', '12', 15, '22 (4d10)'], [9, 'Nuisance', '12', 15, '22 (4d10)'], [10, 'Nuisance', '11', 14, '22 (4d10)'], [11, 'Nuisance', '11', 14, '22 (4d10)'], [12, 'Nuisance', '11', 14, '22 (4d10)'], [13, 'Nuisance', '12', 15, '22 (4d10)'], [14, 'Nuisance', '12', 15, '22 (4d10)'], [15, 'Nuisance', '13–14', 16, '22 (4d10)'], [16, 'Nuisance', '13–14', 16, '22 (4d10)'], [17, 'Deadly', '14–15', 17, '55 (10d10)'], [18, 'Deadly', '14–15', 17, '55 (10d10)'], [19, 'Deadly', '15–16', 18, '55 (10d10)'], [20, 'Deadly', '16', 19, '55 (10d10)']]),
  mkTrap([[2, 'Deadly', '20', 21, '99 (18d10)'], [3, 'Deadly', '19–20', 20, '99 (18d10)'], [4, 'Deadly', '19', 19, '99 (18d10)'], [5, 'Deadly', '19', 19, '99 (18d10)'], [6, 'Nuisance', '18–19', 18, '55 (10d10)'], [7, 'Nuisance', '18–19', 18, '55 (10d10)'], [8, 'Nuisance', '17–18', 17, '55 (10d10)'], [9, 'Nuisance', '17–18', 17, '55 (10d10)'], [10, 'Nuisance', '17', 16, '55 (10d10)'], [11, 'Nuisance', '17', 16, '55 (10d10)'], [12, 'Nuisance', '17', 16, '55 (10d10)'], [13, 'Nuisance', '17–18', 17, '55 (10d10)'], [14, 'Nuisance', '17–18', 17, '55 (10d10)'], [15, 'Nuisance', '18–19', 18, '55 (10d10)'], [16, 'Nuisance', '18–19', 18, '55 (10d10)'], [17, 'Deadly', '19', 19, '99 (18d10)'], [18, 'Deadly', '19', 19, '99 (18d10)'], [19, 'Deadly', '19–20', 20, '99 (18d10)'], [20, 'Deadly', '20', 21, '99 (18d10)']]),
];

const DEF_ENV = [
  { r: 2, gravita: 'Legendary' }, { r: 3, gravita: 'Very Rare' }, { r: 4, gravita: 'Very Rare' },
  { r: 5, gravita: 'Rare' }, { r: 6, gravita: 'Rare' }, { r: 7, gravita: 'Rare' },
  { r: 8, gravita: 'Uncommon' }, { r: 9, gravita: 'Uncommon' }, { r: 10, gravita: 'Uncommon' },
  { r: 11, gravita: 'Common' }, { r: 12, gravita: 'Common' }, { r: 13, gravita: 'Common' },
  { r: 14, gravita: 'Uncommon' }, { r: 15, gravita: 'Rare' }, { r: 16, gravita: 'Rare' },
  { r: 17, gravita: 'Very Rare' }, { r: 18, gravita: 'Very Rare' },
  { r: 19, gravita: 'Legendary' }, { r: 20, gravita: 'Legendary' },
];

function cp(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultTables() {
  return {
    weather: cp(DEF_WEATHER),
    events: cp(DEF_EVENTS),
    loot: cp(DEF_LOOT),
    compl: cp(DEF_COMPL),
    enc: cp(DEF_ENC),
    trap: cp(DEF_TRAP),
    env: cp(DEF_ENV),
  };
}

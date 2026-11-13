import { asArray } from '../lists.js';

// A row of filter toggles where several can be on at once (the sheet's
// Actions, Spells and Inventory shelves, the compendium's kinds): the chosen
// keys are a list, and the row's "All" toggle (ALL_KEY) stands for none
// chosen. FilterToggles applies it given `values`; a list keeps a record when
// it is of any chosen kind.

export const ALL_KEY = 'all';

// The keys chosen (a string saved by an older one-at-a-time row reads as a
// list of one; 'all' as none).
export function chosenToggles(values) {
  return asArray(values).filter((key) => key != null && key !== '' && key !== ALL_KEY);
}

// The row after `key` is pressed: All clears it, any other key goes on or off.
export function toggleChoice(values, key) {
  const chosen = chosenToggles(values);
  if (key === ALL_KEY) return [];
  return chosen.includes(key) ? chosen.filter((value) => value !== key) : [...chosen, key];
}

export function isToggleOn(values, key) {
  const chosen = chosenToggles(values);
  return key === ALL_KEY ? chosen.length === 0 : chosen.includes(key);
}

// Whether something of kind `key` (or of any of `keys`) is kept.
export function toggleKeeps(values, key) {
  const chosen = chosenToggles(values);
  return !chosen.length || asArray(key).some((one) => chosen.includes(one));
}

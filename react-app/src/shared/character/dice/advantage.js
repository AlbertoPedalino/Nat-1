// Advantage and disadvantage as SOURCES, folded into a roll mode only at the
// end. XPHB 2024: any advantage plus any disadvantage is a straight roll,
// however many of each there are — so one more source is not the same thing
// as forcing a mode. Pure; the node test runner imports it.

// { adv, disadv } -> the argument rollD20 expects: true, false or undefined.
export function advArgFor({ adv = false, disadv = false } = {}) {
  if (adv && !disadv) return true;
  if (disadv && !adv) return false;
  return undefined;
}

// A situational source the player adds for one roll ("advantage against the
// target of my Vow of Enmity"), on top of what the sheet already knows.
export function withExtraSource(sources = {}, extra) {
  return {
    adv: Boolean(sources.adv) || extra === 'adv',
    disadv: Boolean(sources.disadv) || extra === 'disadv',
  };
}

// The sources behind an already-folded argument, for rollers that only ever
// knew the result.
export function sourcesFromAdvArg(advArg) {
  return { adv: advArg === true, disadv: advArg === false };
}

export function rollModeLabel(advArg) {
  if (advArg === true) return 'Advantage';
  if (advArg === false) return 'Disadvantage';
  return 'Straight roll';
}

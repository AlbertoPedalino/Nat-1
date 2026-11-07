import { toSnapshot, upsertSnapshot } from '../../../shared/character/spells/spellSnapshots.js';
import {
  isInWizardBook, withoutSpellPicked, withSpellPicked, withWizardBookToggled,
} from '../../../shared/character/spells/spellBuckets.js';

// What the spell picker's clicks do to the class entry it is showing
// (`activePicker`): pick or unpick a spell within the entry's limits, and a
// Wizard's spellbook and prepared spells. Edits go through onUpdateSpells,
// with the picked spell's snapshot kept on the character.
export function spellPickerActions({ C, activePicker, activeLimits, activeCounts, activeIsWizard, onUpdateSpells }) {
  const selectedManualNames = new Set([
    ...(activePicker?.bucket?.selectedCantrips || []),
    ...Object.values(activePicker?.bucket?.selectedSpells || {}).flat(),
  ]);

  const addSpell = (spell) => {
    if (!activePicker) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || selectedManualNames.has(name)) return;
    if (level > 0 && level > activePicker.maxLevel) return;
    if (level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips) return;
    if (level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withSpellPicked(bucket, level, name) }), spell);
  };

  const removeSpell = (spell) => {
    if (!activePicker) return;
    const name = spell?.name;
    const level = Number(spell?.level || 0);
    if (!name || !selectedManualNames.has(name)) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withoutSpellPicked(bucket, level, name) }));
  };

  const toggleWizardBookSpell = (spell) => {
    if (!activePicker || !activeIsWizard) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || level > activePicker.maxLevel) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withWizardBookToggled(bucket, level, name) }), spell);
  };

  const toggleWizardPreparedSpell = (spell) => {
    if (!activePicker || !activeIsWizard) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || !isInWizardBook(activePicker.bucket, name, level)) return;
    const selected = selectedManualNames.has(name);
    if (!selected) {
      if (level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips) return;
      if (level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells) return;
    }
    selected ? removeSpell(spell) : addSpell(spell);
  };

  const updateBucketSpell = (picker, updater, snapshotSpell) => {
    if (!picker?.bucket) return;
    const nextBucket = updater(picker.bucket);
    const nextSnapshots = snapshotSpell ? upsertSnapshot(C?.spellSnapshots || [], toSnapshot(snapshotSpell)) : (C?.spellSnapshots || []);
    if (picker.isPrimary) {
      onUpdateSpells?.({
        selectedCantrips: nextBucket.selectedCantrips || [],
        selectedSpells: nextBucket.selectedSpells || {},
        wizardSpellbook: nextBucket.wizardSpellbook || C?.wizardSpellbook || {},
        spellSnapshots: nextSnapshots,
      });
      return;
    }
    const nextExtraClasses = (C?.extraClasses || []).map((extra, index) => (
      index === picker.extraIndex
        ? {
            ...extra,
            selectedCantrips: nextBucket.selectedCantrips || [],
            selectedSpells: nextBucket.selectedSpells || {},
            wizardSpellbook: nextBucket.wizardSpellbook || extra.wizardSpellbook || {},
          }
        : extra
    ));
    onUpdateSpells?.({ extraClasses: nextExtraClasses, spellSnapshots: nextSnapshots });
  };

  return { selectedManualNames, addSpell, removeSpell, toggleWizardBookSpell, toggleWizardPreparedSpell };
}

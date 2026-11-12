import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';

// The two keys that pick how a feature is paid (useCostMode): one of its uses
// or a spell slot. Each key names what is left ("Wild Shape (2)",
// "Spell Slot (Lv 1)") and is off when nothing is; none is lit when neither
// can be paid. `useLabel` and `slotLabel` name the two ways.
export default function CostModeToggle({ costMode, useLabel, slotLabel = 'Spell Slot', size, sx }) {
  const { cost, setCost, usesLeft, slotLevel, canUse, canSlot, canPay } = costMode;
  return (
    <ChoiceToggle
      size={size}
      stopPropagation
      value={canPay ? cost : null}
      onChange={setCost}
      options={[
        { value: 'use', disabled: !canUse, label: canUse ? `${useLabel} (${usesLeft})` : useLabel },
        { value: 'slot', disabled: !canSlot, label: canSlot ? `${slotLabel} (Lv ${slotLevel})` : slotLabel },
      ]}
      sx={sx}
    />
  );
}

import { InputAdornment, TextField } from '@mui/material';

// A number typed by hand (a weight, a price, a bound of a range, hours): a
// text field that takes a comma or a point (typedNumber in numbers.js reads
// it), the decimal keypad on a phone, its `unit` written after the figure
// ("lb", "gp"). `value` is the field's text and `onChange` gets the text, so
// a half-typed "2," is kept as typed. `label` names it, or `ariaLabel` when
// it sits without one (a range's min and max). Other TextField props pass
// through; `sx` places and sizes it.
export default function NumberField({
  value, onChange, unit, ariaLabel, slotProps, ...props
}) {
  return (
    <TextField
      size="small"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      {...props}
      slotProps={{
        ...slotProps,
        htmlInput: { inputMode: 'decimal', ...(ariaLabel ? { 'aria-label': ariaLabel } : null), ...slotProps?.htmlInput },
        input: unit
          ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment>, ...slotProps?.input }
          : slotProps?.input,
      }}
    />
  );
}

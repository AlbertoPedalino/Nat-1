import BuilderBox from '../layout/BuilderBox.jsx';
import PickCount from '../../../shared/ui/PickCount.jsx';

// The frame every builder choice sits in: its label and how many of the
// allowed picks are taken ("2/3", or `countLabel` for a count that says more),
// then the choice itself. Headed like every box of the builder (BuilderBox's
// title), so a choice and a list of feats read alike.
export default function ChoiceFrame({
  label, count, max, countLabel = null, children,
}) {
  return (
    <BuilderBox
      spacing={0.75}
      title={label}
      aside={max != null ? <PickCount count={count} max={max} label={countLabel} /> : null}
    >
      {children}
    </BuilderBox>
  );
}

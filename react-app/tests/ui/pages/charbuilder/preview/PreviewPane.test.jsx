import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import PreviewPane from '../../../../../src/pages/charbuilder/preview/PreviewPane.jsx';

// The preview's header names every class of a multiclass, with its levels.
test('a multiclass reads in full in the header', () => {
  render(<PreviewPane character={{
    name: 'Johnny Walker', level: 4, speciesName: 'Human', className: 'Fighter', classLevel: 2,
    extraClasses: [{ name: 'Bard', level: 2 }],
  }} />);
  expect(screen.getByText('Lv 4 Human Fighter 2 / Bard 2')).toBeInTheDocument();
});

test('a single class reads without its level twice', () => {
  render(<PreviewPane character={{ name: 'Mira', level: 3, speciesName: 'Elf', className: 'Wizard' }} />);
  expect(screen.getByText('Lv 3 Elf Wizard')).toBeInTheDocument();
});

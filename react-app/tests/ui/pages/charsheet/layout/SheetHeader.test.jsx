import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SheetHeader from '../../../../../src/pages/charsheet/layout/SheetHeader.jsx';
vi.mock('../../../../../src/shared/ui/ToastProvider.jsx', () => ({ useToast: () => ({ notify: vi.fn() }) }));

const character = {
  name: 'Arannis',
  className: 'Wizard',
  level: 1,
  extraClasses: [],
};

test('a read-only sheet shows its READ ONLY badge', () => {
  render(
    <MemoryRouter>
      <SheetHeader C={character} sheet={{ xpStored: 0 }} embedded readOnly />
    </MemoryRouter>,
  );
  expect(screen.getByText('READ ONLY')).toBeInTheDocument();
});

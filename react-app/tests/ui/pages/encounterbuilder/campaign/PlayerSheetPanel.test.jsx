import { render, screen } from '@testing-library/react';

const builder = vi.hoisted(() => ({ value: null, sheetProps: null }));
vi.mock('../../../../../src/pages/encounterbuilder/state/EncounterBuilderContext.jsx', () => ({
  useEncounterBuilder: () => builder.value,
}));
vi.mock('../../../../../src/pages/campaignsheet/CampaignSheetView.jsx', () => ({
  default: (props) => { builder.sheetProps = props; return <div data-testid="sheet" />; },
}));

import PlayerSheetPanel from '../../../../../src/pages/encounterbuilder/campaign/PlayerSheetPanel.jsx';

test('the player sheet takes its vitals from the digest the encounter already follows', () => {
  const digest = { characterId: 'hero', rowRevision: 4 };
  builder.value = {
    state: { combat: { combatants: [{ id: 'c1', type: 'player', sourceId: 'hero', name: 'Hero' }] } },
    characterDigests: new Map([['hero', digest]]),
  };
  render(<PlayerSheetPanel selection={{ combatantId: 'c1' }} onClose={() => {}} />);
  expect(screen.getByTestId('sheet')).toBeInTheDocument();
  expect(builder.sheetProps).toMatchObject({ sheetId: 'hero', editable: true, embedded: true, liveDigest: digest });
});

test('before its digest arrives the sheet waits for it rather than opening a channel', () => {
  builder.value = {
    state: { combat: { combatants: [{ id: 'c1', type: 'player', sourceId: 'hero', name: 'Hero' }] } },
    characterDigests: new Map(),
  };
  render(<PlayerSheetPanel selection={{ combatantId: 'c1' }} onClose={() => {}} />);
  expect(builder.sheetProps.liveDigest).toBeNull();
});

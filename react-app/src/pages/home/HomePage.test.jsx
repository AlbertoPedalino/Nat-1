import { describe, expect, test } from 'vitest';
import { TOOLS } from './HomePage.jsx';

describe('Home tool table', () => {
  test('keeps every launcher route and exposes Campaigns unconditionally', () => {
    expect(TOOLS.map((tool) => tool.path)).toEqual([
      '/library/characters',
      '/charbuilder?char=new',
      '/library/gmboard',
      '/library/encounters',
      '/library/dmscreen',
      '/campaigns',
    ]);

    const campaigns = TOOLS.find((tool) => tool.label === 'Campaigns');
    expect(campaigns).toBeTruthy();
    expect(campaigns.path).toBe('/campaigns');
    expect(campaigns.icon).toBeTruthy();
    expect(TOOLS.filter((tool) => tool !== campaigns).some((tool) => tool.icon === campaigns.icon)).toBe(false);
    expect(TOOLS.filter((tool) => tool !== campaigns).some((tool) => tool.color === campaigns.color)).toBe(false);
  });
});

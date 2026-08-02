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
      '/vtt',
    ]);

    const campaigns = TOOLS.find((tool) => tool.label === 'Campaigns');
    expect(campaigns).toBeTruthy();
    expect(campaigns.path).toBe('/campaigns');
    expect(campaigns.icon).toBeTruthy();
    expect(TOOLS.filter((tool) => tool !== campaigns).some((tool) => tool.icon === campaigns.icon)).toBe(false);
    expect(TOOLS.filter((tool) => tool !== campaigns).some((tool) => tool.color === campaigns.color)).toBe(false);
  });

  // The battle map is the second cloud-only launcher: it opens fine while signed
  // out, and the page itself explains why it is empty rather than being hidden
  // from Home.
  test('the battle map is listed with its own icon and colour', () => {
    const map = TOOLS.find((tool) => tool.label === 'Battle Map');
    expect(map).toBeTruthy();
    expect(map.path).toBe('/vtt');
    expect(TOOLS.filter((tool) => tool !== map).some((tool) => tool.icon === map.icon)).toBe(false);
    expect(TOOLS.filter((tool) => tool !== map).some((tool) => tool.color === map.color)).toBe(false);
  });
});

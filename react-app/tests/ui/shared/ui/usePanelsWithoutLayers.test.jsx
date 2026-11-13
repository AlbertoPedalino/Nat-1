import { renderHook } from '@testing-library/react';
import { usePanelsWithoutLayers } from '../../../../src/shared/ui/PanelHeader.jsx';

// The battle map turns panel layers off for as long as it is open, and only
// then: leaving it gives the sheet and every other page their layers back.
test('panel layers are off while the page that asks is mounted, and back after', () => {
  const root = document.documentElement;
  expect(root.style.getPropertyValue('--gb-panel-layer')).toBe('');
  const { unmount } = renderHook(() => usePanelsWithoutLayers());
  expect(root.style.getPropertyValue('--gb-panel-layer')).toBe('auto');
  unmount();
  expect(root.style.getPropertyValue('--gb-panel-layer')).toBe('');
});

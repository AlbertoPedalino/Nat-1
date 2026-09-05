import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import TokenSprite from './TokenSprite.jsx';

test('a character without a portrait uses the primary class icon', () => {
  const { container } = render(
    <TokenSprite
      token={{
        id: 'hero-1',
        characterId: 'character-1',
        label: 'Aria',
        className: 'Wizard',
        layer: 'tokens',
      }}
      size={64}
      interactive
      movable={false}
    />,
  );

  expect(container.querySelector('[data-class-icon="Wizard"]')).toBeTruthy();
  expect(screen.queryByText('A')).not.toBeInTheDocument();
});

test('an uploaded token portrait stays circular inside its selected color ring', () => {
  const { container } = render(
    <TokenSprite
      token={{
        id: 'villager-1',
        label: 'Villager',
        color: '#336699',
        imagePath: 'campaign/scene/villager.png',
        imageUrl: 'signed:villager.png',
        layer: 'tokens',
      }}
      size={64}
      interactive
      movable={false}
    />,
  );

  const image = container.querySelector('img');
  const frame = image.parentElement;
  expect(getComputedStyle(frame).borderRadius).toBe('50%');
  expect(getComputedStyle(frame).borderWidth).toBe('5px');
  expect(getComputedStyle(frame).borderColor).toBe('rgb(51, 102, 153)');
  expect(getComputedStyle(frame).overflow).toBe('hidden');
  expect(getComputedStyle(image).objectFit).toBe('cover');
  expect(screen.queryByRole('button', { name: 'Resize Villager' })).not.toBeInTheDocument();
});

test('a dead token shows a skull instead of counting Dead as a numbered mark', () => {
  render(
    <TokenSprite
      token={{
        id: 'goblin-dead',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['dead'],
        effects: [],
      }}
      size={64}
      interactive
      movable={false}
    />,
  );

  expect(screen.getByLabelText('Dead')).toBeInTheDocument();
  expect(screen.queryByText('1')).not.toBeInTheDocument();
});

test('a character at zero hp replaces the hp bar with death save progress', () => {
  const onDeathSaveChange = vi.fn();
  const { container } = render(
    <TokenSprite
      token={{
        id: 'hero-dying',
        characterId: 'character-1',
        label: 'Aria',
        layer: 'tokens',
        hpCurrent: 0,
        hpMax: 24,
        showHp: true,
        deathSaves: { success: 2, fail: 1 },
      }}
      size={64}
      interactive
      movable={false}
      canSetDeathSaves
      onDeathSaveChange={onDeathSaveChange}
    />,
  );

  expect(screen.getByLabelText('2 death save successes, 1 failures')).toBeInTheDocument();
  expect(screen.queryByText('0/24')).not.toBeInTheDocument();
  expect(container.querySelectorAll('[data-death-save="success"]')).toHaveLength(3);
  expect(container.querySelectorAll('[data-death-save="failure"]')).toHaveLength(3);
  expect(container.querySelectorAll('[data-death-save="success"][data-active="true"]')).toHaveLength(2);
  expect(container.querySelectorAll('[data-death-save="failure"][data-active="true"]')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Death save failure 3' }));
  expect(onDeathSaveChange).toHaveBeenCalledWith('fail', 3);
});

test('the third death save failure leaves only the Dead marker', () => {
  const { container } = render(
    <TokenSprite
      token={{
        id: 'hero-dead',
        characterId: 'character-1',
        label: 'Aria',
        layer: 'tokens',
        hpCurrent: 0,
        hpMax: 24,
        showHp: true,
        deathSaves: { success: 1, fail: 3 },
        conditions: ['dead'],
      }}
      size={64}
      interactive
      movable={false}
    />,
  );

  expect(screen.getByLabelText('Dead')).toBeInTheDocument();
  expect(container.querySelector('[data-death-save]')).toBeNull();
  expect(screen.queryByLabelText('1 death save successes, 3 failures')).not.toBeInTheDocument();
});

test('a Lucide map object renders as a vector and exposes its resize handle', () => {
  const onResizePointerDown = vi.fn();
  const onRotatePointerDown = vi.fn();
  const { container } = render(
    <TokenSprite
      token={{
        id: 'door-1', iconKey: 'door-open', iconStrokeWidth: 3.2, label: 'Open door', layer: 'map',
      }}
      size={64}
      interactive
      movable
      resizable
      rotatable
      onResizePointerDown={onResizePointerDown}
      onRotatePointerDown={onRotatePointerDown}
    />,
  );

  expect(container.querySelector('svg')).toBeTruthy();
  expect(screen.getByText('Open door')).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Resize Open door' }));
  expect(onResizePointerDown).toHaveBeenCalledOnce();
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Rotate Open door' }));
  expect(onRotatePointerDown).toHaveBeenCalledOnce();
});

test('hovering a token condition pill shows its rules text', async () => {
  const user = userEvent.setup();
  render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable={false}
      conditionEntries={{
        prone: ['The creature has Disadvantage on attack rolls.'],
      }}
    />,
  );

  fireEvent.pointerEnter(screen.getByRole('button', { name: 'Goblin' }));
  await user.hover(screen.getByText('Prone'));

  expect(await screen.findByText('The creature has Disadvantage on attack rolls.')).toBeInTheDocument();
});

test('condition pills stay open while the pointer crosses from the token to them', () => {
  vi.useFakeTimers();
  const { unmount } = render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable={false}
      conditionEntries={{ prone: ['Prone rules'] }}
    />,
  );

  const token = screen.getByRole('button', { name: 'Goblin' });
  fireEvent.pointerEnter(token);
  const pill = screen.getByText('Prone');
  fireEvent.pointerLeave(token);
  fireEvent.pointerEnter(pill);
  act(() => vi.advanceTimersByTime(200));

  expect(screen.getByText('Prone')).toBeInTheDocument();
  unmount();
  vi.useRealTimers();
});

test('condition pills collapse while their token is being dragged', () => {
  render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive
      movable
      conditionEntries={{ prone: ['Prone rules'] }}
    />,
  );

  const token = screen.getByRole('button', { name: 'Goblin' });
  fireEvent.pointerEnter(token);
  expect(screen.getByText('Prone')).toBeInTheDocument();

  fireEvent.pointerDown(token, { button: 0 });

  expect(screen.queryByText('Prone')).not.toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});

test('a projector inspection expands the token and opens the matching condition rules', async () => {
  render(
    <TokenSprite
      token={{
        id: 'goblin-1',
        label: 'Goblin',
        layer: 'tokens',
        conditions: ['prone'],
        effects: [],
      }}
      size={64}
      interactive={false}
      movable={false}
      conditionEntries={{ prone: ['Prone rules for the projector'] }}
      presentedInspection={{ tokenId: 'goblin-1', conditionKey: 'prone' }}
    />,
  );

  expect(screen.getAllByText('Prone')).toHaveLength(2);
  expect(await screen.findByText('Prone rules for the projector')).toBeInTheDocument();
  expect(screen.queryByText('1')).not.toBeInTheDocument();
});

test('token and condition hover changes are reported to the presenter', () => {
  const onInspectionChange = vi.fn();
  render(
    <TokenSprite
      token={{
        id: 'goblin-1', label: 'Goblin', layer: 'tokens', conditions: ['prone'], effects: [],
      }}
      size={64}
      interactive
      movable={false}
      conditionEntries={{ prone: ['Prone rules'] }}
      onInspectionChange={onInspectionChange}
    />,
  );

  fireEvent.pointerEnter(screen.getByRole('button', { name: 'Goblin' }));
  fireEvent.pointerEnter(screen.getByText('Prone'));

  expect(onInspectionChange).toHaveBeenCalledWith({ tokenId: 'goblin-1', conditionKey: null });
  expect(onInspectionChange).toHaveBeenCalledWith({ tokenId: 'goblin-1', conditionKey: 'prone' });
});

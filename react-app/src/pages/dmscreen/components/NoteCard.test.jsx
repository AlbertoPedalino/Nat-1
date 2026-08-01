import React, { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoteCard from './NoteCard.jsx';

function renderCard(note, overrides = {}) {
  const props = {
    note,
    index: 0,
    count: 1,
    onUpdate: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onResize: vi.fn(),
    ...overrides,
  };
  render(<NoteCard {...props} />);
  return props;
}

// Most tests only care that the card reports an edit, but the ones about
// switching between editor and preview need the note to actually change.
function ControlledCard({ id, title = '', body = '', ...overrides }) {
  const [note, setNote] = useState({ id, title, body });
  return (
    <NoteCard
      note={note}
      index={0}
      count={1}
      onUpdate={(_, field, value) => setNote((current) => ({ ...current, [field]: value }))}
      onMove={vi.fn()}
      onRemove={vi.fn()}
      onResize={vi.fn()}
      {...overrides}
    />
  );
}

describe('NoteCard', () => {
  test('focuses the title when a new note requests focus', () => {
    const onFocusHandled = vi.fn();
    renderCard(
      { id: 'a', title: '', body: '' },
      { focusTitle: true, onFocusHandled },
    );
    expect(screen.getByLabelText('Title (optional)')).toHaveFocus();
    expect(onFocusHandled).toHaveBeenCalledOnce();
  });

  test('deletes an empty note without confirmation', async () => {
    const confirmFn = vi.fn();
    const props = renderCard({ id: 'a', title: '  ', body: '\n' }, { confirmFn });
    await userEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(confirmFn).not.toHaveBeenCalled();
    expect(props.onRemove).toHaveBeenCalledWith('a');
  });

  test('asks before deleting a filled note and honors decline', async () => {
    const confirmFn = vi.fn(() => false);
    const props = renderCard({ id: 'a', title: 'NPCs', body: '' }, { confirmFn });
    await userEvent.click(screen.getByRole('button', { name: 'Delete note' }));
    expect(confirmFn).toHaveBeenCalledWith('Delete this note?');
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  test('keeps HTML-like body input inert in both the preview and the editor', async () => {
    renderCard({ id: 'a', title: '', body: '<img src=x onerror=alert(1)>' });
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }));
    expect(screen.getByLabelText('Note (markdown)')).toHaveValue('<img src=x onerror=alert(1)>');
  });

  test('renders the body as markdown when not editing', () => {
    renderCard({
      id: 'a',
      title: '',
      body: '# Boss\n\n**Strahd**\n\n| HP | AC |\n| --- | --- |\n| 144 | 16 |\n\n- claw\n- bite',
    });
    expect(screen.getByRole('heading', { name: 'Boss' })).toBeInTheDocument();
    expect(screen.getByText('Strahd').tagName).toBe('STRONG');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'HP' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '144' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByLabelText('Note (markdown)')).toBeNull();
  });

  test('typing in a fresh note stays in the editor', async () => {
    // The body has to be fed back in for this one: the first character makes it
    // non-empty, and a card that showed the editor only because the body was
    // empty would flip to preview mid-word and drop the caret.
    render(<ControlledCard id="a" />);
    const editor = screen.getByLabelText('Note (markdown)');
    await userEvent.click(editor);
    await userEvent.type(editor, 'Strahd');

    expect(screen.getByLabelText('Note (markdown)')).toHaveValue('Strahd');
    expect(screen.getByLabelText('Note (markdown)')).toHaveFocus();
  });

  test('starts an empty note in the editor with no preview toggle', () => {
    renderCard({ id: 'a', title: '', body: '' });
    expect(screen.getByLabelText('Note (markdown)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preview note' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit note' })).toBeNull();
  });

  test('the drag handle reorders with the keyboard and replaces the arrow buttons', async () => {
    const props = renderCard({ id: 'a', title: '', body: '' }, { index: 1, count: 3 });
    expect(screen.queryByRole('button', { name: 'Move note up' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move note down' })).toBeNull();

    const handle = screen.getByRole('button', { name: 'Reorder note 2 of 3' });
    await userEvent.click(handle);
    await userEvent.keyboard('{ArrowUp}');
    expect(props.onMove).toHaveBeenCalledWith('a', -1);
    await userEvent.keyboard('{ArrowRight}');
    expect(props.onMove).toHaveBeenCalledWith('a', 1);
  });

  test('search hits are marked in the rendered body and in the title', async () => {
    render(<ControlledCard id="a" title="Tavern NPCs" body="**Garret** the barkeep" tokens={['garret', 'npc']} />);

    const marks = document.querySelectorAll('mark');
    expect([...marks].map((mark) => mark.textContent)).toEqual(['NPC', 'Garret']);
    // The mark sits inside the bold run: the markdown itself is untouched.
    expect(marks[1].closest('strong')).not.toBeNull();

    // The title is text while searching, and clicking it hands the field back.
    expect(screen.queryByLabelText('Title (optional)')).toBeNull();
    await userEvent.click(screen.getByText('Tavern', { exact: false }));
    expect(screen.getByLabelText('Title (optional)')).toHaveFocus();
  });

  test('a filtered board withholds the reorder handle', () => {
    renderCard({ id: 'a', title: '', body: '' }, { index: 1, count: 3, reorderable: false });
    expect(screen.queryByRole('button', { name: 'Reorder note 2 of 3' })).toBeNull();
    // Everything else still works while searching.
    expect(screen.getByRole('button', { name: 'Delete note' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resize note' })).toBeInTheDocument();
  });

  test('the resize grip changes columns and height from the keyboard and resets on double click', async () => {
    const props = renderCard({ id: 'a', title: '', body: '', size: { cols: 6, height: 300 } });
    const grip = screen.getByRole('button', { name: 'Resize note' });
    await userEvent.click(grip);

    await userEvent.keyboard('{ArrowRight}');
    expect(props.onResize).toHaveBeenCalledWith('a', { cols: 7, height: 300 });
    await userEvent.keyboard('{ArrowLeft}');
    expect(props.onResize).toHaveBeenCalledWith('a', { cols: 5, height: 300 });
    await userEvent.keyboard('{ArrowDown}');
    expect(props.onResize).toHaveBeenCalledWith('a', { cols: 6, height: 340 });

    await userEvent.dblClick(grip);
    expect(props.onResize).toHaveBeenCalledWith('a', { cols: 4, height: 0 });
  });

  test('clicking the preview opens the editor and blurring renders it again', async () => {
    const props = renderCard({ id: 'a', title: '', body: '**bold**' });
    await userEvent.click(screen.getByText('bold'));

    const editor = screen.getByLabelText('Note (markdown)');
    expect(editor).toHaveFocus();
    await userEvent.type(editor, '!');
    expect(props.onUpdate).toHaveBeenCalledWith('a', 'body', '**bold**!');

    await userEvent.tab();
    expect(screen.queryByLabelText('Note (markdown)')).toBeNull();
    expect(screen.getByText('bold').tagName).toBe('STRONG');
  });
});

import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { UI_FONTS, FONT_SIZES } from '../../../shared/ui/fonts.js';
import { makeId } from '../../../shared/ids.js';
import { clamp } from '../../../shared/numbers.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

function normalizePages(raw) {
  if (!raw) return [{ id: 'page_1', name: 'General', content: '' }];
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
    return [{ id: 'page_1', name: 'Notes', content: raw }];
  }
  if (Array.isArray(raw) && raw.length) return raw.map((p) => ({ id: p.id || makeId('page'), name: p.name || 'Untitled', content: p.content || '' }));
  return [{ id: 'page_1', name: 'General', content: '' }];
}

export default function NotesTab({ sheet }) {
  const { onUpdateNotes } = useSheetActions();
  const [pages, setPages] = useState(() => normalizePages(sheet?.notes));
  const [activeIdx, setActiveIdx] = useState(0);
  const [editingName, setEditingName] = useState(null);
  const nameInputRef = useRef(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    onUpdateNotes?.(pages);
  }, [pages, onUpdateNotes]);

  useEffect(() => {
    if (editingName != null && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const addPage = useCallback(() => {
    setPages((prev) => {
      return [...prev, { id: makeId('page'), name: `Page ${prev.length + 1}`, content: '' }];
    });
    setActiveIdx(pages.length);
  }, [pages.length]);

  const deletePage = useCallback((index) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveIdx((cur) => clamp(cur, 0, pages.length - 2));
  }, [pages.length]);

  const changeContent = useCallback((index, content) => {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, content } : p)));
  }, []);

  const renamePage = useCallback((index, name) => {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, name: name.trim() || p.name } : p)));
    setEditingName(null);
  }, []);

  if (!pages.length) return null;

  const activePage = pages[activeIdx] || pages[0];

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* The pages are one choice among a few: the shared key bar. */}
        <ChoiceToggle
          wrap
          options={pages.map((page, i) => ({ value: i, label: page.name }))}
          value={activeIdx}
          onChange={setActiveIdx}
        />
        <TipIconButton title="Add page" size="small" onClick={addPage}>
          <Plus size={ICON_SIZES.sm} />
        </TipIconButton>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
        {editingName === activeIdx ? (
          <TextField
            inputRef={nameInputRef}
            size="small"
            defaultValue={activePage.name}
            onBlur={(e) => renamePage(activeIdx, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') renamePage(activeIdx, e.target.value);
              if (e.key === 'Escape') setEditingName(null);
            }}
            sx={{
              '& .MuiInputBase-root': { fontSize: FONT_SIZES.xl, ...TEXT_STYLES.heading },
              '& fieldset': { borderColor: 'primary.main' },
            }}
          />
        ) : (
          <Typography sx={{ ...TEXT_STYLES.heading, fontSize: FONT_SIZES.xl, color: 'text.primary' }}>
            {activePage.name}
          </Typography>
        )}
        <TipIconButton
          title={editingName === activeIdx ? 'Done' : 'Rename page'}
          size="small"
          onClick={() => setEditingName(editingName === activeIdx ? null : activeIdx)}
        >
          {editingName === activeIdx ? <Check size={ICON_SIZES.sm} /> : <Pencil size={ICON_SIZES.sm} />}
        </TipIconButton>
        {pages.length > 1 && (
          <TipIconButton title="Delete page" danger size="small" onClick={() => deletePage(activeIdx)} sx={{ ml: 'auto' }}>
            <Trash2 size={ICON_SIZES.sm} />
          </TipIconButton>
        )}
      </Box>

      <TextField
        multiline fullWidth minRows={6}
        placeholder="Write your notes here…"
        value={activePage.content}
        onChange={(e) => changeContent(activeIdx, e.target.value)}
        sx={{
          '& .MuiInputBase-root': { color: 'text.primary', fontFamily: UI_FONTS.body, fontSize: FONT_SIZES.xxl },
          '& fieldset': { borderColor: 'divider' },
          '&:focus-within fieldset': { borderColor: 'primary.main' },
        }}
      />
    </Box>
  );
}

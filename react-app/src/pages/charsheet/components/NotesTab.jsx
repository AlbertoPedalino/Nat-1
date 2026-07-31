import { useState, useCallback, useRef, useEffect } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import { Plus, Minus, PencilLine, Check } from 'lucide-react';
import { useSheetActions } from '../context/SheetActionsContext.jsx';

function normalizePages(raw) {
  if (!raw) return [{ id: 'page_1', name: 'General', content: '' }];
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } catch {}
    return [{ id: 'page_1', name: 'Notes', content: raw }];
  }
  if (Array.isArray(raw) && raw.length) return raw.map((p) => ({ id: p.id || `page_${Date.now()}`, name: p.name || 'Untitled', content: p.content || '' }));
  return [{ id: 'page_1', name: 'General', content: '' }];
}

function PageTab({ page, active, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        px: 1.2, py: 0.5, borderRadius: 1, cursor: 'pointer', userSelect: 'none', fontSize: '0.75rem', fontWeight: 700, fontFamily: '"Cinzel", Georgia, serif',
        bgcolor: active ? 'primary.main' : 'rgba(255,232,176,0.08)', color: active ? 'primary.contrastText' : 'text.secondary',
        border: 1, borderColor: active ? 'primary.main' : 'divider', whiteSpace: 'nowrap', minWidth: 0,
        '&:hover': { bgcolor: active ? 'primary.dark' : 'rgba(255,232,176,0.15)' },
      }}
    >
      {page.name}
    </Box>
  );
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
      const id = `page_${Date.now()}`;
      return [...prev, { id, name: `Page ${prev.length + 1}`, content: '' }];
    });
    setActiveIdx(pages.length);
  }, [pages.length]);

  const deletePage = useCallback((index) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setActiveIdx((cur) => Math.max(0, Math.min(cur, pages.length - 2)));
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
        {pages.map((page, i) => (
          <PageTab key={page.id} page={page} active={i === activeIdx} onClick={() => setActiveIdx(i)} />
        ))}
        <IconButton size="small" onClick={addPage} sx={{ color: 'primary.main', p: 0.3 }}>
          <Plus size={14} />
        </IconButton>
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
              '& .MuiInputBase-root': { fontSize: '0.8rem', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700 },
              '& fieldset': { borderColor: 'primary.main' },
            }}
          />
        ) : (
          <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}>
            {activePage.name}
          </Typography>
        )}
        <IconButton size="small" onClick={() => setEditingName(editingName === activeIdx ? null : activeIdx)} sx={{ color: 'text.secondary', p: 0.3 }}>
          {editingName === activeIdx ? <Check size={13} /> : <PencilLine size={13} />}
        </IconButton>
        {pages.length > 1 && (
          <IconButton size="small" onClick={() => deletePage(activeIdx)} sx={{ color: 'error.main', p: 0.3, ml: 'auto' }}>
            <Minus size={14} />
          </IconButton>
        )}
      </Box>

      <TextField
        multiline fullWidth minRows={6}
        placeholder="Write your notes here…"
        value={activePage.content}
        onChange={(e) => changeContent(activeIdx, e.target.value)}
        sx={{
          '& .MuiInputBase-root': { bgcolor: 'rgba(35,32,26,1)', color: 'text.primary', fontFamily: 'Georgia, serif', fontSize: '0.875rem' },
          '& fieldset': { borderColor: 'divider' },
          '&:focus-within fieldset': { borderColor: 'primary.main' },
        }}
      />
    </Box>
  );
}

import { useState } from 'react';
import { Box, Button, TextField, Tabs, Tab, Alert } from '@mui/material';
import { LogIn } from 'lucide-react';
import SheetDialog from '../character/SheetDialog.jsx';
import { useAuth } from './AuthProvider.jsx';

export default function AuthDialog({ open, onClose }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setPassword(''); setError(''); setBusy(false); };

  const handleClose = () => { reset(); onClose?.(); };

  const submit = async () => {
    setError('');
    if (!username.trim() || !password) { setError('Enter a name and password.'); return; }
    if (mode === 'register' && password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'login') await signIn(username, password);
      else await signUp(username, password);
      reset();
      onClose?.();
    } catch (e) {
      setError(translateError(e?.message || String(e)));
      setBusy(false);
    }
  };

  return (
    <SheetDialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      title="Log in"
      icon={<LogIn size={20} />}
      actions={(
        <>
          <Button onClick={handleClose} variant="outlined" size="small" sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button onClick={submit} variant="contained" size="small" disabled={busy}>
            {busy ? '...' : (mode === 'login' ? 'Log in' : 'Sign up')}
          </Button>
        </>
      )}
    >
      <Tabs
        value={mode}
        onChange={(_, v) => { setMode(v); setError(''); }}
        variant="fullWidth"
        sx={{ mb: 1.5, minHeight: 0 }}
      >
        <Tab value="login" label="Log in" sx={{ minHeight: 0, py: 0.6 }} />
        <Tab value="register" label="Sign up" sx={{ minHeight: 0, py: 0.6 }} />
      </Tabs>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}
        component="form"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <TextField
          label="Name"
          size="small"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          size="small"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        <button type="submit" style={{ display: 'none' }} aria-hidden />
      </Box>

      {error ? <Alert severity="error" sx={{ mt: 1.2 }}>{error}</Alert> : null}
    </SheetDialog>
  );
}

function translateError(msg) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong name or password.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Name already taken. Use "Log in".';
  if (m.includes('email')) return 'Invalid name (use letters/numbers).';
  return msg;
}

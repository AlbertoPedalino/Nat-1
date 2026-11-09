import { LoadingLine } from '../ui/LoadStatus.jsx';

// Shown by a tool page while useToolInstance looks the instance up in the
// cloud; the editor is not mounted yet, so nothing can be seeded or saved.
export default function CloudInstanceLoading({ label }) {
  return (
    <LoadingLine
      centered
      label={label ? `Loading ${label}…` : 'Loading…'}
      sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
    />
  );
}

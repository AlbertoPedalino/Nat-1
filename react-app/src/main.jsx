import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CacheProvider } from '@emotion/react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import App from './app/App.jsx';
import { theme } from './app/theme.js';
import { AuthProvider } from './shared/cloud/auth/AuthProvider.jsx';
import { ToastProvider } from './shared/ui/ToastProvider.jsx';
import { createAppStyleCache } from './shared/ui/hoverOnlyWithHover.js';

// Hover looks only where there is a hover (see hoverOnlyWithHover.js).
const styleCache = createAppStyleCache();
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CacheProvider value={styleCache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          <BrowserRouter basename={basename}>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </CacheProvider>
  </React.StrictMode>,
);

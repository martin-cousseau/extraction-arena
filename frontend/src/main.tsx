import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from '@/app/router';
import { applyTheme, THEME_STORAGE_KEY, type ThemeMode } from '@/components/application/theme/theme-toggle';
import '@fontsource-variable/inter';
import '@fontsource/jetbrains-mono';
import '@/styles/globals.css';

const stored = (() => {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
})();
applyTheme((stored === 'light' || stored === 'dark' ? stored : 'dark') as ThemeMode, { persist: stored !== 'light' });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';

import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/EB.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Theme>
  </StrictMode>
);

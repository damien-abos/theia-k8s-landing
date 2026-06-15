import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

// OIDC callback finalization (/callback) is handled in OidcAuthProvider.init(),
// called by the useAuth hook when <App/> mounts. We can therefore mount directly.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

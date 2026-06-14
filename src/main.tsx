import './index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

// La finalisation du retour OIDC (/callback) est gérée dans OidcAuthProvider.init(),
// appelé par le hook useAuth au montage de <App/>. On peut donc monter directement.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

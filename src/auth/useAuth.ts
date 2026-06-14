import { useEffect, useState } from 'react';

import { AuthProvider } from './AuthProvider';
import { getOidcConfig } from './config';
import { OidcAuthProvider } from './OidcAuthProvider';

export interface AuthState {
  /** Email de l'utilisateur authentifié, ou undefined. */
  email?: string;
  /** Token Bearer pour le service theia-cloud, ou undefined. */
  token?: string;
  /** true quand l'auth est activée par la config (useOidc). */
  enabled: boolean;
  /** true une fois la tentative de restauration de session terminée. */
  ready: boolean;
  /** Démarre un login interactif. */
  login: () => void;
  /** Déconnecte l'utilisateur. */
  logout: () => void;
}

// Singleton module-level : un seul UserManager pour toute l'app, instancié une fois.
// (Équivalent du `keycloakConfig`/`initialized` global de la landing page upstream.)
let provider: AuthProvider | undefined;
let providerInitialized = false;

function getProvider(): AuthProvider | undefined {
  if (!providerInitialized) {
    providerInitialized = true;
    const oidcConfig = getOidcConfig();
    provider = oidcConfig ? new OidcAuthProvider(oidcConfig) : undefined;
  }
  return provider;
}

export function useAuth(): AuthState {
  const authProvider = getProvider();
  const enabled = authProvider !== undefined;

  const [email, setEmail] = useState<string>();
  const [token, setToken] = useState<string>();
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!authProvider) {
      return;
    }
    let cancelled = false;
    authProvider
      .init()
      .then(result => {
        if (cancelled) {
          return;
        }
        setEmail(result.email);
        setToken(result.token);
      })
      .catch(err => console.error('Authentication failed', err))
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authProvider]);

  return {
    email,
    token,
    enabled,
    ready,
    login: () => authProvider?.login(),
    logout: () => authProvider?.logout()
  };
}

import { useEffect, useState } from 'react';

import { AuthProvider } from './AuthProvider';
import { getOidcConfig } from './config';
import { OidcAuthProvider } from './OidcAuthProvider';

export interface AuthState {
  /** Email of the authenticated user, or undefined. */
  email?: string;
  /** Bearer token for the theia-cloud service, or undefined. */
  token?: string;
  /** true when auth is enabled by config (useOidc). */
  enabled: boolean;
  /** true once the session restore attempt has completed. */
  ready: boolean;
  /** Starts an interactive login. */
  login: () => void;
  /** Logs out the user. */
  logout: () => void;
}

// Module-level singleton: a single UserManager for the whole app, instantiated once.
// (Equivalent of the global `keycloakConfig`/`initialized` in the upstream landing page.)
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

/**
 * Authentication abstraction: isolates the rest of the application from the
 * concrete OIDC provider. App.tsx and components depend only on this interface,
 * not on oidc-client-ts (nor, originally, on keycloak-js).
 */

export interface AuthResult {
  email?: string;
  /** Token to send as `Authorization: Bearer` to the theia-cloud service. */
  token?: string;
}

export interface AuthProvider {
  /**
   * Attempts to restore an existing session without a redirect (equivalent of
   * Keycloak's `check-sso`). Includes finalizing the callback return.
   */
  init(): Promise<AuthResult>;

  /** Starts an interactive login (redirect to the IdP). */
  login(): Promise<void>;

  /** Logs out the user (logout redirect). */
  logout(): Promise<void>;

  /** Current token, or `undefined` if not authenticated. */
  getToken(): string | undefined;
}

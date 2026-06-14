/**
 * Abstraction d'authentification : isole le reste de l'application du fournisseur
 * OIDC concret. App.tsx et les composants ne dépendent que de cette interface, pas
 * de oidc-client-ts (ni, à l'origine, de keycloak-js).
 */

export interface AuthResult {
  email?: string;
  /** Token à envoyer en `Authorization: Bearer` au service theia-cloud. */
  token?: string;
}

export interface AuthProvider {
  /**
   * Tente de restaurer une session existante sans redirection (équivalent du
   * `check-sso` de Keycloak). Inclut la finalisation du retour de callback.
   */
  init(): Promise<AuthResult>;

  /** Démarre un login interactif (redirection vers l'IdP). */
  login(): Promise<void>;

  /** Déconnecte l'utilisateur (redirection de logout). */
  logout(): Promise<void>;

  /** Token courant, ou `undefined` si non authentifié. */
  getToken(): string | undefined;
}

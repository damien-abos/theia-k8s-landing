import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

import { AuthProvider, AuthResult } from './AuthProvider';
import { OidcConfig } from './config';

/** Chemin de la route de callback OIDC (cf. nginx SPA fallback + main.tsx). */
export const CALLBACK_PATH = '/callback';
/** Page d'iframe de renouvellement silencieux (cf. public/silent-renew.html). */
export const SILENT_RENEW_PATH = '/silent-renew.html';

/**
 * Implémentation OIDC (Authorization Code + PKCE, client public) basée sur
 * oidc-client-ts. Conçue pour Dex mais agnostique du fournisseur.
 */
export class OidcAuthProvider implements AuthProvider {
  private readonly userManager: UserManager;
  private user: User | null = null;

  constructor(private readonly config: OidcConfig) {
    const origin = window.location.origin;
    this.userManager = new UserManager({
      authority: config.oidcAuthority,
      client_id: config.oidcClientId,
      redirect_uri: origin + CALLBACK_PATH,
      silent_redirect_uri: origin + SILENT_RENEW_PATH,
      post_logout_redirect_uri: origin,
      response_type: 'code',
      scope: config.oidcScope,
      automaticSilentRenew: true,
      // Persiste la session entre rechargements (équivalent check-sso).
      userStore: new WebStorageStateStore({ store: window.localStorage })
    });
  }

  async init(): Promise<AuthResult> {
    // Si on revient de l'IdP, finaliser l'échange code→token avant tout.
    if (window.location.pathname === CALLBACK_PATH) {
      try {
        this.user = await this.userManager.signinRedirectCallback();
      } catch (err) {
        console.error('OIDC: échec de la finalisation du callback', err);
      }
      // Nettoyer l'URL (retirer ?code=&state=) sans recharger la page.
      window.history.replaceState({}, document.title, window.location.origin + '/');
    } else {
      this.user = await this.userManager.getUser();
    }
    return this.toResult();
  }

  async login(): Promise<void> {
    await this.userManager.signinRedirect();
  }

  async logout(): Promise<void> {
    await this.userManager.signoutRedirect();
  }

  getToken(): string | undefined {
    if (!this.user) {
      return undefined;
    }
    return this.config.oidcTokenType === 'id_token' ? this.user.id_token : this.user.access_token;
  }

  private toResult(): AuthResult {
    if (!this.user || this.user.expired) {
      return {};
    }
    const email = this.user.profile.email;
    return { email, token: this.getToken() };
  }
}

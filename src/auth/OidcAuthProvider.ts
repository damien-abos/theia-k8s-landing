import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';

import { AuthProvider, AuthResult } from './AuthProvider';
import { OidcConfig } from './config';

/** Path of the OIDC callback route (see nginx SPA fallback + main.tsx). */
export const CALLBACK_PATH = '/callback';
/** Silent renewal iframe page (see public/silent-renew.html). */
export const SILENT_RENEW_PATH = '/silent-renew.html';

/**
 * OIDC implementation (Authorization Code + PKCE, public client) based on
 * oidc-client-ts. Designed for Dex but provider-agnostic.
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
      // Persists the session across page reloads (equivalent of check-sso).
      userStore: new WebStorageStateStore({ store: window.localStorage })
    });
  }

  async init(): Promise<AuthResult> {
    // If returning from the IdP, complete the code→token exchange first.
    if (window.location.pathname === CALLBACK_PATH) {
      try {
        this.user = await this.userManager.signinRedirectCallback();
      } catch (err) {
        console.error('OIDC: callback finalization failed', err);
      }
      // Clean the URL (remove ?code=&state=) without reloading the page.
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

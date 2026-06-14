/**
 * Lecture de la configuration OIDC injectée au runtime via `window.theiaCloudConfig`
 * (fichier config.js chargé par index.html avant le bundle).
 *
 * Les champs non-auth (serviceUrl, serviceAuthToken, appDefinition, appName,
 * useEphemeralStorage, additionalApps, ...) sont lus séparément par
 * `@eclipse-theiacloud/common` via `getTheiaCloudConfig()`. Ici on ne s'occupe que
 * de la partie authentification, avec des champs `oidc*` propres à cette landing
 * page (en remplacement des champs `keycloak*` de l'upstream).
 */

export type OidcTokenType = 'access_token' | 'id_token';

export interface OidcConfig {
  /** Active l'authentification OIDC (remplace `useKeycloak`). */
  useOidc: boolean;
  /** Issuer OIDC (Dex), ex. `https://<host>/dex`. */
  oidcAuthority: string;
  /** Identifiant du static client public Dex, ex. `theia-cloud`. */
  oidcClientId: string;
  /** Scopes demandés. Défaut: `openid email profile`. */
  oidcScope: string;
  /** Token envoyé en Bearer au service theia-cloud. Défaut: `access_token`. */
  oidcTokenType: OidcTokenType;
}

interface RawOidcConfig {
  useOidc?: boolean;
  oidcAuthority?: string;
  oidcClientId?: string;
  oidcScope?: string;
  oidcTokenType?: OidcTokenType;
}

const DEFAULT_SCOPE = 'openid email profile';
const DEFAULT_TOKEN_TYPE: OidcTokenType = 'access_token';

/**
 * Renvoie la configuration OIDC validée, ou `undefined` si l'auth est désactivée.
 * Lève une erreur si `useOidc` est vrai mais que les champs requis manquent — un
 * échec précoce et explicite vaut mieux qu'une redirection cassée plus tard.
 */
export function getOidcConfig(): OidcConfig | undefined {
  // `window.theiaCloudConfig` est typé par @eclipse-theiacloud/common (champs
  // theia-cloud uniquement). Les champs `oidc*` y cohabitent au runtime ; on lit
  // donc l'objet via un cast plutôt qu'en redéclarant le global (ce qui entrerait
  // en conflit avec la déclaration du common).
  const raw = window.theiaCloudConfig as unknown as RawOidcConfig | undefined;
  if (!raw || raw.useOidc !== true) {
    return undefined;
  }
  if (!raw.oidcAuthority || !raw.oidcClientId) {
    throw new Error(
      'OIDC config invalide: `oidcAuthority` et `oidcClientId` sont requis quand `useOidc` est activé.'
    );
  }
  return Object.freeze({
    useOidc: true,
    oidcAuthority: raw.oidcAuthority,
    oidcClientId: raw.oidcClientId,
    oidcScope: raw.oidcScope ?? DEFAULT_SCOPE,
    oidcTokenType: raw.oidcTokenType ?? DEFAULT_TOKEN_TYPE
  });
}

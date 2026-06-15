/**
 * Reads the OIDC configuration injected at runtime via `window.theiaCloudConfig`
 * (config.js file loaded by index.html before the bundle).
 *
 * Non-auth fields (serviceUrl, serviceAuthToken, appDefinition, appName,
 * useEphemeralStorage, additionalApps, ...) are read separately by
 * `@eclipse-theiacloud/common` via `getTheiaCloudConfig()`. Here we only handle
 * the authentication part, using `oidc*` fields specific to this landing page
 * (replacing the `keycloak*` fields from upstream).
 */

export type OidcTokenType = 'access_token' | 'id_token';

export interface OidcConfig {
  /** Enables OIDC authentication (replaces `useKeycloak`). */
  useOidc: boolean;
  /** OIDC issuer (Dex), e.g. `https://<host>/dex`. */
  oidcAuthority: string;
  /** Dex public static client ID, e.g. `theia-cloud`. */
  oidcClientId: string;
  /** Requested scopes. Default: `openid email profile`. */
  oidcScope: string;
  /** Token sent as Bearer to the theia-cloud service. Default: `access_token`. */
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
 * Returns the validated OIDC config, or `undefined` if auth is disabled.
 * Throws if `useOidc` is true but required fields are missing — an early,
 * explicit failure is better than a broken redirect later.
 */
export function getOidcConfig(): OidcConfig | undefined {
  // `window.theiaCloudConfig` is typed by @eclipse-theiacloud/common (theia-cloud
  // fields only). The `oidc*` fields coexist at runtime; we read the object via
  // a cast rather than re-declaring the global (which would conflict with the
  // common package's declaration).
  const raw = window.theiaCloudConfig as unknown as RawOidcConfig | undefined;
  if (!raw || raw.useOidc !== true) {
    return undefined;
  }
  if (!raw.oidcAuthority || !raw.oidcClientId) {
    throw new Error(
      'Invalid OIDC config: `oidcAuthority` and `oidcClientId` are required when `useOidc` is enabled.'
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

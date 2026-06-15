// Runtime configuration example.
//
// In PRODUCTION, this file is generated and mounted by the Helm ConfigMap
// (deploy/landing-page-config-map.yaml.j2); do not commit the real version.
//
// In DEVELOPMENT, copy this file to `public/config.js` (git-ignored) and adapt
// the values to point to a Dex instance + a test theia-cloud service.
window.theiaCloudConfig = {
  // --- theia-cloud (consumed by @eclipse-theiacloud/common) ---
  appName: 'Kubernetes Training',
  appDefinition: 'theia-k8s',
  serviceUrl: 'https://service.<base-host>',
  serviceAuthToken: '<anti-spam-token-from-vault>',
  useEphemeralStorage: false,
  // additionalApps: [{ appId: 'another-app', appName: 'Another App' }],
  logoFileExtension: 'svg',
  // disableInfo: false,
  // infoTitle: '...',
  // infoText: '...',
  // loadingText: '...',

  // --- OIDC authentication (Dex) — replaces keycloak* fields ---
  useOidc: true,
  oidcAuthority: 'https://<base-host>/dex',
  oidcClientId: 'theia-cloud',
  oidcScope: 'openid email profile',
  // 'access_token' (default, matches quarkus.oidc in service mode) or 'id_token'.
  oidcTokenType: 'access_token'
};

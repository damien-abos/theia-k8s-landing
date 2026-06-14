// Exemple de configuration runtime.
//
// En PRODUCTION, ce fichier est généré et monté par le ConfigMap Helm
// (deploy/landing-page-config-map.yaml.j2) ; ne pas committer la version réelle.
//
// En DÉVELOPPEMENT, copier ce fichier en `public/config.js` (gitignoré) et adapter
// les valeurs vers une instance Dex + un service theia-cloud de test.
window.theiaCloudConfig = {
  // --- theia-cloud (consommé par @eclipse-theiacloud/common) ---
  appName: 'Formation Kubernetes',
  appDefinition: 'theia-k8s',
  serviceUrl: 'https://service.<base-host>',
  serviceAuthToken: '<token-anti-spam-du-vault>',
  useEphemeralStorage: false,
  // additionalApps: [{ appId: 'autre-app', appName: 'Autre App' }],
  logoFileExtension: 'svg',
  // disableInfo: false,
  // infoTitle: '...',
  // infoText: '...',
  // loadingText: '...',

  // --- Authentification OIDC (Dex) — remplace les champs keycloak* ---
  useOidc: true,
  oidcAuthority: 'https://<base-host>/dex',
  oidcClientId: 'theia-cloud',
  oidcScope: 'openid email profile',
  // 'access_token' (défaut, conforme quarkus.oidc en mode service) ou 'id_token'.
  oidcTokenType: 'access_token'
};

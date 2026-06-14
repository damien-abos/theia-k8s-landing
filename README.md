# theia-k8s-landing

Landing page [theia-cloud](https://github.com/eclipse-theia/theia-cloud) avec
authentification **OIDC via Dex** au lieu de Keycloak.

Fork de la landing page officielle dont la dépendance `keycloak-js` est remplacée
par [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) (Authorization
Code + PKCE, client public). Le reste (lancement de session via
`@eclipse-theiacloud/common`, redirection vers l'IDE) est inchangé.

## Architecture

- `src/auth/` — couche d'authentification isolée derrière l'interface
  `AuthProvider`. `OidcAuthProvider` implémente le flux OIDC ; `useAuth` l'expose
  à React. Seul fichier qui « connaît » le fournisseur d'identité.
- `src/App.tsx` — orchestre login + lancement de session (forké de l'upstream,
  bloc Keycloak retiré).
- `src/components/` — UI reprise de l'upstream (`Header` adapté : logout = fonction).
- Config injectée au runtime via `window.theiaCloudConfig` (fichier `config.js`).

## Développement

```bash
npm ci
cp public/config.example.js public/config.js   # adapter oidcAuthority + serviceUrl
npm run dev
```

`npm run build` produit `dist/`. `npm run lint` vérifie le code.

## Déploiement

Image conteneur via le `Dockerfile` (nginx, port 8080). La config runtime est
fournie par un ConfigMap K8s monté sur `/usr/share/nginx/html/config.js`. Voir
[`deploy/`](deploy/) :

- `landing-page-config-map.yaml.j2` — génère `config.js` (champs `oidc*`).
- `values-overrides.md` — points de branchement IaC (service Quarkus,
  oauth2-proxy, static clients Dex).

## Champs de configuration OIDC

| Champ | Défaut | Rôle |
|---|---|---|
| `useOidc` | — | active l'authentification |
| `oidcAuthority` | — | issuer Dex (`https://host/dex`) |
| `oidcClientId` | — | static client public Dex |
| `oidcScope` | `openid email profile` | scopes |
| `oidcTokenType` | `access_token` | token envoyé en Bearer (`access_token`/`id_token`) |

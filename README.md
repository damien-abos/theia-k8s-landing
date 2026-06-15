# theia-k8s-landing

Landing page for [theia-cloud](https://github.com/eclipse-theia/theia-cloud) with
**OIDC authentication via Dex** instead of Keycloak.

Fork of the official landing page where the `keycloak-js` dependency is replaced
by [`oidc-client-ts`](https://github.com/authts/oidc-client-ts) (Authorization
Code + PKCE, public client). The rest (session launch via
`@eclipse-theiacloud/common`, redirect to the IDE) is unchanged.

## Architecture

- `src/auth/` — authentication layer isolated behind the `AuthProvider` interface.
  `OidcAuthProvider` implements the OIDC flow; `useAuth` exposes it to React.
  The only file that "knows" the identity provider.
- `src/App.tsx` — orchestrates login + session launch (forked from upstream,
  Keycloak block removed).
- `src/components/` — UI taken from upstream (`Header` adapted: logout = function).
- Config injected at runtime via `window.theiaCloudConfig` (file `config.js`).

## Development

```bash
npm ci
cp public/config.example.js public/config.js   # adapt oidcAuthority + serviceUrl
npm run dev
```

`npm run build` produces `dist/`. `npm run lint` checks the code.

## Deployment

Container image via the `Dockerfile` (nginx, port 8080). The runtime config is
provided by a K8s ConfigMap mounted at `/usr/share/nginx/html/config.js`. See
[`deploy/`](deploy/):

- `landing-page-config-map.yaml.j2` — generates `config.js` (fields `oidc*`).
- `values-overrides.md` — IaC integration points (Quarkus service,
  oauth2-proxy, Dex static clients).

## OIDC configuration fields

| Field | Default | Role |
|---|---|---|
| `useOidc` | — | enables authentication |
| `oidcAuthority` | — | Dex issuer (`https://host/dex`) |
| `oidcClientId` | — | Dex public static client |
| `oidcScope` | `openid email profile` | scopes |
| `oidcTokenType` | `access_token` | token sent as Bearer (`access_token`/`id_token`) |

# CLAUDE.md

Project context for Claude Code. Read this file first before making any changes.

## Objective

**Forked** [theia-cloud](https://github.com/eclipse-theia/theia-cloud) landing page
to authenticate participants via **OIDC/Dex** instead of Keycloak. This is one
component of the Kubernetes training platform (Ansible/Helm IaC lives in sibling
repositories: `theia-training`, `k8s-theia`).

> ⚠️ This change **invalidates architecture decision #4 (Keycloak)** frozen in
> the IaC root `CLAUDE.md`. Migrating the Keycloak role and deploying Dex are
> **out of scope for this repository**.

## What the landing page does (and does not do)

A pure **HTTP client of the theia-cloud *service***. Flow:
1. Authenticates the user via OIDC → `email` + token.
2. `POST {serviceUrl}/service`: `LaunchRequest` in the **body** + OIDC token in
   `Authorization: Bearer`.
3. Redirects (`location.replace`) to the IDE session URL.

It never touches CRDs or the `theia-cloud-base` chart: the **operator** creates
the K8s resources (AppDefinition→Session→Workspace, pod).

## Two tokens to NEVER confuse

| Token | Origin | Usage |
|---|---|---|
| `serviceAuthToken` (ex-`appId`) | static chart secret (config.js) | LaunchRequest body — **independent of the IdP** |
| OIDC token (`access_token`/`id_token`) | Dex, via oidc-client-ts | `Authorization: Bearer`, validated by `quarkus.oidc` on the service side |

## Fixed decisions (do not change without asking)

1. **OIDC lib**: `oidc-client-ts` (Authorization Code + PKCE, public client). No
   keycloak-js, no extra React wrapper.
2. **Isolated auth**: all IdP-specific code is behind the `AuthProvider` interface
   (`src/auth/`). `OidcAuthProvider` is the ONLY file that knows the IdP. App.tsx
   and components do not depend on it.
3. **Runtime config**: `window.theiaCloudConfig` (file `config.js` loaded by
   index.html BEFORE the bundle). Auth fields = `oidc*` (not `keycloak*`).
4. **`oidc*` fields**: `useOidc`, `oidcAuthority`, `oidcClientId`, `oidcScope`
   (default `openid email profile`), `oidcTokenType` (default `access_token`).
5. **Bearer token**: `access_token` by default, switchable to `id_token` via
   `oidcTokenType` WITHOUT a rebuild — must match what the service validates.
6. **Version**: `@eclipse-theiacloud/common` pinned to the `theia_cloud_version`
   from the IaC (currently `1.2.0`). Do not desynchronize.

## Structure

```
index.html                 loads ./config.js then the bundle (non-module script, see vite.config)
public/
  config.example.js        runtime config template (real config.js = git-ignored / mounted by Helm)
  silent-renew.html         OIDC silent renewal iframe (oidc-client-ts UMD via CDN)
  logo.svg                  placeholder (replaceable)
src/
  main.tsx                 mounts <App/>; OIDC callback is finalized in useAuth/init
  App.tsx                  forked from upstream: login (useAuth) + session launch
  auth/
    config.ts              getOidcConfig() reads window.theiaCloudConfig (cast, see pitfall below)
    AuthProvider.ts        interface init/login/logout/getToken
    OidcAuthProvider.ts    oidc-client-ts impl (UserManager, PKCE, callback in init())
    useAuth.ts             React hook, module-level singleton provider
  components/              taken from upstream; ONLY Header differs (logout = function)
Dockerfile                 multi-stage node:20 → nginx-unprivileged:8080
nginx.conf                 SPA fallback (try_files → index.html) for /callback; config.js no-cache
deploy/
  landing-page-config-map.yaml.j2  ConfigMap generating config.js (oidc* fields)
  values-overrides.md      IaC integration points: Quarkus service, oauth2-proxy, Dex static clients
```

## Pitfalls (read before coding)

- **Type of `window.theiaCloudConfig`**: `@eclipse-theiacloud/common` already declares
  it globally (theia-cloud fields only). DO NOT re-declare the global (TS conflict) —
  read our `oidc*` fields via a cast (`as unknown as RawOidcConfig`), as done in
  `src/auth/config.ts`.
- **React hook rules**: all hooks in App.tsx are called BEFORE any early return.
  The `config === undefined` case is handled afterwards. eslint
  (`react-hooks/rules-of-hooks`) will fail otherwise.
- **config.js must not be bundled**: `assetsInlineLimit: 0` in vite.config, and
  the `<script src="./config.js">` remains non-module (expected build warning,
  by design). It is mounted at runtime, not at build time.

## Commands (from the repository root)

```bash
npm ci
cp public/config.example.js public/config.js   # dev: adapt oidcAuthority + serviceUrl
npm run dev                                     # Vite dev server
npm run build                                   # tsc + vite → dist/
npm run lint                                    # eslint, 0 warnings allowed (--max-warnings 0)
```

Before any commit: `npm run build && npm run lint` must pass.

## End-to-end verification (see plan)

Critical point: trigger a launch, verify that `POST /service` returns 200
(Bearer token accepted). If 401, switch `oidcTokenType` (access_token ↔ id_token)
in config.js and/or check `auth-server-url`/`client-id` on the service. This is
WHERE the definitive value of `oidcTokenType` is decided.

## Out of scope for this repository

- Dex deployment (Ansible role), static clients, `platform_deps` migration.
- `quarkus.oidc` configuration of the service and oauth2-proxy for IDE instances —
  only **documented** in `deploy/values-overrides.md`.
- Update of decision #4 in the IaC root CLAUDE.md.

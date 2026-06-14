# CLAUDE.md

Contexte projet pour Claude Code. Lis ce fichier en premier avant toute modification.

## Objectif

Landing page [theia-cloud](https://github.com/eclipse-theia/theia-cloud) **forkée**
pour authentifier les participants via **OIDC/Dex** au lieu de Keycloak. C'est une
brique de la plateforme de formation Kubernetes (l'IaC Ansible/Helm vit dans des
dépôts voisins : `theia-training`, `k8s-theia`).

> ⚠️ Ce changement **invalide la décision d'architecture #4 (Keycloak)** figée dans
> le `CLAUDE.md` racine de l'IaC. La migration du rôle Keycloak et le déploiement
> de Dex sont **hors périmètre de ce dépôt**.

## Ce que fait la landing page (et ce qu'elle ne fait pas)

Pur **client HTTP du *service* theia-cloud**. Flux :
1. Authentifie l'utilisateur en OIDC → `email` + token.
2. `POST {serviceUrl}/service` : `LaunchRequest` dans le **body** + token OIDC en
   `Authorization: Bearer`.
3. Redirige (`location.replace`) vers l'URL de session de l'IDE.

Elle ne touche **jamais** aux CRD ni au chart `theia-cloud-base` : c'est
l'**opérateur** qui crée les ressources K8s (AppDefinition→Session→Workspace, pod).

## Deux tokens à ne JAMAIS confondre

| Token | Origine | Usage |
|---|---|---|
| `serviceAuthToken` (ex-`appId`) | secret statique du chart (config.js) | body du LaunchRequest — **indépendant de l'IdP** |
| token OIDC (`access_token`/`id_token`) | Dex, via oidc-client-ts | `Authorization: Bearer`, validé par `quarkus.oidc` côté service |

## Décisions figées (ne pas changer sans demander)

1. **Lib OIDC** : `oidc-client-ts` (Authorization Code + PKCE, client public). Pas
   de keycloak-js, pas de wrapper React supplémentaire.
2. **Auth isolée** : tout le code IdP-spécifique est derrière l'interface
   `AuthProvider` (`src/auth/`). `OidcAuthProvider` est le SEUL fichier qui connaît
   l'IdP. App.tsx et les composants n'en dépendent pas.
3. **Config runtime** : `window.theiaCloudConfig` (fichier `config.js` chargé par
   index.html AVANT le bundle). Champs auth = `oidc*` (pas `keycloak*`).
4. **Champs `oidc*`** : `useOidc`, `oidcAuthority`, `oidcClientId`, `oidcScope`
   (défaut `openid email profile`), `oidcTokenType` (défaut `access_token`).
5. **Token Bearer** : `access_token` par défaut, basculable en `id_token` via
   `oidcTokenType` SANS rebuild — à aligner sur ce que valide le service.
6. **Version** : `@eclipse-theiacloud/common` épinglé sur le `theia_cloud_version`
   de l'IaC (actuellement `1.2.0`). Ne pas désynchroniser.

## Structure

```
index.html                 charge ./config.js puis le bundle (script non-module, voir vite.config)
public/
  config.example.js        modèle de config runtime (config.js réel = gitignoré / monté par Helm)
  silent-renew.html         iframe de renouvellement silencieux OIDC (oidc-client-ts UMD via CDN)
  logo.svg                  placeholder (remplaçable)
src/
  main.tsx                 monte <App/> ; le callback OIDC est finalisé dans useAuth/init
  App.tsx                  forké upstream : login (useAuth) + lancement de session
  auth/
    config.ts              getOidcConfig() lit window.theiaCloudConfig (cast, voir piège ci-dessous)
    AuthProvider.ts        interface init/login/logout/getToken
    OidcAuthProvider.ts    impl. oidc-client-ts (UserManager, PKCE, callback dans init())
    useAuth.ts             hook React, provider singleton module-level
  components/              repris de l'upstream ; SEUL Header diffère (logout = fonction)
Dockerfile                 multi-stage node:20 → nginx-unprivileged:8080
nginx.conf                 fallback SPA (try_files → index.html) pour /callback ; config.js no-cache
deploy/
  landing-page-config-map.yaml.j2  ConfigMap générant config.js (champs oidc*)
  values-overrides.md      points de branchement IaC : service Quarkus, oauth2-proxy, static clients Dex
```

## Pièges (lire avant de coder)

- **Type de `window.theiaCloudConfig`** : `@eclipse-theiacloud/common` le déclare
  déjà globalement (champs theia-cloud seulement). NE PAS redéclarer le global
  (conflit TS) — lire nos champs `oidc*` via un cast (`as unknown as RawOidcConfig`),
  comme dans `src/auth/config.ts`.
- **Règle des hooks React** : tous les hooks d'App.tsx sont appelés AVANT tout early
  return. Le cas `config === undefined` est traité après. eslint
  (`react-hooks/rules-of-hooks`) échoue sinon.
- **config.js ne doit pas être bundlé** : `assetsInlineLimit: 0` dans vite.config,
  et le `<script src="./config.js">` reste non-module (warning de build attendu et
  voulu). Il est monté au runtime, pas au build.

## Commandes (depuis la racine du dépôt)

```bash
npm ci
cp public/config.example.js public/config.js   # dev : adapter oidcAuthority + serviceUrl
npm run dev                                     # serveur Vite
npm run build                                   # tsc + vite → dist/
npm run lint                                    # eslint, 0 warning toléré (--max-warnings 0)
```

Avant tout commit : `npm run build && npm run lint` doivent passer.

## Vérification e2e (cf. plan)

Point critique : déclencher un lancement, vérifier que `POST /service` renvoie 200
(token Bearer accepté). Si 401, basculer `oidcTokenType` (access_token ↔ id_token)
dans config.js et/ou vérifier `auth-server-url`/`client-id` du service. C'est ICI
qu'on tranche la valeur définitive de `oidcTokenType`.

## Hors périmètre de ce dépôt

- Déploiement de Dex (rôle Ansible), static clients, migration `platform_deps`.
- Configuration `quarkus.oidc` du service et de l'oauth2-proxy des instances —
  seulement **documentée** dans `deploy/values-overrides.md`.
- Mise à jour de la décision #4 du CLAUDE.md racine de l'IaC.

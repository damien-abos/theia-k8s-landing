# Intégration IaC — bascule Keycloak → Dex

Ce document liste les points de branchement côté Ansible/Helm pour utiliser cette
landing page custom (OIDC/Dex) avec theia-cloud. **Le code de la landing page ne
suffit pas** : trois surfaces côté cluster doivent pointer vers Dex.

## 1. Landing page (cette image)

- Builder et publier l'image de ce dépôt, puis pointer le Deployment landing-page
  vers cette image (au lieu de `theiacloud/theia-cloud-landing-page`).
- Déployer `deploy/landing-page-config-map.yaml.j2` (génère `config.js`) et le
  monter sur `/usr/share/nginx/html/config.js`.
- Variables Ansible attendues par le template : `app_definition_name`,
  `service_host`, `vault_service_auth_token`, `dex_host`, `dex_client_id`,
  `oidc_token_type` (défaut `access_token`), + optionnels (`additional_apps`,
  `landing_info_*`, etc.).

## 2. Service backend theia-cloud (validation du Bearer)

Le service Quarkus valide le token via `quarkus.oidc` **standard** — aucun code
spécifique Keycloak. Pointer l'issuer vers Dex :

- `quarkus.oidc.auth-server-url` = `https://<dex_host>/dex`
- `quarkus.oidc.client-id` = client API Dex (peut être le même que la landing page
  si Dex l'autorise en audience, sinon un client dédié)
- `quarkus.oidc.tls.verification` = `none` en interne si certificats self-signed.

⚠️ **Cohérence `oidcTokenType` ↔ ce que valide le service.** La landing page
envoie par défaut l'`access_token`. Si le service est configuré pour valider
l'`id_token`, mettre `oidc_token_type: id_token` dans la config landing page.
C'est le point à trancher à la vérification end-to-end (cf. plan, étape 3).

## 3. oauth2-proxy devant les instances IDE

Le chart officiel utilise **oauth2-proxy** pour protéger les sessions IDE (pas
seulement la landing page). Dans l'IaC actuelle (rôle `theia_cloud`), le bloc
`keycloak:` construit l'issuer comme `authUrl + "realms/" + realm` — **format
spécifique Keycloak**. Pour Dex :

- L'issuer Dex est `https://<dex_host>/dex` (pas de segment `realms/`).
- Il faut donc soit configurer oauth2-proxy avec `--oidc-issuer-url=https://<dex_host>/dex`
  et le provider `oidc` générique, soit vérifier si le chart expose des valeurs
  permettant de surcharger l'issuer sans le préfixe `realms/`.
- Client oauth2-proxy = static client **confidentiel** côté Dex (avec secret),
  distinct du client public de la landing page.

## 4. Dex — static clients

```yaml
staticClients:
  # SPA landing page (public, PKCE)
  - id: theia-cloud
    name: Theia Cloud Landing
    public: true
    redirectURIs:
      - https://<landing_host>/callback
  # oauth2-proxy des instances (confidentiel)
  - id: theia-cloud-proxy
    name: Theia Cloud Proxy
    secret: "<vault>"
    redirectURIs:
      - https://<instance_host>/oauth2/callback
```

## Récapitulatif des décisions figées (cf. plan)

- Lib OIDC landing page : `oidc-client-ts` (Authorization Code + PKCE).
- Nouveaux champs config `oidc*` (pas de réutilisation des `keycloak*`).
- Token Bearer : `access_token` par défaut, basculable en `id_token` via config —
  à confirmer au test contre le service.

## Hors périmètre de ce dépôt

- Rôle Ansible de déploiement de Dex lui-même et migration du rôle `platform_deps`
  (Keycloak → Dex).
- Mise à jour de la décision d'architecture #4 de `CLAUDE.md` (Keycloak figé).

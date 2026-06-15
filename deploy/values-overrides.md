# IaC Integration — Keycloak → Dex migration

This document lists the integration points on the Ansible/Helm side to use this
custom landing page (OIDC/Dex) with theia-cloud. **The landing page code alone is
not enough**: three cluster-side surfaces must point to Dex.

## 1. Landing page (this image)

- Build and publish the image from this repository, then point the landing-page
  Deployment to this image (instead of `theiacloud/theia-cloud-landing-page`).
- Deploy `deploy/landing-page-config-map.yaml.j2` (generates `config.js`) and
  mount it at `/usr/share/nginx/html/config.js`.
- Ansible variables expected by the template: `app_definition_name`,
  `service_host`, `vault_service_auth_token`, `dex_host`, `dex_client_id`,
  `oidc_token_type` (default `access_token`), + optional ones (`additional_apps`,
  `landing_info_*`, etc.).

## 2. theia-cloud backend service (Bearer validation)

The Quarkus service validates the token via standard `quarkus.oidc` — no
Keycloak-specific code. Point the issuer to Dex:

- `quarkus.oidc.auth-server-url` = `https://<dex_host>/dex`
- `quarkus.oidc.client-id` = Dex API client (can be the same as the landing page
  if Dex allows it as audience, otherwise a dedicated client)
- `quarkus.oidc.tls.verification` = `none` internally if using self-signed certificates.

⚠️ **`oidcTokenType` must match what the service validates.** The landing page
sends the `access_token` by default. If the service is configured to validate the
`id_token`, set `oidc_token_type: id_token` in the landing page config.
This is the point to settle during end-to-end verification (see plan, step 3).

## 3. oauth2-proxy in front of IDE instances

The official chart uses **oauth2-proxy** to protect IDE sessions (not just the
landing page). In the current IaC (role `theia_cloud`), the `keycloak:` block
builds the issuer as `authUrl + "realms/" + realm` — **Keycloak-specific format**.
For Dex:

- The Dex issuer is `https://<dex_host>/dex` (no `realms/` segment).
- Configure oauth2-proxy with `--oidc-issuer-url=https://<dex_host>/dex`
  and the generic `oidc` provider, or check whether the chart exposes values
  to override the issuer without the `realms/` prefix.
- The oauth2-proxy client = a **confidential** Dex static client (with secret),
  distinct from the landing page public client.

## 4. Dex — static clients

```yaml
staticClients:
  # Landing page SPA (public, PKCE)
  - id: theia-cloud
    name: Theia Cloud Landing
    public: true
    redirectURIs:
      - https://<landing_host>/callback
  # IDE instances oauth2-proxy (confidential)
  - id: theia-cloud-proxy
    name: Theia Cloud Proxy
    secret: "<vault>"
    redirectURIs:
      - https://<instance_host>/oauth2/callback
```

## Summary of fixed decisions (see plan)

- Landing page OIDC lib: `oidc-client-ts` (Authorization Code + PKCE).
- New `oidc*` config fields (no reuse of `keycloak*` fields).
- Bearer token: `access_token` by default, switchable to `id_token` via config —
  to be confirmed against the service during testing.

## Out of scope for this repository

- Ansible role for deploying Dex itself and migration of the `platform_deps` role
  (Keycloak → Dex).
- Update of architecture decision #4 in the IaC root `CLAUDE.md` (Keycloak frozen).

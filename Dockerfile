# --- Build stage ---
FROM node:26-alpine AS build-stage
WORKDIR /app

# Cache des dépendances : ne re-télécharge que si le manifeste change.
COPY package.json package-lock.json* ./
RUN npm ci

# Sources puis build (tsc + vite → /app/dist)
COPY . .
RUN npm run build

# --- Production stage ---
FROM nginxinc/nginx-unprivileged:stable-alpine
# Config nginx avec fallback SPA (pour /callback et le refresh client-side).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist /usr/share/nginx/html

# config.js est monté au runtime par le ConfigMap K8s sur
# /usr/share/nginx/html/config.js (cf. deploy/landing-page-config-map.yaml.j2).
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

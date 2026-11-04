# Dockerfile del frontend (Next.js). El contexto de build es la raiz del repo
# (no apps/web), porque el workspace necesita package-lock.json y los demas workspaces.

# Etapa 1: compila el frontend y el paquete compartido
FROM node:24-alpine AS build
WORKDIR /repo
# Desactiva la telemetria de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED=1

# Copiamos primero solo los package.json: asi la capa de npm ci se cachea
# mientras no cambien las dependencias. npm ci necesita todos los workspaces del lockfile.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# Ahora el codigo fuente y la compilacion
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build -w @cafeteria/shared && npm run build -w @cafeteria/web

# Etapa 2: imagen final. Next.js "standalone" trae su propio server.js y solo las dependencias necesarias
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Escucha en todas las interfaces, si no Docker no podria exponer el puerto
ENV HOSTNAME=0.0.0.0

# El standalone conserva la estructura del monorepo: server.js queda en apps/web/
COPY --from=build /repo/apps/web/.next/standalone ./
# Los estaticos y la carpeta public no entran en standalone; hay que copiarlos a mano
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

# No ejecutamos como root: el usuario "node" viene incluido en la imagen
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

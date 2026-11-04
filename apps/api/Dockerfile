# Dockerfile de la API. El contexto de build es la raiz del repo (no apps/api),
# porque el workspace necesita package-lock.json y los demas workspaces.

# Etapa 1: compila la API y el paquete compartido
FROM node:24-alpine AS build
WORKDIR /repo

# Copiamos primero solo los package.json: asi la capa de npm ci se cachea
# mientras no cambien las dependencias. npm ci necesita todos los workspaces del lockfile.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# Ahora el codigo fuente y la compilacion
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @cafeteria/shared && npm run build -w @cafeteria/api

# Quitamos las devDependencies para que la etapa final sea mas pequena
RUN npm prune --omit=dev

# Etapa 2: imagen final, solo lo necesario para ejecutar la API
FROM node:24-alpine
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages/shared/package.json packages/shared/package.json
COPY --from=build /repo/packages/shared/dist packages/shared/dist
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist

# No ejecutamos como root: el usuario "node" viene incluido en la imagen
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]

FROM node:24-bookworm-slim AS build

WORKDIR /workspace
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pixytalk/api build
RUN pnpm --filter @pixytalk/api deploy --prod --legacy /runtime/api
RUN cp -R apps/api/dist /runtime/api/dist

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /runtime/api ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

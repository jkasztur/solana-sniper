ARG NODE_IMAGE=node:20.9.0-alpine

FROM ${NODE_IMAGE} as build
WORKDIR /app
COPY . .
ENTRYPOINT ["/app/docker/entrypoint"]

FROM ${NODE_IMAGE} as release
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm prune --production --silent && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/docker ./docker

FROM ${NODE_IMAGE} as latest
ARG BUILD_VERSION
ENV BUILD_VERSION ${BUILD_VERSION}
ENV DB_INIT "true"
ENV NODE_ENV "production"
WORKDIR /app
COPY --from=release /app/node_modules /app/node_modules
COPY --from=release /app /app
ENTRYPOINT ["/app/docker/entrypoint"]
CMD npm run start:prod

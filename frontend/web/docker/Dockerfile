# syntax=docker/dockerfile:1.3
########################################
# → Build stage (multi-arch)
########################################
FROM node:14-alpine AS build

# ensure BuildKit cache mounts and QEMU work properly
RUN apk update && apk upgrade && \
    apk add --no-cache git

WORKDIR /app

# copy everything in one go (so cache invalidation is minimal)
ARG WORK_DIR
COPY ${WORK_DIR} .

# clean out any old modules
RUN yarn cache clean && rm -rf node_modules

# install OS deps your script needs
RUN cd web && ./install-deps.sh

# use BuildKit cache for yarn, bump network‐timeout
RUN --mount=type=cache,id=yarn-cache,target=/root/.cache/yarn \
    cd web && \
    yarn install --frozen-lockfile --network-timeout 600000 && \
    yarn build:webpack

########################################
# → Final stage
########################################
FROM nginx:mainline-alpine

ENV WORK_DIR=/var/web/digit-studio
RUN mkdir -p ${WORK_DIR}

# copy built assets + nginx config
COPY --from=build /app/web/build ${WORK_DIR}/
COPY --from=build /app/web/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Build stage
FROM node:22.14.0-bullseye-slim AS builder

WORKDIR /usr/src/app/build

# Copy only necessary files for build
COPY . .

# Build and cleanup in a single layer
RUN npm ci && \
    npm run build:prepare-dist && \
    npm cache clean --force && \
    rm -rf build/node_modules && \
    mv build/* \
      start-docker.sh \
      /usr/src/app/ && \
    rm -rf \
      /usr/src/app/build \
      /tmp/node-compile-cache

#TODO: improve node_modules handling in copy-dist/Dockerfile -> remove duplicated work
#      currently copy-dist will copy certain node_module folders, but in the Dockerfile we delete them again (to keep image size down),
#      as we install necessary dependencies in runtime buildstage anyways

# Runtime stage
FROM node:22.14.0-bullseye-slim

WORKDIR /usr/src/app

# Install only runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      gosu && \
    rm -rf \
      /var/lib/apt/lists/* \
      /var/cache/apt/*

COPY --from=builder /usr/src/app ./

RUN sed -i "/electron/d" package.json && \
    npm ci --omit=dev && \
    npm cache clean --force && \
    rm -rf /tmp/node-compile-cache

# Configure container
EXPOSE 8080
CMD [ "./start-docker.sh" ]
HEALTHCHECK --start-period=10s CMD exec gosu node node docker_healthcheck.js
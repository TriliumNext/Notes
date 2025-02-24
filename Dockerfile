# Build stage
FROM node:22.14.0-bullseye-slim AS builder

# Configure build dependencies in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    autoconf \
    automake \
    g++ \
    gcc \
    libtool \
    make \
    nasm \
    libpng-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy only necessary files for build
COPY . .
COPY server-package.json package.json

# Build and cleanup in a single layer
RUN cp -R build/src/* src/. && \
    cp build/docker_healthcheck.js . && \    
    rm docker_healthcheck.ts && \
    npm install && \
    npm run build:webpack && \
    npm prune --omit=dev && \
    npm cache clean --force && \
    cp -r src/public/app/doc_notes src/public/app-dist/. && \
    rm -rf src/public/app/* && \
    mkdir -p src/public/app/services && \
    cp -r build/src/public/app/services/mime_type_definitions.js src/public/app/services/mime_type_definitions.js && \
    rm src/services/asset_path.ts && \
    rm -r build

# Runtime stage
FROM node:22.14.0-bullseye-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/* && \
    rm -rf /var/cache/apt/*

WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/db ./db
COPY --from=builder /usr/src/app/docker_healthcheck.js .
COPY --from=builder /usr/src/app/start-docker.sh .
COPY --from=builder /usr/src/app/package.json .
COPY --from=builder /usr/src/app/config-sample.ini .
COPY --from=builder /usr/src/app/images ./images
COPY --from=builder /usr/src/app/translations ./translations
COPY --from=builder /usr/src/app/libraries ./libraries

# Configure container
EXPOSE 8080
CMD [ "./start-docker.sh" ]
HEALTHCHECK --start-period=10s CMD exec gosu node node docker_healthcheck.js
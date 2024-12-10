FROM triliumnext/notes

WORKDIR /usr/src/app

# Install git and TypeScript
RUN apk update && apk add --no-cache git && \
    npm install -g --no-cache typescript

# we were doing this before, it might still be needed
# # Copy package files and install dependencies
# COPY package*.json tsconfig.json ./

# Clone the repository to a temp directory and copy files
RUN git clone --depth 1 --branch feature/bare2share-container https://github.com/maphew/trilium /tmp/trilium && \
    rm -rf /tmp/trilium/.git && \
    cp -r /tmp/trilium/. . && \
    rm -rf /tmp/trilium && \
    npm install && \
    npm run webpack && \
    npm run prepare-dist && \
    cp -R dist/* src/. && \
    rm -rf dist && \
    npm prune --production && \
    rm -rf node_modules/.cache

# Set production environment
ENV NODE_ENV=production
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/data/test-2024-12-02
ENV TRILIUM_PORT=8080

# Create data directory
RUN mkdir -p /data && chown -R node:node /data

# Switch to non-root user
USER node

EXPOSE 8080
CMD ["node", "src/main.js"]

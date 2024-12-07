FROM triliumnext/notes

WORKDIR /usr/src/app

# Install TypeScript and development dependencies globally
# Includes ts-node for direct TS execution
RUN npm install -g typescript ts-node @types/node 

# Copy package files and install dependencies
# Keeps dev dependencies for better debugging
COPY package*.json tsconfig.json ./
RUN npm install 

# Copy source files
COPY . .

# Set environment variables
ENV TRILIUM_ENV=dev
ENV NODE_NO_WARNINGS=1
ENV TRILIUM_DATA_DIR=/usr/src/app/data

# Run with nodemon for hot-reload
# Note: Type checking can be run manually with: npx tsc --noEmit
CMD ["npx", "nodemon", "src/main.ts"]
#!/usr/bin/env pwsh

# Assumes Dockerfile.notes-dev has been built
# run that image and insert these local files into it

# Stop and remove existing container if it exists
podman stop notes-dev 2>$null
podman rm notes-dev 2>$null

# Build development image
podman build -t notes-dev -f Dockerfile.notes-dev .

# Run the container with mounted volumes
podman run -d `
    --name notes-dev `
    -p 8080:8080 `
    -v ${PWD}/src:/usr/src/app/src `
    -v ${PWD}/libraries:/usr/src/app/libraries `
    -v ${PWD}/package.json:/usr/src/app/package.json `
    -v ${PWD}/package-lock.json:/usr/src/app/package-lock.json `
    notes-dev

# Show the logs
Write-Host "Container started. Showing logs..."
podman logs -f notes-dev

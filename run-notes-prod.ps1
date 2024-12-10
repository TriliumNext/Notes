#!/usr/bin/env pwsh

# Stop and remove existing container if it exists
podman stop notes-prod 2>$null
podman rm notes-prod 2>$null

# Build production image
podman build -t notes-prod -f fly.dockerfile .

# Run the container with mounted volumes
podman run -d `
    --name notes-prod `
    -p 8080:8080 `
    -v ${PWD}/data:/usr/src/app/data `
    notes-prod

# Show the logs
Write-Host "Container started. Showing logs..."
podman logs -f notes-prod

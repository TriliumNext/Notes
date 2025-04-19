# Build deliveries locally
In the project root:

<figure class="table"><table><thead><tr><th>Platform</th><th>Architecture</th><th>Application</th><th>Build command</th></tr></thead><tbody><tr><th>macOS</th><td>x86_64</td><td>Desktop / Electron app</td><td><code>./bin/build-mac-x64.sh</code></td></tr><tr><td>ARM 64</td><td>Desktop / Electron app</td><td><code>./bin/build-mac-arm64.sh</code></td></tr><tr><th>Linux</th><td>x86_64</td><td>Desktop / Electron app</td><td><code>./bin/build-linux-x64.sh</code></td></tr><tr><td>Server</td><td><code>./bin/build-server.sh</code></td></tr><tr><th>Windows</th><td>x86_64</td><td>Desktop / Electron app</td><td><code>./bin/build-win-x64.sh</code></td></tr></tbody></table></figure>

Under NixOS the following `nix-shell` is needed:

```
nix-shell -p jq
```

For Linux builds:

```
nix-shell -p jq fakeroot dpkg
```

The resulting build will be in the `dist` directory under the project root.

### Testing the Linux builds under NixOS

<figure class="table"><table><thead><tr><th>Desktop client</th><th>Server</th></tr></thead><tbody><tr><td><pre><code class="language-text-plain">$ NIXPKGS_ALLOW_UNFREE=1 nix-shell -p steam-run
[nix-shell] cd dist/trilium-linux-x64
[nix-shell] steam-run ./trilium</code></pre></td><td><pre><code class="language-text-plain">$ NIXPKGS_ALLOW_UNFREE=1 nix-shell -p steam-run
[nix-shell] cd dist/trilium-linux-x64-server
[nix-shell] steam-run ./trilium.sh</code></pre></td></tr></tbody></table></figure>
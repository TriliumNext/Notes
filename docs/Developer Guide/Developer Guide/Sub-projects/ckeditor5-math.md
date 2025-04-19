# ckeditor5-math
<figure class="image image-style-align-right"><img src="ckeditor5-math_image.png"><figcaption><code>ckeditor5-math</code> in action.</figcaption></figure>

A fork of [isaul32/ckeditor5-math](https://github.com/isaul32/ckeditor5-math), which is the CKEditor5 plugin which adds the math functionality. The fork was created to handle <a class="reference-link" href="#root/OeKBfN6JbMIq/MF99QFRe1gVy/orRZgNnWETTw/tXFiNo5IYd31/jMHQCKORhZge">#297: Insert Math appears to be broken</a>.

## Development environment

*   Tested on Node.js 20.
*   The package manager is yarn 1 (v1.22.22 is known to be working fine for it at the time of writing).
*   Committing is protected by `husky` which runs `eslint` to ensure that the code is clean.

Important commands:

*   To check if the code has any formatting issues: `yarn lint`
*   To start a live preview: `yarn start`
*   To run the tests: `yarn test`
    *   Note that this requires Chromium, on NixOS this can be achieved by running a `nix-shell -p chromium`, and running `CHROME_BIN=$(which chromium) yarn test` inside it.

## 📦 Packages

The built artifact of the plugin is released by the CI and available on the [GitHub NPM registry](https://github.com/TriliumNext/ckeditor5-math/pkgs/npm/ckeditor5-math).

Note that due to limitations on GitHub's registry, it is not possible to install this package without setting up a personal access token (even though the package itself is public). See <a class="reference-link" href="#root/ZlxZh8NH5frM/jUH2zJGXM67N">[missing note]</a> for more information.

## ⬆️ Integrating with <a class="reference-link" href="CKEditor">CKEditor</a>

1.  Release a new version: <a class="reference-link" href="ckeditor5-math/Release%20management%20%26%20continuou.md">Release management &amp; continuous integration</a>
2.  In `trilium-ckeditor5`, go to `packages/ckeditor5-build-trilium/package.json` in the CKEditor repository and change the dependency of `@triliumnext/ckeditor5-math` to the newly released version.
3.  Run `yarn install`.
4.  Proceed with <a class="reference-link" href="CKEditor/Building%20the%20editor.md">Building the editor</a> to integrate everything into TriliumNext and then commit the change.
# Documentation
<figure class="image image-style-align-right"><img style="aspect-ratio:205/162;" src="Documentation_image.png" width="205" height="162"></figure>

There are multiple types of documentation for Trilium:

*   The _User Guide_ represents the user-facing documentation. This documentation can be browsed by users directly from within Trilium, by pressing <kbd>F1</kbd>.
*   The _Developer's Guide_ represents a set of Markdown documents that present the internals of Trilium, for developers.
*   _Release Notes_, this contains the change log for each released or soon-to-be-released version. The release notes are used automatically by the CI when releasing a version.
*   The _Script API_, which is an automatically generated documentation for the front-end and back-end APIs for scripts.

## Editing documentation

There are two ways to modify documentation:

*   Using a special mode of Trilium.
*   By manually editing the files.

### Using `docs:edit`

To edit the documentation using Trilium, set up a working development environment and run the following commands:

*   On most operating systems, `npm run electron:switch` followed by `npm run docs:edit`
*   On NixOS, `npm run docs:edit-nix`.

> [!NOTE]
> `npm run docs:edit` acts very similar to `npm run electron:start` in the sense that you cannot both be editing documentation and starting a server. Using both `npm run electron:start` and `docs:edit` is possible, since they are using the same Electron instance.

How it works:

*   At startup, the documentation from `docs/` is imported from Markdown into a in-memory session (the initialization of the database is already handled by the application).
*   Each modification will trigger after 10s an export from the in-memory Trilium session back to Markdown, including the meta file.

### Manual editing

Apart from the User Guide, it's generally feasible to make small modifications directly using a Markdown editor or VS Code, for example.

When making manual modifications, avoid:

*   Uploading pictures, since images are handled as Trilium attachments which are stored in the meta file.
*   Changing the file or directory structure in any way, since that is also handled by the meta file. A missing file will most certainly cause a crash at start-up when attempting to edit the docs using Trilium.

### Reviewing & committing the changes

Since the documentation is tracked with Git, after making the manual or automatic modifications (wait at least 10s after making the modification) the changes will reflect in Git.

Make sure to analyze each modified file and report possible issues.

Important aspects to consider:

*   The Trilium import/export mechanism is not perfect, so if you make some modifications to the documentation using `docs:edit`, at the next import/export/import cycle some whitespace might get thrown in. It's generally safe to commit the changes as-is.
*   Since we are importing Markdown, editing HTML and then exporting the HTML back to Markdown there might be some edge cases where the formatting is not properly preserved. Try to identify such cases and report them in order to get them fixed (this will benefit also the users).

## Location of the documentation

All documentation is stored in the [Notes](https://github.com/TriliumNext/Notes) repository:

*   `docs/Developer Guide` contains Markdown documentation that can be modified either externally (using a Markdown editor, or internally using Trilium).
*   `docs/Release Notes` is also stored in Markdown format and can be freely edited.
*   `docs/Script API` contains auto-generated files and thus must not be modified.
*   `docs/User Guide` contains also Markdown-only documentation but must generally not be edited externally.
    *   The reason is that the `docs:edit` feature will not only import/export this documentation, but also generate the corresponding HTML documentation and meta structure in `src/public/app/doc_notes/en/User Guide`.
    *   It's theoretically possible to edit the Markdown files externally and then run `docs:edit` and trigger a change in order to build the documentation, but that would not be a very productive workflow.

## Updating the Script API

As mentioned previously, the Script API is not manually editable since it is auto-generated using TypeDoc.

To update the API documentation, simply run `npm run docs:build`. Compare the changes (if any) and commit them.

Note that in order to simulate the environment a script would have, some fake source files (in the sense that they are only used for documentation) are being used as entrypoints for the documentation:

*   For back-end scripts, the script is located in `src/services/backend_script_entrypoint.ts`.
*   For front-end scripts, the script is located in `src/public/app/services/frontend_script_entrypoint.ts`.
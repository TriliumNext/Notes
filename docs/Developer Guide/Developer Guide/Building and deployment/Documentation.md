# Documentation
Development notes are published on [triliumnext.github.io/Notes](https://triliumnext.github.io/Notes) by the CI using GitHub Pages.

The GitHub Pages deployment works by taking the files from the Notes repository, in the `docs` directory.

## How it works

There is a script that uses `wget` to download all the files from a share, that means:

1.  You must have a local instance of Trilium Notes server.
2.  You must have the documentation imported, up to date and shared.

Note that currently the documentation source file is not distributed (the note export), until a way is found to automate this process. Contact `eliandoran` should you require to obtain a copy of the documentation.

## Setting up `.env` file

Go to `bin/docs` and copy `.env.example` to `.env` and edit it:

1.  Change the `SHARE_PROTOCOL` to either `http` or `https` depending on your setup.
2.  Change `SHARE_HOST` to match the domain name or the URL to the host (without the protocol or any slashes).

Generally `ROOT_NOTE_ID` should not be changed since the note ID must match if the files were imported correctly.

## Triggering a build

Run:

```
./bin/docs/prepare.sh
```

This will attempt to download all the notes from the share URL and put them in `docs`, rewritten for GitHub Pages.

Commit the results and follow the normal development process to push them.
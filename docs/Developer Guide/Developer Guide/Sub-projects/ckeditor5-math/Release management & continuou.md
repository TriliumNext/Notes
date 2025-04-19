# Release management & continuous integration
To automate the release process, a GitHub workflow has been added which builds the package and releases it over to GitHub NPM registry.

The workflow publishes a release whenever a tag with the correct format is pushed.

The steps are as follows:

1.  Ensure that the source code is clean and ready for a release.
2.  Go to `package.json` and bump the `version` field.
3.  Commit the changes.
4.  Tag the commit with `v1.2.3`, with the correct version number.
5.  Push the changes.

Then follow the CI and it should indicate success. Afterwards, check the [package](https://github.com/TriliumNext/ckeditor5-math/pkgs/npm/ckeditor5-math)section to ensure that the package is in the “Recent Versions” section.

If the changes could benefit upstream, consider opening a pull request with the changes there as well.
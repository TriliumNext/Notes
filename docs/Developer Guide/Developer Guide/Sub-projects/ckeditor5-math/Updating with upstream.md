# Updating with upstream
If there was a change in the upstream repository ([isaul32/ckeditor5-math](https://github.com/isaul32/ckeditor5-math)), it can be integrated as follows:

1.  Add the upstream as remote (`git remote add upstream ssh://git@github.com/isaul32/ckeditor5-math.git`).
2.  Fetch the changes: `git fetch upstream`
3.  Merge with a tag: `git merge v43.1.2`
4.  Solve the conflict in `package.json` by:
    1.  Taking the same version as the upcoming one and appending `-hotfix1`.
    2.  Keeping the `@triliumnext/ckeditor5-math` name.
5.  Install dependencies: `yarn install`
6.  Check that the build works via `yarn prepublishOnly`.
7.  Commit the changes, push them.
8.  Release a version with <a class="reference-link" href="Release%20management%20%26%20continuou.md">Release management &amp; continuous integration</a>.

## CI job not triggered after pushing all the upstream tags

If the CI job was not triggered, you might have accidentally pushed a lot of tags using `git push --tags`. Manually delete the tag and push it again:

```diff
git push -d origin v43.1.2-hotfix1 && git push --tags
```
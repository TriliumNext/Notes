# Releasing a version
On NixOS:

```
nix-shell -p dpkg fakeroot jq nodejs_20
```

Then simply run from project root:

```
./bin/release.sh 1.2.3
```

where `1.2.3` is the desired release version.

If a version ends with `-beta`, it will automatically be marked as pre-release in GitHub.

This will automatically generate a release in GitHub if everything goes according to plan.

Note that the Windows installer is not automatically uploaded yet, it has to be taken from the [main workflow of the CI from the `develop` branch](CI/Main.md).

Make sure to check test the artifacts of the release.
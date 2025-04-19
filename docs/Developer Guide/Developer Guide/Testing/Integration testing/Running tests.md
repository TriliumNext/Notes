# Running tests
## First-time run

Before starting Playwright, it has to be installed locally via:

```
npx playwright install
```

## Starting the integration test server

There are two types of integration test servers:

*   `npm run integration-mem-db` will run a server with dev mode disabled.
    *   This is usually what the end user will see when accessing a server instance.
    *   It will not test the Electron/desktop side of the application.
    *   Changes to the public scripts will not take effect until running `npm run webpack`.
*   `npm run integration-mem-db-dev` will run a server with dev mode enabled.
    *   This is usually what a dev sees when running `npm run start-server`.
    *   The difference with the production one is that the assets are loaded directly from files and as such it does not require `npm run webpack` to see changes.

Either options will open up a server on [localhost:8082](http://localhost:8082) that can be accessed either manually via the browser or via Playwright.

When asked for a password, the password is `demo1234`.

## Starting the interactive test runner

After starting the integration test server, to run the Playwright UI, run in the terminal:

```
npx playwright test --ui
```

It is also possible to run the interactive code generator instead:

```
npx playwright codegen
```
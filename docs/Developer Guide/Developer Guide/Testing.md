# Testing
## Unit testing and integration testing

Using `vitest`, there are some unit and integration tests done for both the client and the server.

These tests can be found by looking for the corresponding `.spec.ts` in the same directory as the source file.

<figure class="table"><table><tbody><tr><td><p>To run the server-side tests:</p><pre><code class="language-text-x-trilium-auto">npm run server:test</code></pre><p>To view the code coverage for the server:</p><pre><code class="language-text-x-trilium-auto">npm run server:coverage</code></pre><p>Afterwards, a friendly HTML report can be found in <code>/coverage/index.html</code>.</p></td><td><p>To run the client-side tests:</p><pre><code class="language-text-x-trilium-auto">npm run client:test</code></pre><p>To view the code coverage for the client:</p><pre><code class="language-text-x-trilium-auto">npm run client:coverage</code></pre><p>Afterwards, a friendly HTML report can be found in <code>/src/public/app/coverage/index.html</code>.</p></td></tr></tbody></table></figure>

To run both client and server-side tests:

```
npm run test
```

Note that some integration tests rely on an in-memory database in order to function. 

### REST API testing for the server

Some original work was done by Zadam in `/test-etapi`, using `.http` files.

New effort using `vitest` and `supertest` to initialize the Express server and run assertions without having to make actual requests to the server.

An important aspect is that we have access to the Express `app` which allows for interesting assertions such as checking the state of the server, registering debug middleware and so on.

One example is `src/share/routes.spec.ts`.

These integration tests are run alongside unit tests.

## End-to-end testing

*   This tests both the client and the server, by running the server and then using Playwright to query the state of the page.
*   These can be found in `/e2e`.
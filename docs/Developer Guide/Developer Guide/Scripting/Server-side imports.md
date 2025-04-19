# Server-side imports
Trilium Notes allowed the use of Common.js module imports inside backend scripts, such as:

```
const isBetween = require('dayjs/plugin/isBetween')
api.dayjs.extend(isBetween)
```

For TriliumNext, the backend has been switched to use ESM which has a slightly more complicated syntax. Instead of `require` we now have `import` but which is asynchronous so it will require an `await`:

```
const isBetween = (await import("dayjs/plugin/isBetween")).default;
api.dayjs.extend(isBetween);
```

Note that `.default` is also usually needed to obtain the same behaviour as a CJS import. When in doubt, use `console.log` to see the output of the value returned by `await import`.
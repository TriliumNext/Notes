# Adding a new client library
In the past some libraries have been copy-pasted (and adapted if needed) to the repository. However, new libraries must be obtained exclusively through npm.

The first step is to install the desired library. As an example we are going to install `i18next`:

```
npm i i18next
```

### Step 1. Understanding the structure of the import

After installing the dependency, it's important to know how it's structured. You can do this by looking at the directory structure of the newly imported dependency:

```
$ tree node_modules/i18next
node_modules/i18next
├── dist
│   ├── cjs
│   │   └── i18next.js
│   ├── esm
│   │   ├── i18next.bundled.js
│   │   ├── i18next.js
│   │   └── package.json
│   └── umd
│       ├── i18next.js
│       └── i18next.min.js
├── i18next.js
├── i18next.min.js
├── index.d.mts
├── index.d.ts
├── index.js
├── index.v4.d.ts
├── LICENSE
├── package.json
├── README.md
└── typescript
    ├── helpers.d.ts
    ├── options.d.ts
    ├── t.d.ts
    └── t.v4.d.ts
```

Generally you should be looking for a `.min.js` file. Note that the `esm` and `cjs` variants generally don't work, we are looking for the classic, no module dependency.

### Step 2. Exposing the library from the server

The library must be delivered by the server and this is done via `src/routes/assets.ts`. In the `register` function, add a new entry near the bottom of the function:

```javascript
app.use(`/${assetPath}/node_modules/i18next/`, persistentCacheStatic(path.join(srcRoot, "..", 'node_modules/i18next/')));
```

### Step 3. Adding it to the library loader

The library loader is a client module which is in charge of downloading the library from the server and importing it. The loader is located in `src/public/app/services/library_loader.js`.

To add a new library, start by creating a constant for it, with the value pointing to the minified JS identified at the first step:

```javascript
const I18NEXT = {
    js: [
        "node_modules/i18next/i18next.min.js"
    ]
};
```

Then add it to the `export default` section:

```diff
 export default {
     requireCss,
     requireLibrary,
     CKEDITOR,
     CODE_MIRROR,
     ESLINT,
     RELATION_MAP,
     PRINT_THIS,
     CALENDAR_WIDGET,
     KATEX,
     WHEEL_ZOOM,
     FORCE_GRAPH,
     MERMAID,
     EXCALIDRAW,
-    MARKJS
+    MARKJS,
+    I18NEXT
 }
```

### Step 4. Using the library

To import the library, simply use the following mechanism:

```diff
import library_loader from "./library_loader.js";

await library_loader.requireLibrary(library_loader.I18NEXT);
```

Make sure to replace `I18NEXT` with the library that was created at the previous steps.

Note that because we are not using a module management mechanism such as ES Modules or Common.js modules, the `requireLibrary` method does not actually return anything. 

To benefit from the library, it must export on its own an object in `window`.

In the case of `i18next`, it sets `window.i18next` and that can be used directly:

```diff
i18next.init({});
```

### Step 5. Adding Electron support

For Electron, the `node_modules` are copied as a separate step by `bin/copy-dist.ts`.

Scroll all the way down to the `nodeModulesFolder` and append an entry for the newly added libraries.
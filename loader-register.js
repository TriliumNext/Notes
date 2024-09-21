// Used to register the loader with Node.js
// This is used to avoid the warning message when using the loader
// Can be removed if this PR is merged:
// https://github.com/TypeStrong/ts-node/pull/2073
// Then probably can change webpack comand to
// "webpack": "cross-env NODE_OPTIONS=--import=ts-node/esm webpack -c webpack.config.ts",

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('ts-node/esm', pathToFileURL('./'));
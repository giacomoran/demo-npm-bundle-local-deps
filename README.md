# demo-npm-bundle-local-deps

## Problem

Firebase Cloud Functions do not support a monorepo setup.
The folder pointed to by `firebase.json -> functions -> source` is copied over in a container. The container is run on every Cloud Function cold start.
When the container is run, the `npm` dependencies are installed. This means that we need a `package.json` in the folder. To support deterministic builds a `package-lock.json` should also be included.
The dependencies are installed from the `npm` registry. Therefore local dependencies (other packages in the monorepo) are not supported.

## Solution: bundle local dependencies

See `packages/fnc/build.js`.

Instructions:

- `npm i`
- `npm run build:bundle -w @demo/fnc`
- Explore `packages/fnc/dist` folder

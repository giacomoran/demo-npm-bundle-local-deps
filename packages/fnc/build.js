// We build 3 files in the `dist/` directory before deploying Cloud Functions:
// - `dist/index.js`: the JS bundle, with functions code and local dependencies
// - `dist/package.json`: with local dependencies and scripts removed
// - `dist/package-lock.json`: specific to this workspace
//
// WARN: Build `dist/package.json` and `dist/package-lock.json` after each
// `npm install` in the monorepo root (in `postinstall` script).
// The two options are:
// O1. build `dist/package.json` and `dist/package-lock.json` at deploy time
//     (when bundling `dist/index.js`)
// O2. build `dist/package.json` and `dist/package-lock.json` after each `npm
//     install` in the monorepo root
// The concern is `dist/package-lock.json` being out of sync with the root
// `package-lock.json` file.
// Arborist is aware of the `package-lock.json` file in the monorepo root, so
// O1 is viable. However O2 is safer, it ensures that `dist/package-lock.json`
// is always in sync with the root `package-lock.json` file.

import Arborist from "@npmcli/arborist";
import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import bin from "tiny-bin";

// #:

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const DIR_SRC = path.join(__dirname, "src");
const DIR_DIST = path.join(__dirname, "dist");

// Local dependencies.
const DEPS_LOCAL = ["@demo/dep"];

// #: buildBundle
// Build the JS bundle using `esbuild`.
// Note that we use the `nodeExternalsPlugin` to only bundle `DEPS_LOCAL`,
// externalising all other dependencies.

const OPTIONS_ESBUILD = {
  entryPoints: [path.join(DIR_SRC, "index.js")],
  outfile: path.join(DIR_DIST, "index.js"),
  bundle: true,
  sourcemap: true,
  metafile: true,
  platform: "node",
  target: ["node18"],
  format: "esm",
  plugins: [nodeExternalsPlugin({ allowList: DEPS_LOCAL })],
  logLevel: "info", // default log level when using the CLI
};

const buildBundle = async () => {
  // Build the bundle.
  await esbuild.build(OPTIONS_ESBUILD);

  console.log("Successfully built dist/index.js");
};

// #: buildPackage
// Copy the `package.json` file from the workspace directory to the `dist/`
// directory. In doing so:
// - remove all dependencies listed in `DEPS_LOCAL`
// - remove the `scripts` prop, to prevent footguns with `pre` and `post` script
// - remove the `devDependencies` prop, as we don't need it in deployment
// - add the `main` prop pointing to the JS bundle

const buildPackage = async () => {
  // Read the `package.json` file from the workspace directory.
  const FILE_PACKAGE = path.join(__dirname, "package.json");
  const dataPackage = JSON.parse(
    await fs.promises.readFile(FILE_PACKAGE, "utf8")
  );

  // Remove local dependencies, scripts, and devDependencies.
  for (const dep of DEPS_LOCAL) {
    delete dataPackage.dependencies[dep];
  }
  delete dataPackage.scripts;
  delete dataPackage.devDependencies;
  dataPackage.main = "index.js";

  // Write `package.json` file in the `dist/` directory.
  await fs.promises.mkdir(path.join(DIR_DIST), { recursive: true });
  await fs.promises.writeFile(
    path.join(DIR_DIST, "package.json"),
    JSON.stringify(dataPackage, null, 2)
  );

  console.log("Successfully built dist/package.json");
};

// #: buildPackageLock
// Create a `package-lock.json` file in the `dist/` directory, specific to this
// workspace.
// Note that copying over the `package-lock.json` file from the monorepo root
// would include dependencies of other workspaces.

const buildPackageLock = async () => {
  // Create a tree of the dependencies for this workspace.
  const arborist = new Arborist({ path: __dirname });
  const { meta } = await arborist.buildIdealTree({ rm: DEPS_LOCAL });
  meta?.commit();

  // Write `package-lock.json` file in the `dist/` directory.
  await fs.promises.mkdir(path.join(DIR_DIST), { recursive: true });
  await fs.promises.writeFile(
    path.join(DIR_DIST, "package-lock.json"),
    String(meta)
  );

  console.log("Successfully built dist/package-lock.js");
};

// #: main

// prettier-ignore
bin("build")
  .command("bundle", "build the JS bundle, output in the dist/ directory")
  .action(buildBundle)

  .command("package", "build package.json, output in the dist/ directory")
  .action(buildPackage)

  .command("package-lock", "build package-lock.json, output in the dist/ directory")
  .action(buildPackageLock)

  .run();

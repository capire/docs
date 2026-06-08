---
synopsis: >
  The guide provides an overview of custom build processes for CAP projects, explaining how to tailor the standard build process to specific project requirements.
status: released
---

# Customizing `cds build`

[[toc]]


## Automatic Build Tasks

`cds build` runs _build tasks_ on your project to prepare it for deployment.

Build tasks compile _source files_ (typically CDS sources) and create required artifacts, for example, EDMX files or SAP HANA design-time artifacts.

For a full production build, this command should be enough for most projects:
```sh
cds build --production
```

Build tasks are derived from the CDS configuration and project context. By default, CDS models are resolved from these sources:

- _db/_, _srv/_, _app/_ — default root folders of a CAP project
- _fts/_ and its subfolders when using [feature toggles](../extensibility/feature-toggles#enable-feature-toggles)
- CDS model folders and files defined by [required services](../../node.js/cds-env#services)
  - Built-in examples: [persistent queue](../../node.js/queue#persistent-queue) or [MTX-related services](../multitenancy/mtxs#mtx-services-reference)
- Explicit `src` folder configured in the build task


Feature toggle folders and required built-in service models will also be added if user-defined models have been configured as a [`model` option](#build-task-properties) in your build tasks.

[Learn more about `cds.resolve`](../../node.js/cds-compile#cds-resolve){.learn-more}

## Extending `cds build`

Provide additional service integrations by writing a `cds build` plugin:

```js
// cds-plugin.js
const cds = require('@sap/cds')
cds.build?.register?.('my-plugin',
  class extends cds.build.Plugin {
    async build() { /* ... */ }
  }
)
```
[Learn more about `cds build` plugins](../../tools/apis/cds-build){.learn-more}{style="margin-top: 0px"}

## Custom Build Tasks

If custom build tasks are configured, those properties have precedence.

For example, you want to configure the _src_ folder and add the default models. To achieve this, do not define the _model_ option in your build task:

::: code-group
```jsonc [package.json]
{ "cds": {
  "build": {
   "target": "gen",
   "tasks": [
     { "for": "nodejs", "src": "srv" }
    ]
  }
}}
```
:::

 This way, the model paths will still be dynamically determined, but the _src_ folder is taken from the build task configuration. You still benefit from the automatic determination of models – for example when adding a new external services or when CAP is changing any built-in service defaults.

To control which tasks `cds build` executes, you can add them as part of your [project configuration](../../node.js/cds-env#project-settings) in _package.json_ or _.cdsrc.json_, as outlined in the following chapter.


## Build Task Types

The `for` property defines the executed build task type creating its part of the deployment layout. Currently supported types are:

<style lang="scss" scoped>
th { min-width: 160px; }
</style>

| Type         | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `hana`           | SAP HANA Development Infrastructure (HDI) artifacts<br><br>[Learn more about **configuring SAP HANA**](../databases/hana#configure-hana){.learn-more} |
| `nodejs`         | Node.js applications |
| `java`           | Java applications |
| `mtx-sidecar`    | [MTX](../multitenancy/mtxs)-enabled projects _with_ sidecar architecture.<br><br>[Learn more about **Multitenant Saas Application Deployment**](./to-cf){.learn-more} |
| `mtx`            | MTX-enabled projects _without_ sidecar architecture (Node.js only). Required services are served by the Node.js application itself. |
| `mtx-extension`         | MTX extension project (_extension.tgz_), which is required for extension activation using `cds push`. Extension point restrictions defined by the SaaS app provider are validated by default. If any restriction is violated the build aborts and the errors are logged.<br><br>The build task is created by default for projects that have `"cds": { "extends": "\<SaaS app name\>" }` configured in their _package.json_.<br><br>[Learn more about **Extending and Customizing SaaS Solutions**](../extensibility/customization){.learn-more} |

Additional types may be supported by build plugin contributions.


## Build Task Properties


Build tasks can be customized using the following properties:

| Property  | Description                                                                                                                                                                                                                     |
|-----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src`     | Source folder of module to be built.                                                                                                                                  |
| `dest`    | Optional destination of the module's build destination, relative to the enclosing project. The _src_ folder is used by default. |
| `options` | `model`: _string_ or _array of string_<br><br>The given list of folders or individual _.cds_ file names is resolved based on the current working directory or project folder passed to `cds build`.<br><br>CDS built-in models (prefix _@sap/cds*_) are added by default to the user-defined list of models. |

**Note:**
Alternatively you can execute build tasks and pass the described arguments to the command line. See also `cds build --help` for further details.





## Build Target Folder {#build-target-folder}

To change the default target folder, use the <Config keyOnly>cds.build.target=path/to/my/folder</Config>. It is resolved based on the root folder of your project.


#### Node.js

Node.js projects use the folder _./gen_ below the project root as build target folder by default.<br>
Relevant source files from _db_ or _srv_ folders are copied into this folder, which makes it self-contained and ready for deployment. The default folder names can be changed with the <Config keyOnly>cds.folders.db</Config>, <Config keyOnly>cds.folders.srv</Config>, <Config keyOnly>cds.folders.app</Config> configuration. Or you can go for individual build task configuration for full flexibility.

  Project files like _.cdsrc.json_ or _.npmrc_ located in the _root_ folder or in the _srv_ folder of your project are copied into the application's deployment folder (default _gen/srv_). Files located in the _srv_ folder have precedence over the corresponding files located in the project root directory.
  As a consequence these files are used when deployed to production. Make sure that the folders do not contain one of these files by mistake. Consider using profiles `development` or `production` in order to distinguish environments. CDS configuration that should be kept locally can be defined in a file _.cdsrc-private.json_.

  The contents of the _node_modules_ folder is _not_ copied into the deployment folder. For security reasons the files _default-env.json_ and _.env_ are also not copied into the deployment folder.

  You can verify the CDS configuration settings that become effective in `production` deployments. Executing `cds env --profile production` in the deployment folder _gen/srv_ will log the CDS configuration used in production environment.

[Learn more about `cds env get`](../../node.js/cds-env#cli){.learn-more}

**Note:**
`cds build` provides `options` you can use to switch the copy behavior of specific files on or off on build task level:

::: code-group

```json [package.json]
{
  "build": {
    "tasks": [
      { "for": "nodejs", "options": { "contentCdsrcJson": false, "contentNpmrc": false } },
      { "for": "hana", "options": { "contentNpmrc": false } }
    ]
  }
}
```

:::

#### npm Workspace Support <Beta /> {#build-ws}

Use CLI option `--ws-pack` to enable tarball based deployment of [npm workspace](https://docs.npmjs.com/cli/using-npm/workspaces) dependencies. Workspaces are typically used to manage multiple local packages within a singular top-level root package.  Such a setup is often referred to as a [monorepo](https://earthly.dev/blog/npm-workspaces-monorepo/).

As an effect, your workspace dependencies can be deployed to SAP BTP without them being published to an npm registry before.

Behind the scenes, `cds build --ws-pack` creates a tarball in folder _gen/srv_ for each workspace dependency of your project that has a `*` version identifier.  Dependencies in _gen/package.json_ will be adapted to point to the correct tarball file URL:

::: code-group
```jsonc [package.json]
{
  "dependencies": {
    "some-package": "^1",  // regular package
    "some-workspace": "*"  // workspace dependency, marked as such via "*"
  }
}
```
:::

Packaging of the tarball content is based on the rules of the [`npm pack`](https://docs.npmjs.com/cli/commands/npm-pack) command:

- Files and folders defined in _.gitignore_ will not be added
- If an optional `files` field is defined in the workspace's _package.json_, only those files will be added.

#### Java

Java projects use the project's root folder _./_ as build target folder by default.<br>
This causes `cds build` to create the build output below the individual source folders. For example, _db/src/gen_ contains the build output for the _db/_ folder. No source files are copied to _db/src/gen_ because they're assumed to be deployed from their original location, the _db/_ folder itself.

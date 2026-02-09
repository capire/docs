---
synopsis: >
  The guide provides an overview of custom build processes for CAP projects, explaining how to tailor the standard build process to specific project requirements.
status: released
impl-variants: true
---

# Implement Build Plugins <Since version="7.5.0" package="@sap/cds-dk" />

CDS already offers build plugins to create deployment layouts for the most use cases. However, you will find cases where these plugins are not enough and you have to develop your own. This section shows how such a build plugin can be implemented and how it can be used in projects.

Build plugins are run by `cds build` to generate the required deployment artifacts. Build tasks hold the actual project specific configuration. The task's `for` property value has to match the build plugin ID.

The following description uses the [postgres build plugin](https://github.com/cap-js/cds-dbs/blob/55e511471743c0445d41e8297f5530abe167a270/postgres/cds-plugin.js#L9-L48) as reference implementation. It combines runtime and design-time integration in a single plugin `@cap-js/postgres`.

<ImplVariantsHint />

## Add Build Logic

A build plugin is a Node.js module complying to the [CDS plugin architecture](../../node.js/cds-plugins).
It must be registered to the CDS build system inside a top-level [cds-plugin.js](https://github.com/cap-js/cds-dbs/blob/main/postgres/cds-plugin.js) file:

::: code-group

```js [cds-plugin.js]
const cds = require('@sap/cds')
const { fs, path } = cds.utils;

cds.build?.register?.('postgres', class PostgresBuildPlugin extends cds.build.Plugin {
  static taskDefaults = { src: cds.env.folders.db }
  static hasTask() {
    return cds.requires.db?.kind === 'postgres';
  }
  init() {
    this.task.dest = path.join(this.task.dest, 'pg');
  }
  async build() {
    const model = await this.model();
    if (!model) return;

    await this.write(cds.compile.to.json(model)).to(path.join('db', 'csn.json'))

    if (fs.existsSync(path.join(this.task.src, 'data'))) {
      await this.copy(data).to(path.join('db', 'data'))
    }
    . . .
  }
})
```

:::

Notes:

- The build plugin id has to be unique. In the previous snippet, the ID is `postgres`.
- `cds.build` will be `undefined` in non-build CLI scenarios or if the `@sap/cds-dk` package isn't installed (globally or locally as a `devDependency` of the project).

CDS offers a base build plugin implementation, which you can extend to implement your own behavior. The following methods are called by the build system in this sequence:

- `static taskDefaults` - defines default settings for build tasks of this type. For database related plugins the default `src` folder value <Config keyOnly>cds.folders.db: db</Config> should be used, while for cds services related plugins <Config keyOnly>cds.folders.srv: srv</Config>.
- `static hasTask()` - determines whether the plugin should be called for the running `cds build` command, returns _true_ by default. This will create a build task with default settings defined by `taskDefaults` and settings calculated by the framework.
- `init()` - can be used to initialize properties of the plugin, for example, changing the default build output directory defined by the property `dest`.
- `async clean` - deletes existing build output, folder `this.task.dest` is deleted by default.
- `async build` - performs the build.

The CDS build system auto-detects all required build tasks by invoking the static method `hasTask` on each registered build plugin.

The compiled CSN model can be accessed using the asynchronous methods `model()` or `basemodel()`.

- The method `model()` returns a CSN model for the scope defined by the `options.model` setting. If [feature toggles](../../guides/extensibility/feature-toggles) are enabled, this model also includes any toggled feature enhancements.
- To get a CSN model without features, use the method `baseModel()` instead. The model can be used as input for further [model processing](../../node.js/cds-compile#cds-compile-to-xyz), like `to.edmx`, `to.hdbtable`, `for.odata`, etc.
- Use [`cds.reflect`](../../node.js/cds-reflect) to access advanced query and filter functionality on the CDS model.

## Add build task type to cds schema <Since version="7.6.0" package="@sap/cds-dk" />

In addition you can also add a new build task type provided by your plugin. This build task type will then be part of code completion suggestions for `package.json` and `.cdsrc.json` files.

[Learn more about schema contributions here.](../../node.js/cds-plugins#configuration-schema){.learn-more}

## Write Build Output

The `cds.build.Plugin` class provides methods for copying or writing contents to the file system:

::: code-group

```js [postgres/lib/build.js]
await this.copy(path.join(this.task.src, 'package.json')).to('package.json');
await this.write({
  dependencies: { '@sap/cds': '^9', '@cap-js/postgres': '^2' },
  scripts: { start: 'cds-deploy' }
}).to('package.json');
```

:::

These `copy` and `write` methods ensure that build output is consistently reported in the console log. Paths are relative to the build task's `dest` folder.

## Handle Errors

Messages can be issued using the `pushMessage` method:

::: code-group

```js [postgres/lib/build.js]
const { Plugin } = cds.build
const { INFO, WARNING } = Plugin

this.pushMessage('Info message', INFO);
this.pushMessage('Warning message', WARNING);
```

:::

These messages are sorted and filtered according to the CLI parameter `log-level`.
They will be logged after the CDS build has been finished. A `BuildError` can be thrown in case of severe errors.
In case of any CDS compilation errors, the entire build process is aborted and a corresponding message is logged.
The `messages` object can be accessed using `this.messages`. When accessing the compiler API it should be passed as an option - otherwise compiler messages won't get reported.
## Run the Plugin

In the application's _package.json_, add a dependency to your plugin package to the list of `devDependencies`.
> Only use `dependencies` if the plugin also provides _runtime integration_, which is the case for the `@cap-js/postgres` plugin.

::: code-group

```jsonc [package.json]
"dependencies": {
  "@cap-js/postgres": "^2"
}
```

:::

The CDS build system by default auto-detects all required build tasks. Alternatively, users can run or configure required build tasks in the very same way as for the built-in tasks.

```sh
cds build
cds build --for postgres
```

```json
"tasks": [
  { "for": "nodejs" },
  { "for": "postgres" }
]
```

> See also the command line help for further details using `cds build --help`.## Test-Run Built Projects Locally {#test-run}

<div class="impl node">

The artifacts deployed to the various cloud platforms are generated in the `gen/srv/` folder. So, to test the application as it runs on the cloud start your application from the `gen/srv/` folder:

```sh
cds build       # to create the build results, followed by either:

cd gen/srv && npx cds-serve
# or:
cd gen/srv && npm start
# or:
npx cds-serve -p gen/srv
```

</div>

<div class="impl java">

Use the regular command to [start a Java application](../../java/getting-started#build-and-run):

```sh
mvn spring-boot:run
```

</div>
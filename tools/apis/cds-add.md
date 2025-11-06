---
label: cds-add
synopsis: >
  Learn how to create a <code>cds add</code> plugin.
status: released
---

<style scoped lang="scss">
  .tabs {
    label:nth-child(n+3) {
      background: #D9EDE6;
      .dark & {background: #183029 };

    }
    label:nth-child(n+3)::before {
      content: "+";
      color: #6FD392;
      margin-right: 4px;
    }
  }
  @mixin counter-style {
    content: counter(my-counter);
    color: var(--vp-c-text-1);
    background-color: var(--vp-code-bg);
    width: 20px;
    height: 20px;
    line-height: 22px;
    border-radius: 50%;
    font-weight: 400;
    text-align: center;
    font-size: 12px;
    vertical-align: middle;
    display: inline-block;
    position: relative;
  }
  h3 code + em { color: #666; font-weight: normal; }

  .list-item {
    @include counter-style;
    position: relative;
    top: -1px;
  }
  ol {
    margin-left: 10px;
    counter-reset: my-counter;
    li {
      counter-increment: my-counter;
      list-style: none;
      &::before {
        @include counter-style;
        left: -30px;
        margin-right: -20px;
        top: 0px;
      }
      p {display: inline;}
    }
  }
</style>

# Plugins for `cds add`{#cds-add}

`cds add` commands add project configuration to your CAP project.

[[toc]]

## Built-in

Many plugins are already part of `@sap/cds-dk`, and all are implemented using the public APIs documented here.
They provide you with a large set of standard features that support CAP's grow-as-you-go approach.

[See the list of built-in `add` plugins](../cds-cli#cds-add)

## Create a Plugin from Scratch

CAP provides APIs to create your own `cds add` plugins. In addition, we provide you with utility functions for common tasks, to easily replicate the behavior of built-in commands.

### Example: `cds add postgres`

In the following, we show you how to implement a `cds add` plugin for PostgreSQL support.

Our `cds add postgres` will:

1. Register with `cds-dk`
2. Add a Dockerfile to start a PostgreSQL instance for development
3. Integrate with `cds add mta` for [Cloud Foundry](../../guides/deployment/to-cf) deployment
4. Integrate with `cds add kyma` for [Kyma](../../guides/deployment/to-kyma) deployment
5. Integrate with `cds help`

Starting with <span class="list-item">1</span>, register the plugin:

::: code-group
```js [cds-plugin.js]
cds.add?.register?.('postgres', require('lib/add')) // ...or inline:
cds.add?.register?.('postgres', class extends cds.add.Plugin {})
:::

In our example, we'll create a file _lib/add.js_:

::: code-group
```js [lib/add.js]
const cds = require('@sap/cds')

module.exports = class extends cds.add.Plugin {

}
```
:::

For step <span class="list-item">2</span> we need to implement the `run` method. Here we add all configuration that doesn't need integration with other plugins. In our example, we use this method to add a Docker configuration to the project to start the PostgreSQL instance locally:

::: code-group
```js [lib/add.js]
const cds = require('@sap/cds-dk') //> load from cds-dk
const { write, path } = cds.utils, { join } = path // [!code ++]

module.exports = class extends cds.add.Plugin {
  async run() { // [!code ++]
    const pg = join(__dirname, 'add/pg.yaml') // [!code ++]
    await copy(pg).to('pg.yaml') //> 'to' is relative to cds.root  [!code ++]
  } // [!code ++]
}
```
```yaml [lib/add/pg.yaml] {.added}
services: # [!code ++]
  db: # [!code ++]
    image: postgres:alpine # [!code ++]
    environment: { POSTGRES_PASSWORD: postgres } # [!code ++]
    ports: [ '5432:5432' ] # [!code ++]
    restart: always # [!code ++]
```
:::

Step <span class="list-item">3</span> requires us to integrate with another `cds add` command. Namely, we want `cds add mta` to include PostgreSQL configuration when generating the _mta.yaml_ deployment descriptor for Cloud Foundry. Vice versa, `cds add postgres` should augment the _mta.yaml_ if already present.

In this case, we can use the `combine` method, which is executed when any `cds add` command is run. This mechanism allows us to plug in accordingly.

We create an _mta.yaml.hbs_ file to use as a template. The _.hbs_ file also allows dynamic replacements using the [Mustache](https://mustache.github.io/mustache.5.html) syntax.

Using the `merge` helper provided by the `cds.add` API we can define semantics to merge this template into the project's `mta.yaml`:

::: code-group
```js [lib/add.js]
const cds = require('@sap/cds-dk') //> load from cds-dk
const { write, path } = cds.utils, { join } = path
const { readProject, merge, registries } = cds.add // [!code ++]
const { srv4 } = registries.mta // [!code ++]

module.exports = class extends cds.add.Plugin {
  async run() {
    const pg = join(__dirname, 'pg.yaml')
    await copy(pg).to('pg.yaml')
  }
  async combine() { // [!code ++]
    const project = readProject() // [!code ++]
    const { hasMta, srvPath } = project // [!code ++]
    if (hasMta) { // [!code ++]
      const srv = srv4(srvPath) // Node.js or Java server module  [!code ++]
      const postgres = { in: 'resources', // [!code ++]
        where: { 'parameters.service': 'postgresql-db' } // [!code ++]
      } // [!code ++]
      const postgresDeployer = { in: 'modules', // [!code ++]
        where: { type: 'nodejs', path: 'gen/pg' } // [!code ++]
      } // [!code ++]
      await merge(__dirname, 'add/mta.yml.hbs').into('mta.yaml', { // [!code ++]
        project, // for Mustache replacements  [!code ++]
        additions: [srv, postgres, postgresDeployer], // [!code ++]
        relationships: [{ // [!code ++]
            insert: [postgres, 'name'], // [!code ++]
            into: [srv, 'requires', 'name'] // [!code ++]
        }, { // [!code ++]
          insert: [postgres, 'name'], // [!code ++]
          into: [postgresDeployer, 'requires', 'name'] // [!code ++]
        }] // [!code ++]
      }) // [!code ++]
    } // [!code ++]
    // if (hasHelm) {// [!code ++]
    //  ... // [!code ++]
    // if (hasMultitenancy) {// [!code ++]
    //  ... // [!code ++]
  } // [!code ++]
}
```
```yaml [lib/add/mta.yaml.hbs]
modules: # [!code ++]
  - name: {{appName}}-srv # [!code ++]
    type: {{language}} # [!code ++]
    path: {{& srvPath}} # [!code ++]
    requires: # [!code ++]
      - name: {{appName}}-postgres # [!code ++]
  - name: {{appName}}-postgres-deployer # [!code ++]
    type: nodejs # [!code ++]
    path: gen/pg # [!code ++]
    parameters: # [!code ++]
      buildpack: nodejs_buildpack # [!code ++]
      no-route: true # [!code ++]
      no-start: true # [!code ++]
      tasks: # [!code ++]
        - name: deploy-to-postgresql # [!code ++]
          command: npm start # [!code ++]
    requires: # [!code ++]
      - name: {{appName}}-postgres # [!code ++]
resources: # [!code ++]
  - name: {{appName}}-postgres # [!code ++]
    type: org.cloudfoundry.managed-service # [!code ++]
    parameters: # [!code ++]
      service: postgresql-db # [!code ++]
      service-plan: development # [!code ++]
```
:::

Step <span class="list-item">4</span> integrates with `cds add kyma`:

::: code-group
```js [lib/add.js]
const cds = require('@sap/cds-dk') //> load from cds-dk
const { copy, path } = cds.utils, { join } = path
const { readProject, merge, registries } = cds.add
const { srv4 } = registries.mta

module.exports = class extends cds.add.Plugin {
  async run() {
    const pg = join(__dirname, 'pg.yaml')
    await copy(pg).to('pg.yaml')
  }
  async combine() {
    const project = readProject()
    const { hasMta, hasHelm, srvPath } = project // [!code ++]
    const { hasMta, srvPath } = project // [!code --]
    if (hasMta) {
      ...
    }
    if (hasHelm) { // [!code ++]
      await merge(__dirname, 'add/values.yaml.hbs')
        .into('chart/values.yaml', { with: project }) // [!code ++]
    } // [!code ++]
  }
}
```
```yaml [lib/files/values.yaml.hbs]
srv: # [!code ++]
  bindings: # [!code ++]
    db: # [!code ++]
      serviceInstanceName: postgres # [!code ++]
postgres-deployer: # [!code ++]
  image: # [!code ++]
    repository: <your-container-registry>/{{appName}}-postgres-deployer # [!code ++]
    tag: latest # [!code ++]
  bindings: # [!code ++]
    postgres: # [!code ++]
      serviceInstanceName: postgres # [!code ++]
postgres: # [!code ++]
  serviceOfferingName: postgres # [!code ++]
  servicePlanName: default # [!code ++]
```
:::

::: tip Common integrations
Typically integrations are for deployment descriptors (`cds add mta` and `cds add kyma`), security descriptors (`cds add xsuaa`), or changes that might impact your plugin configuration (`cds add multitenancy`).
:::

For step <span class="list-item">5</span> we'll add some command-specific options to let users override the output path for the `pg.yaml` file when running `cds add postgres --out <dir>`:

::: code-group
```js [lib/add.js]
const cds = require('@sap/cds-dk') //> load from cds-dk
const { copy, path } = cds.utils, { join } = path

module.exports = class extends cds.add.Plugin {
  options() { // [!code ++]
    return { // [!code ++]
      'out': { // [!code ++]
        type: 'string', // [!code ++]
        short: 'o', // [!code ++]
        help: 'The output directory for the pg.yaml file.', // [!code ++]
      } // [!code ++]
    } // [!code ++]
  } // [!code ++]

  async run() {
    const pg = join(__dirname, 'pg.yaml')
    await copy(pg).to('pg.yaml') //> 'to' is relative to cds.root // [!code --]
    await copy(pg).to(cds.cli.options.out, 'pg.yaml') //> 'to' is relative to cds.root  [!code ++]
  }
  async combine() {
    /* ... */
  }
}
```
:::

#### Call `cds add` for an NPM package <beta />

Similar to `npx -p`, you can use the `--package/-p` option to directly install a package from an *npm* registry before running the command.
This lets you invoke `cds add` for CDS plugins easily with a single command:

```sh
cds add my-facet -p @cap-js-community/example
```

::: details Install directly from your GitHub branch

 For example, if your plugin's code is in `https://github.com/cap-js-community/example` on branch `cds-add` and registers the  command `cds add my-facet`, then doing an integration test of your plugin with `@sap/cds-dk` in a single command:

```sh
cds add my-facet -p @cap-js-community/example@git+https://github.com/cap-js-community/example#cds-add
```

:::


## Plugin API

Find here a complete overview of public `cds add` APIs.

### `register(name, impl)` {.method}

Register a plugin for `cds add` by providing a name and plugin implementation:

::: code-group
```js [cds-plugin.js]
/* ... */

cds.add?.register?.('postgres',
  class extends cds.add.Plugin {
    async run() { /* ... */ }
    async combine() { /* ... */ }
  }
)
```
:::

...or use the standard Node.js `require` mechanism to load  it from elsewhere:
```js
cds.add?.register?.('postgres', require('./lib/add') )
```

<!-- ### `Plugin` {.class}

```js

``` -->
<!--
### `hasInProduction(env)` {.method}

Indicate whether the plugin is used in production. Other plugins might react upon that information in `combine()`.

```js
static hasInProduction(env) {
  return env.requires.db.kind === 'postgres'
}
```

```js
static hasInProduction(env) {
  return
}

::: tip The `env` here is the productive env
To check the effective configuration like this, run this in your project root:
```sh
cds env --for production
```
::: -->

### `run()` {.method}

This method is invoked when `cds add` is run for your plugin. In here, do any modifications that are not depending on other plugins and must be run once only.

```js
async run() { // [!code focus]
  const { copy, path } = cds.utils, { mvn, readProject } = cds.add // [!code focus]
  await copy (path.join(__dirname, 'files/pg.yaml')).to('pg.yaml') // [!code focus]
  const { isJava } = readProject() // [!code focus]
  if (isJava) await mvn.add('postgres') // [!code focus]
}
```

> In contrast to `combine`, `run` is not invoked when other `cds add` commands are run.

### `combine()` {.method}

This method is invoked, when `cds add` is run for other plugins. In here, do any modifications with dependencies on other plugins.

These adjustments typically include enhancing the _mta.yaml_ for Cloud Foundry or _values.yaml_ for Kyma, or adding roles to an _xs-security.json_.

```js
async combine() {
  const { hasMta, hasXsuaa, hasHelm } = readProject()
  if (hasMta)   { /* adjust mta.yaml */ }
  if (hasHelm)  { /* adjust values.yaml */ }
  if (hasXsuaa) { /* adjust xs-security.json */  }
}
```

### `options()` {.method}

The `options` method allows to specify custom options for your plugin:
```js
options() {
  return {
    'out': {
      type: 'string',
      short: 'o',
      help: 'The output directory. By default the application root.',
    }
  }
}
```

We follow the Node.js [`util.parseArgs`](https://nodejs.org/api/util.html#utilparseargsconfig) structure, with an additional `help` field to provide manual text for `cds add help`.

::: details Run `cds add help` to validate...

You should now see output similar to this:

<pre class="log" cont>
<span class="cwd">$</span> <span class="cmd">cds</span> <span class="args">help</span> <span class="option">add</span>
SYNOPSIS
    ···
OPTIONS
    ···
FEATURE OPTIONS
    ···
    <em>cds add postgres</em>

      --out | -o

        The output directory. By default the application root.

</pre>

:::

::: warning See if your command can do without custom options
`cds add` commands should come with carefully chosen defaults and avoid offloading the decision-making to the end-user.
:::

### `requires()` {.method}

The `requires` function allows to specify other plugins that need to be run as a prerequisite:
```js
requires() {
  return ['xsuaa'] //> runs 'cds add xsuaa' before plugin is run
}
```

::: warning Use this feature sparingly
Having to specify hard-wired dependencies could point to a lack of coherence in the plugin.
:::

## Utilities API

### `readProject()` {.method}

This method lets you retrieve a project descriptor for the productive environment.

```js
const { isJava, hasMta, hasPostgres } = cds.add.readProject()
```
Any plugin provided by `cds add` can be availability-checked. The readable properties are prefixed by `has` or `is`, in addition to being converted to camel-case. A few examples:
| facet | properties |
| ----- | --- |
| `java` | `hasJava` or `isJava` |
| `hana` | `hasHana` or `isHana` |
| `html5-repo` | `hasHtml5Repo` or `isHtml5Repo` |
| ... | ... |

### `merge(from).into(file, o?)` {.method}

CAP provides a uniform convenience API to simplify merging operations on the most typical configuration formats — JSON and YAML files.

::: tip For YAML in particular, comments are preserved
`cds.add.merge` can perform AST-level merging operations. This means, even comments in both your provided template and the user YAML are preserved.
:::

A large number of merging operations can be done without specifying additional semantics, but simply specifying `from` and `file`:

```js
const config = { cds: { requires: { db: 'postgres' } } }
cds.add.merge(config).into('package.json')
```

::: details Semantic-less mode merges and de-duplicates flat arrays

Consider this `source.json` and `target.json`:

<div class="cols-2">

<div>

```js
// source.json
{
  "my-plugin": {
    "x": "value",
    "z": ["a", "b"]
  }
}
```

</div>

<div>

```js
// target.json
{
  "my-plugin": {
    "y": "value",
    "z": ["b", "c"]
  }
}
```

</div>

</div>

A `cds.add.merge('source.json').into('target.json')` produces this result:

```js
// target.json
{
  "my-plugin": {
    "x": "value",  // [!code ++]
    "y": "value",
    "z": ["b", "c"]  // [!code --]
    "z": ["a", "b", "c"]  // [!code ++]
  }
}
```

:::

We can also specify options for more complex merging semantics or Mustache replacements:

```js
const { merge, readProject, registries } = cds.add

// Generic variants for maps and flat arrays
await merge(__dirname, 'lib/add/package-plugin.json').into('package.json')
await merge({ some: 'variable' }).into('package.json')

// With Mustache replacements
const project = readProject()
await merge(__dirname, 'lib/add/package.json.hbs').into('package.json', {
  with: project
})

// With Mustache replacements and semantics for nested arrays
const srv = registries.mta.srv4(srvPath)
const postgres = {
  in: 'resources',
  where: { 'parameters.service': 'postgresql-db' }
}
const postgresDeployer = {
  in: 'modules',
  where: { type: 'nodejs', path: 'gen/pg' }
}
await merge(__dirname, 'lib/add/mta.yml.hbs').into('mta.yaml', {
  with: project,
  additions: [srv, postgres, postgresDeployer],
  relationships: [{
    insert: [postgres, 'name'],
    into: [srv, 'requires', 'name']
  }, {
    insert: [postgres, 'name'],
    into: [postgresDeployer, 'requires', 'name']
  }]
})
```

### `.registries` {.property}

`cds.add` provides a default registry of common elements in configuration files, simplifying the merging semantics specification:

```js
const { srv4, approuter } = cds.add.registries.mta
```

...and use it like this:

```js
const project = readProject()
const { hasMta, srvPath } = project

if (hasMta) {
  const srv = registries.mta.srv4(srvPath)
  const postgres = {
    in: 'resources',
    where: { 'parameters.service': 'postgresql-db' }
  }
  await merge(__dirname, 'lib/add/mta.yml.hbs').into('mta.yaml', {
    project,
    additions: [srv, postgres, postgresDeployer],
    relationships: [
      ...
    ]
  })
}
```


### `mvn.add()` {.method}

For better Java support, plugins can easily invoke `mvn com.sap.cds:cds-maven-plugin:add` goals using `mvn.add`:

```js
async run() {
  const { isJava } = readProject()
  const { mvn } = cds.add
  if (isJava) await mvn.add('postgres')
}
```

## Checklist for Production

Key to the success of your `cds add` plugin is seamless integration with other technologies used in the target projects. As CAP supports many technologies out of the box, consider the following when reasoning about the scope of your minimum viable product:

- Single- and Multitenancy
- Node.js and Java runtimes
- Cloud Foundry (via MTA)
- Kyma (via Helm)
- App Router
- Authentication

## Best Practices

Adhere to established best practices in CAP-provided plugins to ensure your plugin meets user expectations.

### Consider `cds add` vs `cds build` {.good}

In contrast to `cds build`, `cds add` is concerned with source files outside of your _gen_ folder. Common examples are deployment descriptors such as _mta.yaml_ for Cloud Foundry or _values.yaml_ for Kyma deployment. Unlike generated files, those are usually checked in to your version control system.

### Don't do too much work in `cds add` {.bad}

If your `cds add` plugin creates or modifies a large number of files, this can be incidental for high component coupling. Check if configuration for your service can be simplified and provide sensible defaults. Consider generating the files in a `cds build` plugin instead.

### Embrace out-of-the-box{.good}

From a consumer point of view, your plugin is integrated by adding it to the _package.json_ `dependencies` and provides sensible default configuration without further modification.

### Embrace grow-as-you-go and separate concerns {.good}

A strength of `cds add` is the gradual increase in project complexity. All-in-the-box templates pose the danger of bringing maintainability and cost overhead by adding stuff you might not need. Decrease dependencies between plugins wherever possible.

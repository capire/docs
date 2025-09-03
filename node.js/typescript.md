---
# layout: node-js
status: released
---

# Using TypeScript

While CAP itself is written in _JavaScript_, it's possible to use _TypeScript_ within your project as outlined here.

[[toc]]


## Enable TypeScript Support

Follow these steps to add TypeScript support:

1. Install typescript packages globally:

    ```sh
    npm i -g typescript ts-node tsx
    ```

2. Add a basic _tsconfig.json_ file to your project:

    ```sh
    cds add typescript
    ```

    You can modify this configuration file to match your project setup. See the [official TypeScript documentation](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) for more details.
    Note that adding the `typescript` facet, [`cds-typer`](../tools/cds-typer) is also automatically added to your project.

## Writing TypeScript Files

Once you have setup everything correctly, you can start using TypeScript files instead of JavaScript files. This setup applies for service handlers, and to a custom _server.ts_ file, or database _init.ts_ seeding files as well.

## Samples

For a full TypeScript application, check out the [SFlight application](https://github.com/SAP-samples/cap-sflight).
It features both [CAP service handlers](https://github.com/SAP-samples/cap-sflight/tree/206faf29801ca25b8601d75a23284da07d2ebf4a/srv) and [client-side code for SAP Fiori Elements](https://github.com/SAP-samples/cap-sflight/tree/206faf29801ca25b8601d75a23284da07d2ebf4a/app/travel_processor/webapp/ext/controller) written in TypeScript.


## Developing TypeScript Projects

### Using `cds watch` <Since version="8.6.0" of="@sap/cds-dk" /> { #cds-watch}

Preferably use `cds watch` in a TypeScript project as if it was a JavaScript project.
It detects TypeScript mode based on a `tsconfig.json` and run [`cds-tsx`](#cds-tsx) under the hood.

```sh
cap/sflight $ cds watch

Detected tsconfig.json. Running with tsx.
...
[cds] serving TravelService { impl: 'srv/travel-service.ts', path: '/processor' }
...
```

The same applies to `cds serve`.


### Using `cds-tsx` <Since version="8.2.0" of="@sap/cds-dk" /> { #cds-tsx}

Alternatively, you can use the `cds-tsx` CLI command instead of `cds` for automatic TypeScript transpilation:

::: code-group
```sh [watch]
cds-tsx watch
```

```sh [serve]
cds-tsx serve
```
:::

Under the hood, the [tsx](https://tsx.is/) engine is used to run the files instead of the default `node` engine.
Install it globally with:
```sh
npm i -g tsx
```

::: warning Not for production
Use `cds-watch` and `cds-tsx` / `tsx` during development only. **For productive usage, always precompile TypeScript code** to JavaScript for best performance and use `cds-serve` as usual.
:::

### Using `cds-ts` { #cds-ts}

Much like `cds-tsx`, you can also use the `cds-ts` CLI command:

::: code-group
```sh [watch]
cds-ts watch
```

```sh [serve]
cds-ts serve
```
:::

It uses the [ts-node](https://github.com/TypeStrong/ts-node) engine under the hood.

::: tip _tsx_ or _ts-node_?
In general, `tsx` is the better choice, as `tsx` is considerably faster than `ts-node` because it doesn't perform type checks.
See a closer [comparison](https://tsx.is/faq#how-does-tsx-compare-to-ts-node) between the two of them.
:::

## Testing with `ts-jest`

Run your Jest tests with preset `ts-jest` without precompiling TypeScript files.

1. Install `ts-jest` locally:

    ```sh
    npm install -D ts-jest
    ```

2. Tell Jest to use the preset `ts-jest`, for example, in your _jest.config.js_:

    ```js
    module.exports = {
      preset: "ts-jest",
      globalSetup: "./test/setup.ts"
    };
    ```

3. Set `CDS_TYPESCRIPT` environment variable:

    This is necessary, because it isn't possible to programmatically detect that the preset `ts-jest` is used and we've to
    know whether we need to look for _.ts_ or _.js_ files.

    File _./test/setup.ts_, content:

    ```js
    module.exports = async () => {
      process.env.CDS_TYPESCRIPT = "true";
    };
    ```

4. Run your tests as usual:

    ```sh
    jest
    ```

## Building TypeScript Projects

A dedicated build task for `cds build` is provided as part of the `cds-typer` package.

[Learn more about integrating it into your build process.](../tools/cds-typer#integrate-into-your-build-process){.learn-more}

## Running Built Projects Locally

The artifacts deployed to the various cloud platforms are generated in the `gen/srv/` folder. So, to test the application as it runs on the cloud start your application from the `gen/srv/` folder:


```sh
cds build     # to create the js files
cd gen/srv && npm start
```

[Learn more on running a project from build results.](../guides/deployment/custom-builds#test-run){.learn-more}

## TypeScript APIs in `@sap/cds` <Since version="8.0.0" of="@sap/cds" />

The package `@cap-js/cds-types` contains all TypeScript declarations for `@sap/cds` APIs. These declarations are used automatically when you write TypeScript files, but also enable IntelliSense and type checking for standard JavaScript development in Visual Studio Code. Just add the `@cap-js/cds-types` package to your project as follows:

```sh
npm add @cap-js/cds-types
```


Use the Typescript declarations like this:

```ts
import { Request } from '@sap/cds'

function myHandler(req: Request) { }
```

Types are available even in JavaScript through [JSDoc comments](https://jsdoc.app/):

```js
/**
 * @param { import('@sap/cds').Request } req
 */
function myHandler(req) { }
```

### Type Imports

Import types through the [`cds` facade class](../node.js/cds-facade) only:

##### **Good:** {.good}

```ts
import { ... } from '@sap/cds' // [!code ++]
```

##### **Bad:** {.bad}

Never code against paths inside `@sap/cds/apis/`:

```ts
import { ... } from '@sap/cds/apis/events' // [!code --]
```

### Community

#### Help us improve the types

We invite you to contribute and help us complete the typings as appropriate.  Find the [sources on GitHub](https://github.com/cap-js/cds-types) and open a pull request or an issue.

Still, as `@sap/cds` is a JavaScript library, typings aren't always up to date. You should expect a delay for typings related to the latest release, even gaps, and errors.



## Generating Model Types Automatically

The [`cds-typer` package](https://www.npmjs.com/package/@cap-js/cds-typer) offers a way to derive TypeScript definitions from a CDS model to give you enhanced code completion and a certain degree of type safety when implementing services.

```js
class CatalogService extends cds.ApplicationService { init() {
    const { Book } = require('#cds-models/sap/capire/bookshop')

    this.before('CREATE', Book, req => {
        req.data.…  // known to be a Book. Code completion suggests:
              // ID (number)
              // title (string)
              // author (Author)
              // createdAt (Date)
              // …
    })
}}
```

You can find extensive documentation in a [dedicated chapter](../tools/cds-typer), together with a [quickstart guide](../tools/cds-typer#cds-typer-vscode) to get everything up and running.

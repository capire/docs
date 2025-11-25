---
label: cds-typer
synopsis: >
  This page explains the package cds-typer in depth.
typedModels:
  bookshop: assets/bookshop
  farm: assets/animal-farm
  incidents: assets/incidents
status: released
---

# CDS Typer {#cds-typer}

The following chapter describes the [`cds-typer` package](https://www.npmjs.com/package/@cap-js/cds-typer) in detail using the [bookshop sample](https://github.com/capire/bookshop) as a running example.

::: tip
If you are planning to use cds-typer in a TypeScript project, you should read the [setup guide for CDS with TypeScript](../node.js/typescript) first. Otherwise you can use cds-typer also in JavaScript projects as described in the following.
:::

## Quickstart using VS Code {#cds-typer-vscode}

1. In your project's root, execute `cds add typer`.
2. Make sure you have the [SAP CDS Language Support extension for VS Code](https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds) installed.
3. See that cds-typer is enabled in your VS Code settings (CDS > Type Generator > Enabled).
4. Install the newly added dev-dependency using `npm i`.
5. Saving any _.cds_ file of your model from VS Code triggers the type generation process.
6. Model types now have to be imported to service implementation files by traditional imports of the generated files:

```js twoslash
// @noErrors
const cds = require('@sap/cds')
const service = new cds.ApplicationService
// ---cut---
//  without cds-typer
const { Books } = cds.entities('bookshop')
service.before('CREATE', Books, ({ data }) => { /* data is of type any */})
//                                 ^?
```
<p/>

```js twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
const service = new cds.ApplicationService
// ---cut---
// ✨ with cds-typer
const { Books } = require('#cds-models/sap/capire/bookshop')
service.before('CREATE', Books, ({ data }) => { /* data is of type Books */})
//                                 ^?
```


::: details How it works:

The extension will automatically trigger the type generator whenever you hit _save_ on a _.cds_ file that is part of your model. That ensures that the generated type information stays in sync with your model. If you stick to the defaults, saving a _.cds_ file will have the type generator emit [its type files](#emitted-type-files) into the directory _@cds-models_ in your project's root.

Opening your VS Code settings and typing "`cds type generator`" into the search bar will reveal several options to configure the type generation process. Output, warnings, and error messages of the process can be found in the output window called "`CDS`".

:::

[Learn more about the `typer` facet.](#typer-facet){.learn-more}
[Learn about other options to use `cds-typer`.](#usage-options){.learn-more}

## Using Emitted Types in Your Service
The types emitted by the type generator are tightly integrated with the CDS API. The following section illustrates where the generated types are recognized by CDS.

### CQL

Most CQL constructs have an overloaded signature to support passing in generated types. Chained calls will offer code completion related to the type you pass in.

```js twoslash
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
// ---cut---
// previous approach (still valid, but prefer using reflected entities over string names)
SELECT('Books')  // etc...

// how you can do it using generated types
const { Book, Books } = require('#cds-models/sap/capire/bookshop')

// SELECT
SELECT(Books)
SELECT.one(Book)
SELECT(Books, b => { b.ID })  // projection
SELECT(Books, b => { b.author(a => a.ID.as('author_id')) })  // nested projection
//                       ^|

// INSERT / UPSERT
INSERT.into(Books)
INSERT.into(Books).columns(['title', 'ID'])  // column names derived from Books' properties

// DELETE
DELETE.from(Books, 42)
```

Note that your entities will expose additional capabilities in the context of CQL, such as the `.as(…)` method to specify an alias.

### CRUD Handlers
The CRUD handlers `before`, `on`, and `after` accept generated types:

```js twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
const { Book, Books } = require('#cds-models/sap/capire/bookshop')
const service = new cds.ApplicationService
// ---cut---
// the payload is known to contain Books inside the respective handlers
service.before('READ', Books, req => {  })
//                            ^?


service.on('READ', Books, req => {  })
//                        ^?


service.after('READ', Books, (books, req) => {  })
//                            ^?
```
<!--
🚧 **NOTE to editors:** this particular section is subject to change, as per our last sync.

Note that you can pass in both singular, as well as plural versions of your entity. Doing so will slightly alter the semantics of the handler. Passing the plural will result in a callback that is called _once_ with the entire result set. Passing the singular will cause the callback to be called once _for each_ element of the result set:

```js
service.on('READ', Books, req => req.data[0].ID)
service.on('READ', Book,  req => req.data.ID)
```
-->
### Actions

In the same manner, actions can be combined with `on`:

```js twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
const service = new cds.ApplicationService
// ---cut---
const { submitOrder } = require('#cds-models/CatalogService')
service.on(submitOrder, ({ data }) => {
  //                        ^?
  // action implementation
})
```
<br/><br/>

::: warning _Lambda Functions vs. Fully Fledged Functions_

Using anything but lambda functions for either CRUD handler or action implementation will make it impossible for the LSP to infer the parameter types.

You can remedy this by specifying the expected type with one of the following options.

Using [JSDoc](https://jsdoc.app/) in JavaScript projects:

```js twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
const service = new cds.ApplicationService
// ---cut---
const { Books } = require('#cds-models/sap/capire/bookshop')
service.on('READ', Books, readBooksHandler)

/** @param { cds.TypedRequest<Books> } req */
function readBooksHandler (req) {
  req.data // req.data is now properly known to be of type Books again
//    ^?
}
```

<br>
Using `import` in TypeScript projects:

```ts twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
import cds from '@sap/cds'
const service = new cds.ApplicationService
// ---cut---
import { Books } from '#cds-models/sap/capire/bookshop'
service.on('READ', Books, readBooksHandler)

function readBooksHandler (req: cds.TypedRequest<Books>) {
  req.data // req.data is now properly known to be of type Books again
//    ^?
}
```

:::


### Enums

CDS enums are supported by `cds-typer` and are represented during runtime as well. So you can assign values to enum-typed properties with more confidence:

<<< assets/incidents/db/schema.cds

```js twoslash
// @paths: {"#cds-models/*": ["%typedModels:incidents:resolved%"]}
const cds = require('@sap/cds')
const service = new cds.ApplicationService
// ---cut---
const { Ticket, Priority } = require('#cds-models/incidents')

service.before('CREATE', Ticket, (req) => {
  req.data.priority = Priority.L  // [!code focus]
//                              ^|


  req.data.status = Ticket.status.UNASSIGNED  // [!code focus]
//                          ^?





})

```

### Handling Optional Properties
Per default, all properties of emitted types are set to be optional. This reflects how entities can be partial in handlers.

CDS file:

```cds
entity Author {
    name: String; // [!code focus]
    …
}

entity Book {
    author: Association to Author; // [!code focus]
    …
}
```

Generated type file:

```ts
class Author {
    name?: string // [!code focus]
    …
}

class Book {
    author?: Association.to<Author>  // [!code focus]
    …
}
```

In consequence, you will get called out by the type system when trying to chain property calls. You can overcome this in a variety of ways:

```ts twoslash
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
import cds from '@sap/cds'
// ---cut---
import { Author, Book } from '#cds-models/sap/capire/bookshop'
const myBook = new Book()

// (i) optional chaining
myBook.author?.name

// (ii) explicitly ruling out the undefined and null types
if (myBook.author) myBook.author.name

// (iii) non-null assertion operator
myBook.author!.name

// (iv) explicitly casting your object to a type where all properties are attached
const myAttachedBook = myBook as Required<Book>
myAttachedBook.author?.name

// (v) explicitly casting your object to a type where the required property is attached
const myPartiallyAttachedBook = myBook as Book & { author: Author }
myPartiallyAttachedBook.author?.name
```

Note that (iii) through (v) are specific to TypeScript, while (i) and (ii) can also be used in JavaScript projects.

## Fine Tuning
### Singular/ Plural
The generated types offer both a singular and plural form for convenience. The derivation of these names uses a heuristic that assumes entities are named with an English noun in plural form, following the [best practice guide](../guides/domain-modeling#naming-conventions).

Naturally, this best practice can't be enforced on every model. Even for names that do follow best practices, the heuristic can fail. If you find that you would like to specify custom identifiers for singular or plural forms, you can do so using the `@singular` or `@plural` annotations.

CDS file:

<<< assets/animal-farm/db/schema.cds{3,6}

Generated classes:

```ts twoslash
// @paths: {"#cds-models/*": ["%typedModels:farm:resolved%"]}
import { Mouse, Mice, Sheep, FlockOfSheep } from '#cds-models/farm'
```

### Strict Property Checks in JavaScript Projects
You can enable strict property checking for your JavaScript project by adding the [`checkJs: true`](https://www.typescriptlang.org/tsconfig#checkJs) setting to your _jsconfig.json_ or _tsconfig.json_.
This will consider referencing properties in generated types that are not explicitly defined as error.

## Usage Options

Besides using the [SAP CDS Language Support extension for VS Code](https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds), you have the option to use `cds-typer` on the command line.

### Command Line Interface (CLI) {#typer-cli}

```sh
npx @cap-js/cds-typer /home/mybookshop/db/schema.cds --outputDirectory /home/mybookshop
```

The CLI offers several parameters which you can list using the `--help` parameter.

::: details You should then see the following output:
<!--@include: ./assets/help/cds-typer.out.md-->
:::

### Configuration

Any CLI parameter described [above](#typer-cli) can also be passed to cds-typer via [`cds.env`](../node.js/cds-env) in the section `cds.typer`. For example, so set a project-wide custom output directory for cds-typer to `myCustomDirectory`, you would set

<Config>cds.typer.output_directory: myCustomDirectory</Config>


### Version Control
The generated types _are meant to be ephemeral_. We therefore recommend that you do not add them to your version control system. Adding the [typer as facet](#typer-facet) will generate an appropriate entry in your project's `.gitignore` file.
You can safely remove and recreate the types at any time.
We especially suggest deleting all generated types when switching between development branches to avoid unexpected behavior from lingering types.

## Integrate Into TypeScript Projects
The types emitted by `cds-typer` can be used in TypeScript projects as well! Depending on your project setup you may have to do some manual configuration for your local development setup.

1. Make sure the directory the types are generated into are part of your project's files. You will either have to add that folder to your `rootDirs` in your _tsconfig.json_ or make sure the types are generated into a directory that is already part of your `rootDir`.
2. Preferably run the project using `cds-ts`.
3. If you have to use `tsc`, you have to touch up on the generated files. Assume your types are in _@cds-models_ below your project's root directory and your code is transpiled to _dist/_, you would use:

```sh
tsc && cp -r @cds-models dist
```

## Integrate Into Your CI
As the generated types are build artifacts, we recommend to exclude them from your software versioning process. Still, as using `cds-typer` changes how you include your model in your service implementation, you need to include the emitted files when running tests in your continuous integration pipeline.
You should therefore trigger `cds-typer` as part of your build process. One easy way to do so is to add a variation of the following command to your build script:

```sh
npx @cap-js/cds-typer "*" --outputDirectory @cds-models
```
Make sure to add the quotes around the asterisk so your shell environment does not expand the pattern.

## Integrate Into Your Build Process
Having `cds-typer` present as dependency provides the `typescript` build task. If your project also depends on the `typescript` package, this build task is automatically included when you run `cds build`.

If you are [customizing your build task](../guides/deployment/custom-builds), you can add it after the `nodejs` build task:

```json {3}
"tasks": [
  { "for": "nodejs" },
  { "for": "typescript" },
  …
]
```

This build task will make some basic assumptions about the layout of your project. For example, it expects all source files to be contained within the root directory. If you find that the standard behavior does not match your project setup, you can customize this build step by providing a `tsconfig.cdsbuild.json` in the root directory of your project. We recommend the following basic setup for such a file:

::: code-group
```json [tsconfig.cdsbuild.json]
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./gen/srv",
  },
  "exclude": ["app", "gen"]
}
```
:::

## About The Facet {#typer-facet}
Type generation can be added to your project as [facet](../tools/cds-cli#cds-add) via `cds add typer`.

::: details Under the hood

Adding this facet effectively does four things:

1. Adds `@cap-js/cds-typer` as a dev-dependency (⚠️ which you still have to install using `npm i`)
2. Creates (or modifies) a _jsconfig.json_ file to support intellisense for the generated types
3. Modifies _package.json_ to enable [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) for the generated types
4. Adds `@cds-models` (the default output folder for generated files) to your project's _.gitignore_
:::

::: warning _TypeScript Projects_

Adding the facet in a TypeScript project will adjust your _tsconfig.json_ instead. Note that you may have to manually add the type generator's configured output directory to the `rootDirs` entry in your
_tsconfig.json_, as we do not want to interfere with your configuration.

:::


## About the Emitted Type Files {#emitted-type-files}

The emitted types are bundled into a directory which contains a nested directory structure that mimics the namespaces of your CDS model. For the sake of brevity, we will assume them to be in a directory called _@cds-models_ in your project's root in the following sections.
For example, the sample model contains a namespace `sap.capire.bookshop`. You will therefore find the following file structure after the type generation has finished:

```zsh
@cds-models/
└── sap/
  └── capire/
    └── bookshop/
      ├── index.js
      └── index.ts
```

Each _index.ts_ file will contain type information for one namespace. For each entity belonging to that namespace, you will find two exports, a singular and a plural form:

```ts
// @cds-models/sap/capire/bookshop/index.ts
export class Author { … }
export class Authors { … }
export class Book { … }
export class Books { … }
```

The singular forms represent the entities from the original model and try to adhere to best practices of object oriented programming for naming classes in singular form.
The plural form exists as a convenience to refer to a collection of multiple entities. You can [fine tune](#fine-tuning) both singular and plural names that are used here.

You could import these types by using absolute paths, but there is a more convenient way for doing so which will be described in the next section.

## Subpath Imports

Adding type support via `cds add typer` includes configuring [subpath imports](https://nodejs.org/api/packages.html#subpath-imports). The facet adds a mapping of `#cds-models/` to the default path your model's types are assumed to be generated to (_\<project root\>/@cds-models/_). If you are generating your types to another path and want to use subpath imports, you will have to adjust this setting in your _package.json_ **and** _jsconfig.json_/ _tsconfig.json_ accordingly.

Consider [the bookshop sample](https://github.com/capire/bookshop) with the following structure with types already generated into _@cds-models_:

```zsh
bookshop/
├── package.json
├── @cds-models/
│   └── ‹described in the previous section›
├── db/
│   ├── schema.cds
│   └── ...
├── srv/
│   ├── cat-service.cds
│   ├── cat-service.js
│   └── ...
└── ...
```

The following two (equally valid) statements would amount to the same import [from within the catalog service](https://github.com/capire/bookshop/tree/main/srv/cat-service.js):

```js
// srv/cat-service.js
const { Books } = require('../@cds-models/sap/capire/bookshop')
const { Books } = require('#cds-models/sap/capire/bookshop')
```

These imports will behave like [`cds.entities('sap.capire.bookshop')`](../node.js/cds-reflect#entities) during runtime, but offer you code completion and type hinting at design time:

```js twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
// ---cut---
class CatalogService extends cds.ApplicationService { init(){
  const { Book } = require('#cds-models/sap/capire/bookshop')

  this.on ('UPDATE', Book, req => {
    // in here, req is known to hold a payload of type Book.
    // Code completion therefore offers all the properties that are defined in the model.
    req.data.t
//            ^|
  })
})
```

Similar to `cds.entities(…)`, you can't use static imports here. Instead, you need to use dynamic imports. However, there's an exception for [static top-level imports](#typer-top-level-imports).

```js twoslash
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
const cds = require('@sap/cds')
// ---cut---
// ❌ works during design time, but will cause runtime errors
const { Book } = require('#cds-models/sap/capire/bookshop')

class CatalogService extends cds.ApplicationService { init(){
  // ✅ works both at design time and at runtime
  const { Book } = require('#cds-models/sap/capire/bookshop')
}}
```

In TypeScript you can use [type-only imports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export) on top level if you just want the types for annotation purposes. The counterpart for the JavaScript example above that works during design time _and_ runtime is a [dynamic import expression](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-4.html#dynamic-import-expressions):

```ts twoslash
// @noErrors
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
import cds from '@sap/cds'
// ---cut---
// ❌ works during design time, but will cause runtime errors
import { Book } from '#cds-models/sap/capire/bookshop'
// ✅ works during design time, but is fully erased during runtime
import type { Book } from '#cds-models/sap/capire/bookshop'

class CatalogService extends cds.ApplicationService { async init(){
  // ✅ works both at design time and at runtime
  const { Book } = await import('#cds-models/sap/capire/bookshop')
}}
```

### Static Top-Level Imports <Since version="0.26.0" of="@cap-js/cds-typer" /> {#typer-top-level-imports}
You can pass a new option, `useEntitiesProxy`, to `cds-typer`. This option allows you to statically import your entities at the top level, as you intuitively would. However, you can still only _use these entities_ in a context where the CDS runtime is fully booted, like in a service definition:

```ts twoslash
// @paths: {"#cds-models/*": ["%typedModels:bookshop:resolved%"]}
import cds from '@sap/cds'
// ---cut---
// ✅ top level import now works both during design time and runtime
import { Book } from '#cds-models/sap/capire/bookshop'

// ❌ works during design time, but will cause runtime errors
Book.actions

export class MyService extends cds.ApplicationService {
  async init () {
    // ✅ cds runtime is fully booted at this point
    Book.actions  // works
    this.on('READ', Book, req => { req.data.author  /* works as well */  })
  }
}
```
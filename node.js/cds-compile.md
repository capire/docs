---
status: released
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/855e00bd559742a3b8276fbed4af1008.html
---


# Parsing and Compiling Models



[[toc]]




## cds. compile (...) {.method}

```tsx
function cds.compile (
  model :
  	'*', 'file:<filename>' | filenames[] |  // source files
    CDL string | { CDL strings }           // sources in memory
  ,
  options : CSN_flavor | {
    flavor?    : CSN_flavor,
    min?       : boolean,
    docs?      : boolean,
    locations? : boolean,
    messages?  : []
  }
)
type CSN_flavor = 'parsed' | 'inferred'
```



This is the central function to compile models from files or in-memory sources to [CSN](../cds/csn).
It supports different variants based on the type of the first argument `model` as outlined below.

Depending on the variants, the method returns a Promise or a sync value.


### Compiling `.cds` files (async)

If the first argument is either a string starting with `"file:"`, or an _array_ of filenames, these files are read and compiled to a single CSN asynchronously:

```js
let csn = await cds.compile (['db','srv','app'])
let csn = await cds.compile ('*')
let csn = await cds.compile ('file:db')
```

> The given filenames are resolved to effective absolute filenames using [`cds.resolve`](#cds-resolve).

> [!TIP] Use <code>cds compile</code> as CLI equivalent
> The [`cds compile` CLI](../tools/cds-cli#cds-compile) is available as entry point to the functions described here.  For example, `cds compile --to hana` maps to `cds.compile.to.hana` etc.



### Single in-memory sources

If a single string, not starting with `file:`  is passed as first argument, it is interpreted as a CDL source string and compiled to CSN synchronously:

```js
let csn = cds.compile (`
  using {cuid} from '@sap/cds/common';
  entity Foo : cuid { foo:String }
  entity Bar as projection on Foo;
  extend Foo with { bar:String }
`)
```

> Note: `using from` clauses are not resolved in this usage.



### Multiple in-memory sources

Finally, you can pass an object with multiple named CDL or CSN sources, which allows to also resolve `using from` clauses:

```js
let csn = cds.compile ({
  'db/schema.cds': `
    using {cuid} from '@sap/cds/common';
    entity Foo : cuid { foo:String }
  `,
  'srv/services.cds': `
    using {Foo} from '../db/schema';
    entity Bar as projection on Foo;
    extend Foo with { bar:String }
  `,
  '@sap/cds/common.csn': `
    {"definitions":{
      "cuid": { "kind": "aspect", "elements": {
        "ID": { "key":true, "type": "cds.UUID" }
      }}
    }}
  `,
})
```





### Additional Options

You can pass additional options like so:

```js
let csn = await cds.compile('*',{ min:true, docs:true })
```



| Option      | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `flavor`    | By default the returned CSN is in `'inferred'` flavor, which is an effective model, with all aspects, includes, extensions and redirects applied and all views and projections inferred. Specify `'parsed'` to only have single models parsed. |
| `min`       | Specify `true` to have [`cds.minify()`](#cds-minify) applied after compiling the models. |
| `docs`      | Specify `true` to have the all `/** ... */` doc comments captured in the CSN. |
| `locations` | Specify `true` to have the all `$location` properties preserved in serialized CSN. |
| `messages`  | Pass an empty array to get all compiler messages collected in there. |




## cds. compile .to ... {.property}

Following are a collection of model processors which take a CSN as input and compile it to a target output. They can be used in two API flavors:

```js
let sql = cds.compile(csn).to.sql ({dialect:'sqlite'}) //> fluent
let sql = cds.compile.to.sql (csn,{dialect:'sqlite'}) //> direct
```


### .json() {.method}

```tsx
function cds.compile.to.json ( options: {
  indents : integer
})
```

Renders the given model to a formatted JSON string.

Option `indents` is the indent as passed to `JSON.stringify`.





### .yaml() {.method}

Renders the given model to a formatted JSON  or YAML string.



### .edm() {.method alt="The following documentation on .edmx also applies to .edm."}

### .edmx() {.method}


Compiles and returns an OData v4 [EDM](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part3-csdl.html), respectively [EDMX](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part3-csdl.html) model object for the passed in model, which is expected to contain at least one service definition.

Accepted `options` are the same [as documented for `cds.compile`](#additional-options), with one addition: If the model contains more than one service definition, use `{service:...}` option parameter to:

* Either choose exactly one, for example, `{service:'Catalog'}`
* Choose to return EDM objects for all, that means, `{service:'all'}`

In case of the latter, a generator is returned that yields `[ edm, {file, suffix} ]` for each service.
For example, use it as follows:

```js
// for one service
let edm = cds.compile.to.edm (csn, {service:'Catalog'})
console.log (edm)
```
```js
// for all services
let all = cds.compile.to.edm (csn, {service:'all'})
for (let [edm,{file,suffix}] of all)
  console.log (file,suffix,edm)
```

### .hdbtable() {.method .deprecated}

Use [`cds.compile.to.hana`](#hana) instead.

### .hana() <Since version="8.0.0" of="@sap/cds" /> {.method}

Generates `hdbtable/hdbview` output.

Returns a generator function that produces `[ content, {file} ]` for each artifact. The variable `content` contains the SQL DDL statements for the `.hdb*` artifacts, and `file` is the filename.

For example, use it as follows:

```js
const all = cds.compile.to.hana(csn);
for (const [content, { file }] of all) {
  console.log(file, content);
}
```

Additional data for `.hdbmigrationtable` files is calculated if a `beforeImage` parameter is passed in. This is only relevant for build tools to determine the actual migration table changes.

### .sql() {.method}


Generates SQL DDL statements for the given model.
The default returns an array with the generated statements.

Accepted `options` are:

- `dialect`: _'plain' \| 'sqlite' \| 'postgres' \| 'h2'_ &rarr; chooses the dialect to generate
- `names`: _'plain' \| 'quoted'_ &rarr; allows to generate DDL using quoted names
- `as`: _'str'_ &rarr; returns a string with concatenated DDL statements.

Examples:
```js
let ddls1 = cds.compile(csn).to.sql()
let ddls2 = cds.compile(csn).to.sql({dialect:'plain'})
let script = cds.compile(csn).to.sql({as:'str'})
```



### .cdl() {.method}

Reconstructs [CDL](../cds/cdl.md) source code for the given csn model.



### .asyncapi() {.method}


Convert the CSN file into an AsyncAPI document:

```js
const doc = cds.compile.to.asyncapi(csn_file)
```







## cds. load (files) {.method #cds-load }

Loads and parses a model from one or more files into a single effective model.
It's essentially a [shortcut to `cds.compile ([...])`](#cds-compile). In addition emits event `cds 'loaded'`.

Declaration:

```tsx
function cds.load (
  files : filename || filenames[]
  options : {...} //> as in cds.compile
)
```

Usage examples:

```js
// load a model from a single source
const csn = await cds.load('my-model')
```

```js
// load a a model from several sources
const csn = await cds.load(['db','srv'])
```

> The given filenames are resolved using [`cds.resolve()`](#cds-resolve).
>
>  Note: It's recommended to omit file suffixes to leverage automatic loading from precompiled _[CSN](../cds/csn)_ files instead of _[CDL](../cds/cdl.md)_ sources.



## cds. parse() { .method }

This is an API facade for a set of functions to parse whole [CDL](../cds/cdl) models, individual [CQL](../cds/cql) queries, or CQL expressions.
The three main methods are offered as classic functions, as well as [tagged template string functions](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Template_literals).



### cds. parse. cdl() {.method #parse-cdl }

Parses a source string in _[CDL](../cds/cdl)_ syntax and returns it as a parsed model according to the [_CSN spec_](../cds/csn). Supports tagged template strings as well as plain string arguments.
It's essentially a [shortcut to `cds.compile (..., {flavor:'parsed'})`](#cds-compile).

Examples:
```js
let csn = cds.parse.cdl (`entity Foo{}`)
let csn = cds.parse.cdl `entity Foo{}`
let csn = cds.parse `entity Foo{}`  //> shortcut to the above
```



### cds. parse. cql() {.method #parse-cql }

Parses a source string in _[CQL](../cds/cql)_ syntax and returns it as a parsed query according to the [_CQN spec_](../cds/cqn). Supports tagged template strings as well as plain string arguments.

Examples:
```js
let cqn = cds.parse.cql (`SELECT * from Foo`)
let cqn = cds.parse.cql `SELECT * from Foo`
```



### cds. parse. expr() {.method #parse-cxl }

Parses a source string in CQL expression syntax and returns it as a parsed expression according to the [_CQN Expressions spec_](../cds/cxn#operators). Supports tagged template strings as well as plain string arguments.

Examples:
```js
[dev] cds repl
> let cxn = cds.parse.expr (`foo.bar > 9`)
> let cxn = cds.parse.expr `foo.bar > 9` //> both return:
{xpr:[ {ref:['foo', 'bar']}, '>', {val:9} ] }
```



### cds. parse. xpr() {.method}

Convenience shortcut to `cds.parse.expr(x).xpr`

Example:
```js
[dev] cds repl
> let xpr = cds.parse.xpr (`foo.bar > 9`) // [!code focus]
[ {ref:['foo', 'bar']}, '>', {val:9} ]
```



### cds. parse. ref() {.method}

Convenience shortcut to `cds.parse.expr(x).ref`

Example:
```js
[dev] cds repl
> let ref = cds.parse.ref (`foo.bar`) // [!code focus]
['foo', 'bar']
```







## cds. minify() {.method}

Minifies a given CSN model by removing all unused<sup>1</sup> types and aspects, as well all entities tagged with `@cds.persistence.skip:'if-unused'`. Use it like that:

```js
let csn = await cds.load('*').then(cds.minify)
```

Using `cds.minify()` is particularly relevant, when reuse models are in the game. For example, this applies to [`@sap/cds/common`](../cds/common). In there, all code list entities like *Countries*, *Currencies* and *Languages* are tagged with `@cds.persistence.skip:'if-unused'`.

For example, run the CLI wrapper `cds minify` in *cap/samples/bookshop*:

```sh
[bookshop] cds minify "*" --dry
```
... which generates this output, informing which definitions got retained and skipped:

<pre class="log">
 Keep:

  • <em>AdminService </em>
  • <em>AdminService.Books </em>
  •• <em>sap.capire.bookshop.Books </em>
  ••• <em>User </em>
  ••• <em>sap.capire.bookshop.Authors </em>
  •••• <em>managed </em>
  ... more

 Skip:

<i>   - Language </i>
<i>   - Country </i>
<i>   - Timezone </i>
<i>   - sap.common </i>
<i>   - sap.common.Countries </i>
<i>   - sap.common.Timezones </i>
<i>   - cuid </i>
<i>   - temporal </i>
<i>   - sap.common.Countries.texts </i>
<i>   - sap.common.Timezones.texts </i>
</pre>


<sup>1</sup> Unused in that context means, not reachable from roots services and — non-skipped — entities in the model.



## cds. resolve() {.method}

Resolves the given source paths by fetching matching model source files, that is _.cds_ or _.csn_ files, including models for required services.
In detail, it works as follows:

1. If `paths` is `'*'`: `paths` = [ ...`cds.env.roots`, ...`cds.requires.<srv>.model` ]
2. If `paths` is a single string: `paths` = [ `paths` ]
3. For `<each>` in `paths`: ...
- if _\<each>.csn|cds_ exists &rarr; use it
- if _\<each>/index.csn|cds_ exists &rarr; use it
- if _\<each>_ is a folder &rarr; use all _.csn|cds_ found in there

[Learn more about `cds.env`](cds-env){.learn-more}

In effect, it resolves and returns an array with the absolute filenames of the root cds model files to be used to invoke the compiler.

If no files are found, `undefined` is returned.

Examples:

```js
[dev] cds repl
> cds.env.folders           // = folders db, srv, app by default
> cds.env.roots             // + schema and services in cwd
> cds.resolve('*',false)    // + models in cds.env.requires
> cds.resolve('*')          // > the resolved existing files
> cds.resolve(['db'])       // > the resolved existing files
> cds.resolve(['db','srv']) // > the resolved existing files
> cds.resolve('none')       // > undefined
```
> Try this in cds repl launched from your project root to see that in action.


## Lifecycle Events

The following [lifecycle events](cds-facade#lifecycle-events) are emitted via the `cds` facade object during the server bootstrapping process.
You can register event handlers using `cds.on()` like so:


```js
const cds = require('@sap/cds')
cds.on('compile.for.runtime', ...)
cds.on('compile.to.dbx', ...)
cds.on('compile.to.edmx', ...)
```

> [!warning]
> As we're using Node's standard [EventEmitter](https://nodejs.org/api/events.html#asynchronous-vs-synchronous),
> event handlers execute **synchronously** in the order they are registered.

> [!tip] Note that several of these events could be emitted for the same model, so ensure your handlers are idempotent.


### compile.for.runtime {.event}

A one-time event, emitted before the model is compiled for usage in Node.js or Java runtime.
This is the right place to, for example, add custom elements required at runtime.


### compile.to.dbx {.event}

A one-time event, emitted before database-specific artifacts, i.e. SQL DDL scripts, are generated from the model.
This is the right place to, for example, add custom elements required in your persistence.


### compile.to.edmx {.event}

A one-time event, emitted immediately before the model is compiled to edmx.
This is the right place to add custom transformations to the model, for example, to add custom Fiori annotations.

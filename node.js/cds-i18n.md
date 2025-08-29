---
status: released
---

# Localization / i18n

[[toc]]

## Introduction

The `cds.i18n` module supports internationalization. It's mostly used by the framework automatically behind the scenes for both, [localization of UIs](#localized-fiori-uis), that is, labels or headers, as well as localized [runtime error messages](#localized-messages). In addition, you can [use it directly](#direct-usage) in your application-specific custom code.

There are two standard i18n bundles available through these static properties:

- [`cds.i18n.labels`](#labels) are used for generating localized UIs.
- [`cds.i18n.messages`](#messages) are used for error messages generated at runtime.



### Localized (Fiori) UIs

The former, that is [`cds.i18n.labels`](#labels), is used automatically when generating OData `$metadata` documents for SAP Fiori elements to look up translations for respective [`{i18n>...}` placeholders](../guides/i18n#externalizing-texts-bundles). For example, localized texts for annotations like that will be looked up from `cds.i18n.labels`:

::: code-group

```cds [app/fiori-annotations.cds]
annotate CatalogService.Books with @title: '{i18n>Book}'
```

:::



### Localized Messages

The latter, that is [`cds.i18n.messages`](#messages), is used automatically for all error or notification messages created through [`req.reject/error/info/warn(...)`](./events#req-reject), which includes all framework-created error messages, like input validation errors, as well as custom errors. For example you could add a new entry to the `_i18n/messages.properties`:

::: code-group
```properties [_i18n/messages.properties]
ORDER_EXCEEDS_STOCK = The order of {quantity} books exceeds available stock {stock}
```
:::

... and refer to that by key in your error messages like that:

::: code-group

 ```js [srv/cat-service.js]
 srv.before ('submitOrder', async req => {
   let { book:id, quantity } = req.data
   let {stock} = await SELECT `stock` .from (Books,id)
   if (stock < quantity)
     req.reject (409, 'ORDER_EXCEEDS_STOCK', { stock, quantity })
 })
 ```

:::



### Direct Usage

In addition, you can use both standard bundles directly in your code, with [`<bundle>.at(key)`](#at-key) the central method to obtain localized texts:

```js
[dev] cds repl
> cds.i18n.labels.at('CreatedAt','de')  //> 'Erstellt am'
> cds.i18n.labels.at('CreatedAt')       //> 'Created At'
> cds.i18n.messages.at('ASSERT_FORMAT', [11,12])
```

You can also introduce and use your own, separate bundles:

```js
const b = cds.i18n.bundle4('yours')
b.at('some key')
```

And provide texts and translations in corresponding files like *_i18n/yours.properties*.






## `cds.i18n` {.property}

This is a global object acting as the facade to the i18n features as outlined in the following.

### `.file` {.property alt="The following documentation on .folders also applies to .file. "}

### `.folders` {.property}

Shortcuts to corresponding i18n [config options](#config). {.indent}



### `.messages` {.property}

The I18n bundle used for runtime messages, for example, for translated validation errors, such as `ASSERT_RANGE` or `ASSERT_FORMAT`. Translations are loaded from properties with base name `messages`, like that in the [*bookstore* sample](https://github.com/capire/bookstore/tree/main/_i18n): {.indent}

```zsh
cap/samples/bookshop/
├─ _i18n/
│  ├─ messages_de.properties
│  ├─ messages_en.properties
│  └─ messages_fr.properties
│  ...
```

[See also the list of pre-defined message texts below](#messages-texts){.learn-more}



### `.labels` {.property}

The I18n bundle used for UI labels, such as `CreatedAt` or `CreatedBy`, referenced from respective [Fiori annotations](../guides/i18n#externalizing-texts-bundles). Translations are loaded from properties with base name `i18n`, like that in the [*bookstore* sample](https://github.com/capire/bookstore/tree/main/_i18n): {.indent}

```zsh
cap/samples/bookshop/
├─ _i18n/
│  ├─ i18n_de.properties
│  ├─ i18n_en.properties
│  ├─ i18n_fr.properties
│  └─ i18n.properties
│  ...
```





### `bundle4()` {.method}

```tsx
function cds.i18n.bundle4 (file : string, options?)
function cds.i18n.bundle4 (model : CSN, options?)
```

Factory method to create instances of  [`I18nBundle`](#i18nbundle). The first argument is either a string used as the bundle's [`file`/`basename`](#–-file-basename), or a CDS model.

```js
const b1 = cds.i18n.bundle4('foo')
```

```js
const mm = await cds.load('my-model.cds')
const b2 = cds.i18n.bundle4(mm)
```

When using the string variant, the created bundle is additionally cached under the given string, and subsequent calls will return the cached instance:

```js
const b1 = cds.i18n.bundle4('foo') //> creates a new I18nBundle for 'foo'
const b2 = cds.i18n.bundle4('foo') //> returns the formerly created one
b1 === cds.i18n.foo                //> true – cached under specified name
b1 === b2                          //> true
```





## `I18nBundle` {.class}

Instances of this class provide access to translated texts in different languages.

::: details Prefer using [`cds.i18n.bundle4()`](#bundle4) to create instances...

Yet, you can refer to this class from the `cds.i18n.Bundle` facade property, for example to create subclasses:

```js
class YourI18nBundle extends cds.i18n.Bundle {...}
```

:::

### `constructor` {.method}

```tsx
function I18nBundle (options: {
  //... as in I18nFiles constructor
})
```

Constructs a new instance with the provided options forwarded to the [`I18nFiles` constructor](#constructor-1) for [`this.files`](#files). {.indent}



### `.defaults` {.property}

The default translations used as a first-level fallback if a locale-specific translation is not found. Can be provided as constructor option, else loads the translations for the default language as configured in [config option](#config) <Config> `cds.i18n.default_language` </Config>. {.indent}



### `.fallback` {.property}

The texts used as second-level fallback if a locale-specific translation is not found and also none in [`.defaults`](#defaults). Can be provided as constructor option, else loads the translations from `<basename>.properties`, that is, without language suffix. {.indent}



### `.files` {.property}

An instance of [`I18nFiles`](#i18nfiles) with the found folders and files to load i18n content from. {.indent}





### `at (key, ...)` {.method alt="The following documentation on for also applies to at. "}

### `for (key, ...)` {.method}

```tsx
function at (
  key     : number | string | object,
  locale? : string,
  args?   : object | array
) => string
```

This is the central method to look up localized texts for given keys and locales, with `at` and `for` being synonyms. Basic usage, for example, with the standard [`cds.i18n.messages`](#messages) bundle, looks like that: {.indent}

```js
[dev] cds repl
> cds.i18n.messages.at(404)       //> 'Not Found'
> cds.i18n.messages.at(404,'de')  //> 'Nicht Gefunden'
```



#### Using Default Locales

If `locale` is omitted, the current default locale is taken from [`cds.context.locale`](events#cds-context). {.indent}

```js
cds.context = {locale:'de'} //> as automatically set by protocol adapters
cds.i18n.messages.at(404)  //> 'Nicht Gefunden'
```



#### Using Message Templates

If `args` are specified, corresponding `{}` placeholders in texts are replaced by the values from `args`. For example, given these entries in the respective *.properties* files: {.indent}

```properties
WRONG_FORMAT = '{0}' is not in format '{1}'
OUT_OF_RANGE = {val} is not in range {min}..{max}
```

You would obtain respective messages like that: {.indent}

```js
const msg = cds.i18n.messages
msg.for('WRONG_FORMAT', ['x',/.../])          //> 'x' is not in format '...'
msg.for('OUT_OF_RANGE', {val:0,min:1,max:11}) //> 0 is not in range 1..11
```



#### Looking up labels for CSN definitions

You can alternatively pass in a CSN definition instead of an i18n key to look up the localized UI label for that an entity or element. For example, try this in `cds repl` from within the [*cap/samples* root folder](https://github.com/sap-samples/cloud-cap-samples): {.indent}

```js
[dev] cds repl
> .run fiori
> let {Books} = CatalogService.entities, {title} = Books.elements
> cds.context = {locale:'fr'}  // as automatically set by protocol adapters
> cds.i18n.labels.at(Books)    //> 'Livre'
> cds.i18n.labels.at(title)    //> 'Titre'
```

> Uses the [`.key4 (csn)`](#key4-csn) method to determine the i18n key for CSN definitions.



### `key4 (csn)` {.method}

This method is used by [`bundle.at()`](#at-key) to determine an i18n key for a CSN definition. In essence, the implementation works like that:

```js
const a = csn['@title']
 || csn['@Common.Label']
 || csn['@UI.HeaderInfo.TypeName']
//> e.g. '{i18n>Books}'
return a.match(/{i18n>(.+)}/)[1]
//> 'Books'
```

>  If no such annotation is found, the CSN definition's `name` is returned.



### `texts4 (locale)` {.method}

```tsx
function texts4 (locale: string) => Texts
```

This method is used by [`bundle.at()`](#at-key) to obtain the set of translated texts for a specific locale.
For example, try this in `cds repl`: {.indent}

```js
[dev] cds repl
> var texts = cds.i18n.labels.texts4('de')
> texts.CreatedBy // or texts[<key>] in general
```



### `translations4 (locales)` {.method}

```tsx
function translations4 (...locales : 'all' | string[])
=> { [locale]: Texts }
```

Obtains one or more sets of translated texts for multiple locales. <br/>For example, try this in `cds repl`: {.indent}

```js
[dev] cds repl
> var { de, en, fr } = cds.i18n.labels.translations4('de','en','fr')
> de.CreatedBy //> Angelegt von
> en.CreatedBy //> Created by
> fr.CreatedBy //> Auteur de la création
```
```js
[dev] cds repl
> var all = cds.i18n.labels.translations4('all')
> JSON.stringify(all)
```





## `I18nFiles` {.class}



Instances of this class are used through [`I18nBundle.files`](#files) to fetch and construct a lookup dictionary of i18n folders and files matching a given configuration in a files-by-folders structure.

By default fetches i18n folders and files from the [neighborhood](#from-models-neighborhood) of a given model's sources, by default using `cds.model`.


For example, try this in `cds repl` run from the project root of *[cap/samples](https://github.com/sap-samples/cloud-cap-samples)*:

```js
[dev] cds repl
> cds.model = await cds.load('bookstore') // [!code focus]
> cds.i18n.labels.files //> displays: // [!code focus]
I18nFiles {
  '/cap/samples/node_modules/@sap/cds/_i18n': [
    'i18n.properties',
    'i18n_de.properties',
    'i18n_en.properties',
    'i18n_fr.properties',
    // ...
  ],
  '/cap/samples/orders/_i18n': [
    'i18n_de.properties',
    'i18n_en.properties',
    'i18n_fr.properties'
  ],
  '/cap/samples/reviews/_i18n': [
    'i18n_de.properties',
    'i18n_en.properties',
    'i18n_fr.properties'
  ],
  '/cap/samples/bookstore/_i18n': [
    'i18n_de.properties',
    'i18n_en.properties',
    'i18n_fr.properties'
  ]
}
```

[Learn more about that in Fetching i18n Folders below](#fetching-i18n-folders) {.learn-more}



### `constructor` {.method}

```tsx
function I18nFiles (options: {
  file?    : string   = cds.env.i18n.file, basename = file,
  model?   : CSN      = cds.model
  roots?   : string[] = [ cds.root, cds.home ],
  leafs?   : string[] = model?.$sources.map(path.dirname) ?? roots,
  folders? : string[] = cds.env.i18n.folders,
})
```

Constructs a new instance which fetches i18n folders and files according to the specified options. For example the following creates a new I18nBundle with the content read from `./_i18n/messages_*.properties` files in the current working directory:

```js
const msg = cds.i18n.bundle4 ({ file:'messages', folders:['/_i18n'] })
```

The options are as follows...

### – `file` / `basename` {.property}

The basename of *.properties* files to load translations from (either of both can be used). <br/>
*Default*:  as [configured](#config) through <Config> cds.i18n.file: i18n </Config> {.indent}

### – `model` {.property}

The model to fetch i18n files and folders from respective `$sources`' [neighborhood](#from-models-neighborhood). <br/>
*Default*: [`cds.model`](cds-facade#cds-model). {.indent}

### – `roots` {.property}

An array of root directories up to which to recurse up the filesystem hierarchy when searching for i18n folders. <br/>
*Default*: `[` [`cds.root`](cds-facade#cds-root), [`cds.home`](cds-facade#cds-home) `]`. {.indent}

### – `leafs` {.property}

The leafs of the filesystem hierarchy to start fetch i18n folders recursively. Determined by `model?.$sources.map(path.dirname)`  if a [`model`](#–-model) (or [`cds.model`](cds-facade#cds-model)) is given.  <br/>
*Default*: [`roots`](#–-roots). {.indent}

### – `folders` {.property}

An array of folder names to fetch i18n files from. Can contain relative names of subfolders or absolute names as explained in [Fetching i18n Folders...](#fetching-i18n-folders). <br/>
*Default*: as [configured](#config) through <Config> cds.i18n.folders: [ "_i18n", "i18n" ] </Config>. {.indent}

### `locales()` {.method}

Returns an array of all locales for which translations have been found. {.indent}

```js
[dev] cds repl
> cds.i18n.labels.files.locales() //> [ '', 'de', 'en', 'fr', ... ]
```



## Fetching i18n Folders...

### From Models' Neighborhood

By default, the config option <Config keyOnly> `cds.i18n.folders` </Config> is defined using relative folder names (that is, ***without* leading slash**) as follows:

::: code-group

```json [package.json]
"cds": {
  "i18n": {
    "folders": ["_i18n","i18n"]
  }
}
```

:::

In effect i18n folders and hence files are fetched from the neighborhood of the current `cds.model`'s `$sources` as follows...

#### 1. Starting from the current model's `$sources`

For example given these model sources from [cap/samples](https://github.com/sap-samples/cloud-cap-samples):

```js
[dev] cds repl
> cds.model = await cds.load('bookstore') // [!code focus]
> $sources = cds.model.$sources // [!code focus]
[
  '/cap/samples/bookstore/index.cds',
  '/cap/samples/bookstore/srv/mashup.cds',
  '/cap/samples/reviews/index.cds',
  '/cap/samples/orders/index.cds',
  '/cap/samples/orders/app/fiori.cds',
  '/cap/samples/bookshop/index.cds',
  '/cap/samples/reviews/srv/reviews-service.cds',
  '/cap/samples/orders/srv/orders-service.cds',
  '/cap/samples/bookshop/srv/user-service.cds',
  '/cap/samples/bookshop/srv/cat-service.cds',
  '/cap/samples/bookshop/srv/admin-service.cds',
  '/cap/samples/reviews/db/schema.cds',
  '/cap/samples/orders/db/schema.cds',
  '/cap/samples/bookshop/db/schema.cds',
  '/cap/samples/common/index.cds',
  '/cap/samples/node_modules/@sap/cds/common.cds'
]
```

#### 2. Get distinct source directories

```js
[dev] cds repl
> $sourcedirs = $sources.map(path.dirname) // [!code focus]
[
  '/cap/samples/bookstore',
  '/cap/samples/bookstore/srv',
  '/cap/samples/reviews',
  '/cap/samples/orders',
  '/cap/samples/orders/app',
  '/cap/samples/bookshop',
  '/cap/samples/reviews/srv',
  '/cap/samples/orders/srv',
  '/cap/samples/bookshop/srv',
  '/cap/samples/reviews/db',
  '/cap/samples/orders/db',
  '/cap/samples/bookshop/db',
  '/cap/samples/common',
  '/cap/samples/node_modules/@sap/cds'
]
```




#### 3. Check for existing & matching `i18n.folders`

To fetch i18n folder, these source directories are processed in reverse order, and each is checked for existence of a sub directory from the `i18n.folders` array containing files matching the bundle's [`.file`](#file) basename. If none matches, we move up the directory tree and repeat these checks, as depicted in this matrix:

> 🎯 <br>
>Marks existing i18n subfolders containing matching `<basename>_*.properties` files.

| $sourcedirs | \_i18n | i18n |
| ----------- | :---: | :--: |
| /cap/samples/node_modules/@sap/cds | 🎯 | |
| /cap/samples/common | | |
| /cap/samples/bookshop/db | | |
| /cap/samples/bookshop/srv | | |
| /cap/samples/bookshop | | |
| /cap/samples/reviews/db | | |
| /cap/samples/reviews/srv | | |
| /cap/samples/reviews | 🎯 | |
| /cap/samples/orders/db | | |
| /cap/samples/orders/srv | | |
| /cap/samples/orders/app | | |
| /cap/samples/orders | 🎯 | |
| /cap/samples/bookstore/srv | | |
| /cap/samples/bookstore | 🎯 |  |

> Note on _reverse order_: means entries in `app`  override same entries in `db`, and so on.



#### 4. Result: i18n folders used by bundle

So, we would end up in having found these four directories from which we would load *.properties* files subsequently:

```js
[dev] cds repl
> Object.keys (cds.i18n.labels.files) // [!code focus]
[
  '/cds/samples/node_modules/@sap/cds/_i18n',
  '/cap/samples/orders/_i18n',
  '/cap/samples/reviews/_i18n',
  '/cap/samples/bookstore/_i18n'
]
```



::: tip Why fetching from a model's neighborhood?

The reason we do this fetching in the neighborhood of the current model's *.cds* source files is to find i18n content from reuse packages with zero configuration: As such reuse packages frequently come with their own CDS models, we simply use the locations of these *.cds* sources as the starting points to search for i18n folders up the file system hierarchy.

:::



### From Static Project Folders

In addition to fetching i18n folders from models' neighborhood as explained above, you can also specify static folders to be used as is, by adding a **leading slash**. For example:

::: code-group

```jsonc [package.json]
"cds": {
  "i18n": {
    "folders": [
      "_i18n",                   // fetched from model's neighborhood
      "/app/browse/webapp/i18n"  // static folder in project's root
    ]
  }
}
```

:::

With that configuration, we'll search for subfolders named `_i18n` in the neighborhood of model sources, plus load .properties files from `<cds.root>/app/browse/webapp/i18n`, that is:

```js
[dev] cds repl
> Object.keys (cds.i18n.labels.files) // [!code focus]
[
  '.../node_modules/@sap/cds/_i18n', // found in model's neighborhood
  '.../_i18n',                       // found in model's neighborhood
  '.../app/browse/webapp/i18n'       // found statically
]
```



You can specify static folders only to not fetch i18n folders in the model's neighborhood at all, both by default configuration as well as for individual bundles. For example:

```js
const b = cds.i18n.bundle4 ({ folders: ['/_i18n', ...] })
```



### From Absolute Folders

Static folders can also be fully qualified absolute filenames. For example, plugins could use that to add their own translations or bundles like so:

::: code-group

```js [cds-plugin.js]
cds.i18n.folders .push (path.join(__dirname,'_i18n'))
```

:::







## Configuration Options {#config}

Find the configuration options to customize `cds.i18n` in the following table. You can use these options in your package.json like so:

::: code-group

```json [package.json]
"cds": {
  "i18n": {
    "default_language": "fr"
  }
}
```
```js [defaults.js by @sap/cds]
cds.env.i18n = {
  default_language: "en",
  folders: [ "_i18n", "i18n" ],
  file: "i18n",
}
```

:::

[Learn more about configuration in the reference docs for `cds.env`](cds-env){.learn-more}



| Config Option               | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `cds.i18n.file`             | The [`.file` basename](#file) used for the [`cds.i18n.labels`](#labels) bundle. <br />*Default:* `"i18n"`. |
| `cds.i18n.folders`          | An array of (relative) folder names that will be appended to the source directories in a cross-product fashion of the default `cds.model`  when fetching for existing i18n [`folders`](#folders). <br />*Default:* `["_i18n","i18n"]` |
| `cds.i18n.default_language` | The locale used for [default translations](#defaults). <br />*Default:* `"en"` |

::: danger

Changing these configurations does not only affect your usage of your i18n bundles, but also all bundles provided by reuse packages you might use, including the ones provided by the CAP framework itself, such as the labels for the `@sap/cds/common` types, or the default messages used by the Node.js runtime.

:::

::: warning

Ensure you correctly understand how the config option `cds.i18n.folders` work before changing it: essentially a **cartesian product** (*source dirs **x** i18n folders*) of all source directories with the entries in this config option is created to check each if such a directory exists and contains files matching the respective bundle's basename.

:::



## Messages Texts

These are the current i18n entries for [`cds.i18n.messages`](#messages) used by the CAP runtime, which you can provide own translations for in your app-specific `_i18n/messages_<locale>.properties` files:

```properties
MULTIPLE_ERRORS = Multiple errors occurred. Please see the details for more information.
ASSERT_FORMAT = Value "{0}" is not in specified format "{1}"
ASSERT_RANGE = Value {0} is not in specified range [{1}, {2}]
ASSERT_ENUM = Value {0} is invalid according to enum declaration {{1}}
ASSERT_NOT_NULL = Value is required
```

In addition the following HTTP status codes can be translated:

```properties
400 = Bad Request
401 = Unauthorized
403 = Forbidden
404 = Not Found
405 = Method Not Allowed
406 = Not Acceptable
407 = Proxy Authentication Required
408 = Request Timeout
409 = Conflict
410 = Gone
411 = Length Required
412 = Precondition Failed
413 = Payload Too Large
414 = URI Too Long
415 = Unsupported Media Type
416 = Range Not Satisfiable
417 = Expectation Failed
422 = Unprocessable Content
424 = Failed Dependency
428 = Precondition Required
429 = Too Many Requests
431 = Request Header Fields Too Large
451 = Unavailable For Legal Reasons
500 = Internal Server Error
501 = The server does not support the functionality required to fulfill the request
502 = Bad Gateway
503 = Service Unavailable
504 = Gateway Timeout
```

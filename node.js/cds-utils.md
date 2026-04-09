---
status: released
---

# Common Utility Functions



[[toc]]



## Module `cds.utils`

Module `cds.utils` provides a set of utility functions, which can be used like that:

```js
const { uuid, read, fs, path, decodeURI } = cds.utils
let id = uuid() // generates a new UUID
let uri = decodeURI("%E0%A4%A")
let json = await fs.promises.readFile( path.join(cds.root,'package.json'), 'utf8')
let pkg = await read ('package.json')
```





### uuid() {.method}

Generates new UUIDs. For example:

```js
const { uuid } = cds.utils
let id = uuid() // generates a new UUID
```



### decodeURI (*uri*) {.method}
### decodeURIComponent (*uri*) {.method}

These are 'safe' variants for [`decodeURI`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURI) and [`decodeURIComponent`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent) which in case of non-decodable input return the input string instead of throwing `URIErrors`. This allows simplifying our code.

For example given we have to handle input like this:
```js
let input = "%E0%A4%A"
```

Instead of this:
```js
let uri
try {
  uri = decodeURI(input)
} catch {
  uri = input
}
```

We can simply do this:
```js
const { decodeURI } = cds.utils
let uri = decodeURI(input)
```



### local (*filename*) {.method}

Returns a relative representation of `filename` to the original `process.cwd()`.

We commonly use that in CAP implementations to print filenames to stdout that you can click to open, for example in VS Code terminal output, regardless from where you started your server.

For example, if we run bookshop from the parent folder, filenames are correctly printed with a `bookshop/` prefix:

```log
[samples] cds run bookshop
[cds] - loaded model from 5 file(s):

  bookshop/srv/user-service.cds
  bookshop/srv/cat-service.cds
  bookshop/srv/admin-service.cds
  bookshop/db/schema.cds
...
```

If we run it from within the *bookshop* folder, no prefixes show up:

```log
[bookshop] cds run
[cds] - loaded model from 5 file(s):

  srv/user-service.cds
  srv/cat-service.cds
  srv/admin-service.cds
  db/schema.cds
...
```



### exists (*file*) {.method}

Checks if a given file or folder exists; `file` is resolved relative to [`cds.root`](cds-facade#cds-root).

```js
const { exists } = cds.utils
if (exists('server.js')) // ...
```

Basically the implementation looks like that:

```js
if (file) return fs.existsSync (path.resolve (cds.root,file))
```



### isdir (*file*) {.method}

Checks if the given filename refers to an existing directory, and returns the fully resolved absolute filename, if so.

```js
const { isdir, fs } = cds.utils
let dir = isdir ('app')
if (dir) {
   let entries = fs.readdirSync(dir)
   ...
}
```

Returns `undefined` or a fully resolved absolute filename of the existing directory, including recursively resolving symbolic links. Relative fileames are resolved in relation to [`cds.root`](cds-facade#cds-root),



### isfile (*file*) {.method}

Checks if the given filename pints to an existing file, and returns the fully resolved absolute filename, if so.

```js
const { isfile, fs } = cds.utils
let file = isdir ('package.json')
let json = fs.readFileSync (file,'utf8')
```

Returns `undefined` or a fully resolved absolute filename of the existing directory, including recursively resolving symbolic links. Relative fileames are resolved in relation to [`cds.root`](cds-facade#cds-root),



### async read (*file*) {.method}

Reads content of the given file.

```js
const { read } = cds.utils
let pkg = await read ('package.json')
```

Relative fileames are resolved in relation to [`cds.root`](cds-facade#cds-root). The implementation uses `utf8` encoding by default. If the file is a `.json` file, the read content is automatically `JSON.parse`d.



### async write (*data*) .to (...*file*) {.method}

Writes content to a given file, optionally with a fluent API.

```js
const { write } = cds.utils
await write ({foo:'bar'}) .to ('some','file.json')
await write ({foo:'bar'}) .to ('some/file.json')
await write ('some/file.json', {foo:'bar'})
```

Relative fileames are resolved in relation to [`cds.root`](cds-facade#cds-root). If provided data is an object, it is automatically `JSON.stringify`ed.



### async copy (*src*) .to (...*dst*) {.method}

Copies `src` to `dst`, optionally with a fluent API. Both can be files or folders.

```js
const { copy } = cds.utils
await copy('db/data').to('dist','db','data')
await copy('db/data').to('dist/db/data')
await copy('db/data','dist/db/data')
```

The implementation essentially uses `fs.promises.cp()`, with relative fileames resolved in relation to [`cds.root`](cds-facade#cds-root).



### async mkdirp (...*path*) {.method}

Creates a directory at the given path.

```js
const { mkdirp } = cds.utils
await mkdirp('dist','db','data')
await mkdirp('dist/db/data')
```

The implementation essentially uses `fs.promises.mkdir(...,{recursive:true})`, with relative fileames resolved in relation to [`cds.root`](cds-facade#cds-root).



### async rmdir (...*path*) {.method}

Deletes the *directory* at the given path, throwing an error if it doesn't exist.

```js
const { rmdir } = cds.utils
await rmdir('dist','db','data')
await rmdir('dist/db/data')
```

The implementation essentially uses `fs.promises.rm(...,{recursive:true})`, with relative fileames resolved in relation to [`cds.root`](cds-facade#cds-root).



### async rimraf (...*path*) {.method}

Deletes the *directory* at the given path, if exists, doing nothing, if not.

```js
const { rimraf } = cds.utils
await rimraf('dist','db','data')
await rimraf('dist/db/data')
```

The implementation essentially uses `fs.promises.mkdir(...,{recursive:true, force:true})`, with relative fileames resolved in relation to [`cds.root`](cds-facade#cds-root).



### async rm (...*path*) {.method}

Deletes the *file* at the given path.

```js
const { rm } = cds.utils
await rm('dist','db','data')
await rm('dist/db/data')
```

The implementation essentially uses `fs.promises.rm()`, with relative fileames resolved in relation to [`cds.root`](cds-facade#cds-root).


### colors {.property}

Provides utilities for coloring terminal output. Colors are automatically enabled if the terminal supports it, but can be overridden via environment variables `NO_COLOR` or `FORCE_COLOR`.

```js
const { BRIGHT, RED, RESET, bg } = cds.utils.colors
console.log(BRIGHT, RED, 'this is bright red text', RESET)
console.log(bg.BLUE, 'this is text with a blue background', RESET)
```

| **Category**         | **Values**                                                                                |
|----------------------|-------------------------------------------------------------------------------------------|
| **Formatting**        | `RESET`, `BOLD`, `BRIGHT`, `DIMMED`, `ITALIC`, `UNDER`, `BLINK`, `FLASH`, `INVERT`        |
| **Text Colors**       | `DEFAULT`, `BLACK`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `PINK`, `CYAN`, `WHITE`, `LIGHT_GRAY`, `LIGHT_RED`, `LIGHT_GREEN`, `LIGHT_YELLOW`, `LIGHT_BLUE`, `LIGHT_PINK`, `LIGHT_CYAN`, `GRAY` |
| **Background Colors** | `DEFAULT`, `BLACK`, `RED`, `GREEN`, `YELLOW`, `BLUE`, `PINK`, `CYAN`, `WHITE`, `LIGHT_GRAY`, `LIGHT_RED`, `LIGHT_GREEN`, `LIGHT_YELLOW`, `LIGHT_BLUE`, `LIGHT_PINK`, `LIGHT_CYAN`, `LIGHT_WHITE` |


## Shortcuts to Node.js Modules

In addition, `cds.utils` provides shortcuts to common Node.js functions and libraries...

| `cds.utils.`... | → shortcut to:                 |
| --------------- | ------------------------------ |
| `inspect`       | `require('node:util').inspect` |
| `path`          | `require('node:path')`         |
| `fs`            | `require('node:fs')`           |

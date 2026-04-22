---
status: released
---

# Testing with `cds.test`



[[toc]]



## Getting Started

### Project Setup

Add `@cap-js/cds-test` as a dev dependency to your project:

```sh
npm add -D @cap-js/cds-test
```

Check whether it works as expected with your [globally installed `@sap/cds-dk`](../get-started/index), which should show some help output as below:

```sh
cds test -?
```
```zsh
Usage:

  cds test [ options ] [ patterns ]

Options:

  -l, --list     List found test files
  -s, --silent   Suppress output via console.log
  -q, --quiet    Suppress all output to stdout
  ...
  ```

### Writing Tests

A typical usage in your tests looks like this:

::: code-group
```js:line-numbers {2-4,9,10} [./test/odata.test.js]
const cds = require ('@sap/cds')
const { GET, expect, defaults } = cds.test ('@capire/bookshop')
defaults.auth = { username: 'alice' }
defaults.path = '/odata/v4/browse'

describe ('browse books', ()=>{

  it ('should allow fetching lists of books', async () => {
    const { data } = await GET `Books? $select=ID,title`
    expect (data.value) .to.deep.equal ([
      { ID: 201, title: 'Wuthering Heights' },
      { ID: 207, title: 'Jane Eyre' },
      { ID: 251, title: 'The Raven' },
      { ID: 252, title: 'Eleonora' },
      { ID: 271, title: 'Catweazle' },
    ])
  })
  //...
})
```
:::

[This is an excerpt from *capire/bookstore/test/odata.test.js*](https://github.com/capire/bookstore/blob/main/test/odata.test.js){.learn-more}


Let's analyze the highlighted the code above line by line:


```js :line-numbers=2
const ... cds.test... // > loads the cds-test module
```
- By accessing [`cds.test`](#class-cds-test-test) the `cds-test` module is loaded, which ensures that...
- Functions like [`describe`](https://vitest.dev/api/describe.html), [`test`](https://vitest.dev/api/test.html), [`it`](https://vitest.dev/api/test.html), etc. are made available in test scope.

```js :line-numbers=2
const { GET, ... } = cds.test ('@capire/bookshop')
```
- Calling the [`cds.test()`](#cds-test) function launches a CAP server for the given CAP project.

```js :line-numbers=3
defaults.auth = { username: 'alice' }
defaults.path = '/odata/v4/browse'
```
- Sets some [`defaults`](#defaults) used for subsequent HTTP requests.

```js :line-numbers=9
const { data } = await GET `Books? $select=ID,title`
```
- Uses the [`GET`](#http-bound) function obtained in line 2 to send an HTTP request.

```js :line-numbers=10
expect (data.value) .to.deep.equal ([ ... ])
```
- Uses the [`expect`](#expect) function obtained in line 2 to assert expected results.



### Testing Services

To test HTTP APIs, we can use the provided [HTTP shorthand](#http-bound) functions like so:

```js
const { GET, POST } = cds.test(...)
const { data } = await GET ('/browse/Books')
await POST (`/browse/submitOrder`, { book: 201, quantity: 5 })
```

Instead of sending HTTP requests, we can also use the CAP runtime's [Service APIs](core-services) to access services programmatically, which is especially useful for testing service implementations, excluding the protocols layer.
Here's an example for that:

```js
it('Allows testing programmatic APIs', async () => {
  const AdminService = await cds.connect.to('AdminService')
  const { Authors } = AdminService.entities
  expect (await SELECT.from(Authors))
  .to.eql(await AdminService.read(Authors))
  .to.eql(await AdminService.run(SELECT.from(Authors)))
})
```



### Running Tests

You can run tests with the test runner of your choice, such as:

- [Node's built-in test runner](https://nodejs.org/api/test.html)
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/)
- [Mocha](https://mochajs.org/)

For example, you can use either of the following commands to run tests:

::: details Try it with [_@capire/samples_](http://github.com/capire/samples)...
```sh
git clone --recursive http://github.com/capire/samples
cd samples
npm install
```
:::

```sh
node --test
```
```sh
npx vitest --silent
```
```sh
npx jest --silent
```
```sh
npx mocha --parallel bookstore/test
```
```sh
cds test
```

The last one, `cds test` is a thin wrapper around [Node's built-in test runner](https://nodejs.org/api/test.html), which makes it easier to fetch tests and provides a cleaner output.

::: tip Writing runner-agnostic tests
To keep your tests portable across different test runners, it's recommended to avoid using runner-specific features and stick to the common APIs provided by `cds.test`, in particular via [`cds.test.expect`](#expect) and [`cds.test.defaults`](#defaults), which are designed to work across different runners. This way, you can easily switch between different test runners as shown above without having to change your test code.
:::


### Dos and Don'ts

::: danger Don't load `cds.env` before `cds.test()`
To ensure [`cds.env`](cds-env), and hence all plugins, are loaded from the test's target folder, the call to [`cds.test()`](#cds-test) is the first thing you do in your tests. Any references to [`cds`](cds-facade) sub modules or any imports of which have to go after.  → See also: [`CDS_TEST_ENV_CHECK`.](#cds-test-env-check)
:::

::: warning Avoid Jest's bells and whistles
Certain Jest helpers might cause conflicts with generic features of `@sap/cds`. For example, `jest.resetModules()` might leave the server in an inconsistent state, and `jest.useFakeTimers()` can interfere with the server shutdown, leading to test timeouts.

To ensure smooth testing, it's best to steer clear of such features, also to keep things simple, and portable.
:::

::: tip  Avoid `process.chdir()` -> prefer `cds.test.in()`
Using `process.chdir()` in tests may leave test containers in failed state, leading to failing subsequent tests. -> Use [`cds.test.in()`](#test-in-folder) instead.
:::



## Class `cds.test.Test`

Instances of this class are returned by [`cds.test()`](#cds-test), for example:

```js
const test = cds.test(_dirname)
```

You can also use this class and create instances yourself, for example, like that:

```js
const { Test } = cds.test
let test = new Test
test.run().in(_dirname)
```



### cds.test() {.method}

This method is the most convenient way to start a test server. It's actually just a convenient shortcut to construct a new instance of class `Test` and call [`test.run()`](#test-run), defined as follows:

```js
const { Test } = cds.test
cds.test = (...args) => (new Test).run(...args)
```

:::warning Run `cds.test` once per test file

`@sap/cds` relies on server state like `cds.model`. Running `cds.test` multiple times within the same test file can lead to a conflicting state and erratic behavior.
:::


### .defaults {.property}

This property provides default values for HTTP requests, which can be set like this:

```js
const { defaults } = cds.test
defaults.auth = { username: 'alice', password: '...' }
defaults.validateStatus = status => status >= 500
```

To stay portable across different HTTP clients, it's recommended to only use these options, which cds.test supports across all clients:

- `baseURL` as defined in [Axios](https://axios-http.com/docs/req_config#baseurl)
- `auth` as defined in [Axios](https://axios-http.com/docs/req_config)
- `headers` as defined in [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Request/headers) and [Axios](https://axios-http.com/docs/req_config#headers)
- `validateStatus` as defined in [Axios](https://axios-http.com/docs/handling_errors),

In addition, you can use all of the config options understood by the underlying HTTP client, that is, for Fetch API, its [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) options, and for Axios, its [request config options](https://axios-http.com/docs/req_config) options.


### .expect { .property}

Returns the [`expect()`](https://www.chaijs.com/guide/styles/#expect) function as known from the [*Chai Assertion Library*](https://www.chaijs.com/), preconfigured with the [chai-subset](https://www.chaijs.com/plugins/chai-subset/) and [chai-as-promised](https://www.chaijs.com/plugins/chai-as-promised/) plugins, which contribute the `containSubset` and `eventually` APIs, respectively.

```js
const { GET, expect } = cds.test()
it ('uses chai.expect', ()=>{
  expect({foo:'bar'}).to.have.property('foo','bar')
  expect({foo:'bar'}.foo).to.equal('bar')
})
```

If you prefer Jest's `expect()` functions, you can just use the respective global:

```js
const { GET } = cds.test() // excluding expect, as we want to use Jest's
it('uses jest.expect', ()=>{
  expect({foo:'bar'}).toHaveProperty('foo','bar')
  expect({foo:'bar'}.foo).toBe('bar')
})
```

> [!warning]
As `chai` is an ESM library since version 5, and Jest is still struggling to support ESM, the `expect` function returned by `cds.test` is a simple emulation of the original Chai `expect` function. It supports the most commonly used Chai APIs, but not all of them.



### GET / PUT / POST ... {#http-bound .method}

These are bound variants of the [`test.get/put/post/...` methods](#http-methods) allowing to write HTTP requests like that:

```js
const { GET, POST } = cds.test()
const { data } = await GET('/browse/Books')
await POST('/browse/submitOrder',
  { book:201, quantity:1 },
  { auth: { username: 'alice' }}
)
```

For single URL arguments, the functions can be used in tagged template string style, which allows omitting the parentheses from function calls:

```js
let { data } = await GET('/browse/Books')
let { data } = await GET `/browse/Books`
```

#### Authentication

You can set the _Authentication_ header for individual requests like this:

```js
await GET('/admin/Books', { auth: { username: 'alice', password: '...' } })
```

Alternatively, you can set a [`default`](#defaults) user for all requests like this:

```js
defaults.auth = { username: 'alice', password: '...' }
```

[Learn how to explicitly configure mock users in your _package.json_ file.](./authentication#mocked){.learn-more}




### test. get/put/post/...() {#http-methods .method}

These are mirrored version of the corresponding [methods from `axios`](https://github.com/axios/axios#instance-methods), which prefix each request with the started server's url and port, which simplifies your test code:

```js
const test = cds.test() //> served at localhost with an arbitrary port
const { data } = await test.get('/browse/Books')
await test.post('/browse/submitOrder',
  { book:201, quantity:1 },
  { auth: { username: 'alice' }}
)
```

> [!tip] Using Fetch API under the hood
> Under the hood, these methods use [Fetch API](https://developer.mozilla.org/docs/Web/API/FetchAPI), natively supported through the global [`fetch()`](https://nodejs.org/api/globals.html#fetch) function in Node.js since version 18.

> [!info] Using Axios instead of Fetch API
> Former versions of `cds.test` used [Axios](https://axios-http.com/) as the HTTP client. With the move to Fetch API, Axios is no longer included as a dependency in `@cap-js/cds-test`. However, you can still use Axios in your tests if you prefer it over Fetch API. Simply add Axios as a dependency to your project, and it will be used automatically by `cds.test` instead of Fetch API.



### test .data .reset() {.method}

This is a bound method, which can be used in a `beforeEach` handler to automatically reset and redeploy the database for each test like so:

```js
const { data } = cds.test()
beforeEach (data.reset)
```

Instead of using the bound variant, you can also call this method the standard way:

```js
beforeEach (async()=>{
  await data.reset() // [!code focus]
  //...
})
```



### test. log() {.method}

Allows to capture console output in the current test scope. The method returns an object to control the captured logs:

```tsx
function cds.test.log() => {
  output : string
  clear()
  release()
}
```

Usage examples:

```js
describe('cds.test.log()', ()=>{
  let log = cds.test.log()

  it ('should capture log output', ()=>{
    expect (log.output.length).to.equal(0)
    console.log('foo',{bar:2})
    expect (log.output.length).to.be.greaterThan(0)
    expect (log.output).to.contain('foo')
  })

  it('should support log.clear()', ()=> {
    log.clear()
    expect (log.output).to.equal('')
  })

  it('should support log.release()', ()=> {
    log.release() // releases captured log
    console.log('foobar') // not captured
    expect (log.output).to.equal('')
  })
})
```

The implementation redirects any console operations in a `beforeAll()` hook, clears `log.output` before each test, and releases the captured console in an `afterAll()` hook.



### test. run (...) {.method}

This is the method behind [`cds.test()`](#cds-test) to start a CDS server, that is the following are equivalent:

```js
cds.test(...)
```

```js
(new cds.test.Test).run(...)
```

It asynchronously launches a CDS server in a `beforeAll()` hook with an arbitrary port, with controlled shutdown when all tests have finished in an `afterAll()` hook.

The arguments are the same as supported by the `cds serve` CLI command.

Specify the command `'serve'` as the first argument to serve specific CDS files or services:

```js
cds.test('serve','srv/cat-service.cds')
cds.test('serve','CatalogService')
```

You can optionally add [`test.in(folder)`](#test-in-folder) in fluent style to run the test in a specific folder:

```js
cds.test('serve','srv/cat-service.cds').in('/cap/samples/bookshop')
```

If the first argument is **not** `'serve'`, it's interpreted as a target folder:

```js
cds.test('/cap/samples/bookshop')
```

This variant is a convenient shortcut for:

```js
cds.test('serve','all','--in-memory?').in('/cap/samples/bookshop')
cds.test().in('/cap/samples/bookshop') //> equivalent
```



### test. in (folder, ...) {.method}

Safely switches [`cds.root`](cds-facade#cds-root) to the specified target folder. Most frequently you'd use it in combination with starting a server with [`cds.test()`](#cds-test) in fluent style like that:

```js
let test = cds.test(...).in(__dirname)
```

It can also be used as static method to only change `cds.root` without starting a server:

```js
cds.test.in(__dirname)
```



### `CDS_TEST_ENV_CHECK`

It's important to ensure [`cds.env`](cds-env), and hence all plugins, are loaded from the test's target folder. To ensure this, any references to or imports of [`cds`](cds-facade) sub modules have to go after all plugins are loaded. For example if you had a test like that:

```js
cds.env.fiori.lean_draft = true   //> cds.env loaded from ./  [!code --]
cds.test(__dirname)               //> target folder: __dirname
```

This would result in the test server started from `__dirname`, but erroneously using `cds.env` loaded from `./`.

As these mistakes end up in hard-to-resolve follow up errors, [`test.in()`](#test-in-folder) can detect this if environment variable `CDS_TEST_ENV_CHECK` is set. The previous code will then result into an error like that:

```sh
CDS_TEST_ENV_CHECK=y jest cds.test.test.js
```
```zsh
Detected cds.env loaded before running cds.test in different folder:
1. cds.env loaded from:  ./
2. cds.test running in:  cds/tests/bookshop

    at Test.in (node_modules/@sap/cds/lib/utils/cds-test.js:65:17)
    at test/cds.test.test.js:9:41
    at Object.describe (test/cds.test.test.js:5:1)

   5 | describe('cds.test', ()=>{
>  6 |   cds.env.fiori.lean_draft = true
     |       ^
   7 |   cds.test(__dirname)

  at env (test/cds.test.test.js:7:7)
  at Object.describe (test/cds.test.test.js:5:1)
```

A similar error would occur if one of the `cds` sub modules would be accessed, which frequently load `cds.env` in their global scope, like `cds.Service` in the following snippet:

```js
class MyService extends cds.Service {}  //> cds.env loaded from ./  [!code --]
cds.test(__dirname)                     //> target folder: __dirname
```

To fix this, always ensure your calls to `cds.test.in(folder)` or `cds.test(folder)` goes first, before anything else loading `cds.env`:

```js
cds.test(__dirname) //> always should go first
// anything else goes after that:
cds.env.fiori.lean_draft = true        // [!code ++]
class MyService extends cds.Service {} // [!code ++]
```

:::warning Do switch on `CDS_TEST_ENV_CHECK` !

We recommended to switch on `CDS_TEST_ENV_CHECK` in all your tests to detect such errors. It's likely to become default in upcoming releases.

:::


## Deprecated APIs




### .axios {.property}

Used to provide access to the [Axios](https://github.com/axios/axios) instance used as HTTP client.
With the move from Axios to Fetch API as the default HTTP client, this property is no longer available. If you want to use Axios in your tests, add it as a dependency to your project, and import it directly in your test file like this:

::: code-group
```js [ESM]
import axios from 'axios'
```
```js [CommonJS]
const axios = require('axios')
```
:::


### .chai {.property}

Used to provide direct access to the Chai library, which cannot be provided any longer with Jest as test runner, as Jest is still struggling to support ESM, and Chai is an ESM library since version 5.

Use [`expect`](#expect) from `cds.test`, if you only need that.
If you need access to more from the original Chai library, add it as a dependency to your project, and import it directly in your test file like this:

::: code-group
```js [ESM]
import chai from 'chai'
```
```js [CommonJS]
const chai = require('chai')
```
:::



### .assert { .property}

Used to provide access to the [`chai.assert()`](https://www.chaijs.com/guide/styles/#assert) function.

  => Use it directly from the Chai library, which you can import [as described above](#chai).



### .should { .property}

Used to provide access to the [`chai.should()`](https://www.chaijs.com/guide/styles/#should) function.

  => Use it directly from the Chai library, which you can import [as described above](#chai).



## Best Practices

### Check Status Codes Last

Avoid checking for single status codes. Instead, simply check the response data:

```js
const { data, status } = await GET `/catalog/Books`
expect(status).to.equal(200)   //> DON'T do that upfront // [!code --]
expect(data).to.equal(...)     //> do this to see what's wrong
expect(status).to.equal(200)   //> Do it at the end, if at all // [!code ++]
```

This makes a difference if there are errors: with the status code check, your test aborts with a useless _Expected: 200, received: xxx_ error, while without it, it fails with a richer error that includes a status text.

Note that by default, Axios throws errors for status codes `< 200` and `>= 300`. This can be [configured](https://github.com/axios/axios#handling-errors), though.



### Minimal Assumptions

When checking expected errors messages, only check for significant keywords. Don't hardwire the exact error text, as this might change over time, breaking your test unnecessarily.

**DON'T**{.bad} hardwire on overly specific error messages:

```js
await expect(POST(`/catalog/Books`,...)).to.be.rejectedWith(
  'Entity "CatalogService.Books" is readonly'
)
```

**DO**{.good} check for the essential information only:

```js
await expect(POST(`/catalog/Books`,...)).to.be.rejectedWith(
  /readonly/i
)
```

### Keep Test Code Environment Agnostic

Environment setup shouldn't be part of the test code itself. That should be handled by setup scripts like CI/CD pipelines.
This way, your tests remain isolated and reproducible across different setups.

::: code-group
```js [my.test.js]
// NO service bindings, env. variables, profiles, etc. here
// Do this outside in setup scripts etc.
describe(() => { cds.test(...) })
```
:::

[Learn how to setup integration tests with `cds bind`.](../tools/cds-bind#integration-tests){.learn-more}


## Using `cds.test` in REPL

You can use `cds.test` in REPL, for example, by running this from your command line in [*cap/samples*](https://github.com/capire/samples):

```sh
[cap/samples] cds repl
Welcome to cds repl v7.1
```

```js
> var test = await cds.test('bookshop')
```

```log
[cds] - model loaded from 6 file(s):

  ./bookshop/db/schema.cds
  ./bookshop/srv/admin-service.cds
  ./bookshop/srv/cat-service.cds
  ./bookshop/app/services.cds
  ./../../cds/common.cds
  ./common/index.cds

[cds] - connect to db > sqlite { database: ':memory:' }
 > filling sap.capire.bookshop.Authors from ./bookshop/db/data/sap.capire.bookshop-Authors.csv
 > filling sap.capire.bookshop.Books from ./bookshop/db/data/sap.capire.bookshop-Books.csv
 > filling sap.capire.bookshop.Books.texts from ./bookshop/db/data/sap.capire.bookshop-Books_texts.csv
 > filling sap.capire.bookshop.Genres from ./bookshop/db/data/sap.capire.bookshop-Genres.csv
 > filling sap.common.Currencies from ./common/data/sap.common-Currencies.csv
 > filling sap.common.Currencies.texts from ./common/data/sap.common-Currencies_texts.csv
/> successfully deployed to sqlite in-memory db

[cds] - serving AdminService { at: '/admin', impl: './bookshop/srv/admin-service.js' }
[cds] - serving CatalogService { at: '/browse', impl: './bookshop/srv/cat-service.js' }

[cds] - server listening on { url: 'http://localhost:64914' }
[cds] - launched at 9/8/2021, 5:36:20 PM, in: 767.042ms
[ terminate with ^C ]
```

```js
> await SELECT `title` .from `Books` .where `exists author[name like '%Poe%']`
[ { title: 'The Raven' }, { title: 'Eleonora' } ]
```

```js
> var { CatalogService } = cds.services
> await CatalogService.read `title, author` .from `ListOfBooks`
[
  { title: 'Wuthering Heights', author: 'Emily Brontë' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { title: 'The Raven', author: 'Edgar Allan Poe' },
  { title: 'Eleonora', author: 'Edgar Allan Poe' },
  { title: 'Catweazle', author: 'Richard Carpenter' }
]
```

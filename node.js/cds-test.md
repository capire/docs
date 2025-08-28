---
status: released
---

# Testing with `cds.test`



[[toc]]



## Overview

The `cds.test` library provides best practice utils for writing tests for CAP Node.js applications.

Install it with:

```sh
npm add -D @cap-js/cds-test
```

::: tip Examples
Find examples in [*capire/samples*](https://github.com/capire/samples/tree/main/tests) and in the [*SFlight sample*](https://github.com/capire/xtravels/tree/main/test).
:::


### Running a CAP Server

Use function [`cds.test()`](#cds-test) to easily launch and test a CAP server. For example, given your CAP application has a `./test` subfolder containing tests as follows:

```zsh
project/    # your project's root folder
├─ srv/
├─ db/
├─ test/    # your .test.js files go in here
└─ package.json
```

Start your app's server in your `.test.js` files like that:

```js{3}
const cds = require('@sap/cds')
describe(()=>{
  const test = cds.test(__dirname+'/..')
})
```
This launches a server from the specified target folder in a `beforeAll()` hook, with controlled shutdown when all tests have finished in an `afterAll()` hook.

::: warning  Don't use `process.chdir()`!
Doing so in Jest tests may leave test containers in failed state, leading to failing subsequent tests. Use [`cds.test.in()`](#test-in-folder) instead.
:::

::: danger Don't load [`cds.env`](cds-env) before [`cds.test()`](#cds-test)!
To ensure `cds.env`, and hence all plugins, are loaded from the test's target folder, the call to `cds.test()` is the first thing you do in your tests. Any references to [`cds`](cds-facade) sub modules or any imports of which have to go after.  → [Learn more in `CDS_TEST_ENV_CHECK`.](#cds-test-env-check)
:::




### Testing Service APIs


As `cds.test()` launches the server in the current process, you can access all services programmatically using the respective [Node.js Service APIs](core-services). Here's an example for that taken from [*cap/samples*](https://github.com/SAP-samples/cloud-cap-samples/blob/a8345122ea5e32f4316fe8faef9448b53bd097d4/test/consuming-services.test.js#L2):


```js
it('Allows testing programmatic APIs', async () => {
  const AdminService = await cds.connect.to('AdminService')
  const { Authors } = AdminService.entities
  expect (await SELECT.from(Authors))
  .to.eql(await AdminService.read(Authors))
  .to.eql(await AdminService.run(SELECT.from(Authors)))
})
```


### Testing HTTP APIs

To test HTTP APIs, we can use bound functions like so:

```js
const { GET, POST } = cds.test(...)
const { data } = await GET ('/browse/Books')
await POST (`/browse/submitOrder`, { book: 201, quantity: 5 })
```

[Learn more in GET/PUT/POST.](#http-bound) {.learn-more}


#### Authenticated Endpoints
`cds.test()` uses the standard authentication strategy in development mode, which is the [mocked authentication](./authentication#mocked). This also includes the usage of [pre-definded mock users](./authentication#mock-users)

You can set the user for an authenticated request like this:

```js
await GET('/admin/Books', { auth: { username: 'alice', password: '' } })
```

This is the same as setting the HTTP `Authorization` header with values for basic authentication:

::: code-group
```http [test.http]
GET http://localhost:4004/admin/Books
Authorization: Basic alice:
```
:::

[Learn how to explicitly configure mock users in your _package.json_ file.](./authentication#mocked){.learn-more}

### Using Jest or Mocha

[*Mocha*](https://mochajs.org) and [*Jest*](https://jestjs.io) are the most used test runners at the moment, with each having its user base.

The `cds.test` library is designed to allow you to write tests that can run with both. Here's an example:

```js
describe('my test suite', ()=>{
  const { GET, expect } = cds.test(...)
  it ('should test', ()=>{   // Jest & Mocha
    const { data } = await GET ('/browse/Books')
    expect(data.value).to.eql([ // chai style expect
      { ID: 201, title: 'Wuthering Heights', author: 'Emily Brontë' },
      { ID: 252, title: 'Eleonora', author: 'Edgar Allen Poe' },
      //...
    ])
  })
})
```
> To ensure that your tests run with both `jest` and `mocha`, start a test server with `cds.test(...)` inside a `describe` block of the test.

You can use Mocha-style `before/after` or Jest-style `beforeAll/afterAll` in your tests, as well as the common `describe, test, it` methods. In addition, to be portable, you should use the [Chai Assertion Library's](#chai)  variant of `expect`.

::: tip [All tests in *cap/samples*](https://github.com/capire/samples/tree/main/tests) are written in that portable way. <br>
Run them with `npm run jest` or with `npm run mocha`.
:::

::: warning Helpers can cause conflicts
_jest_ helpers might cause conflicts with the generic implementation of `@sap/cds`.

To avoid such conflicts, do not use the following helpers:
- _jest.resetModules_ as it leaves the server in an inconsistent state.
- _jest.useFakeTimers_ as it intercepts the server shutdown causing test timeouts.
:::

### Using Test Watchers

You can also start the tests in watch mode, for example:

```sh
jest --watchAll
```

This should give you green tests, when running in *cap/samples* root:

<pre class="log">
<em>PASS</em>  <i>test/</i>cds.ql.test.js
<em>PASS</em>  <i>test/</i>hierarchical-data.test.js
<em>PASS</em>  <i>test/</i>hello-world.test.js
<em>PASS</em>  <i>test/</i>messaging.test.js
<em>PASS</em>  <i>test/</i>consuming-services.test.js
<em>PASS</em>  <i>test/</i>custom-handlers.test.js
<em>PASS</em>  <i>test/</i>odata.test.js
<em>PASS</em>  <i>test/</i>localized-data.test.js

Test Suites: <em>8 passed</em>, 8 total
Tests:       <em>65 passed</em>, 65 total
Snapshots:   0 total
Time:        3.611 s, estimated 4 s
<i>Ran all test suites.</i>
</pre>

Similarly, you can use other test watchers like `mocha -w`.





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



### .chai, ... {.property}

To write tests that run in [*Mocha*](https://mochajs.org) as well as in [*Jest*](https://jestjs.io), you should use the [*Chai Assertion Library*](https://www.chaijs.com/) through the following convenient methods.

:::warning Using `chai` requires these dependencies added to your project:

```sh
npm add -D chai@4 chai-as-promised@7 chai-subset jest
```

:::



#### .expect { .property}

Shortcut to the [`chai.expect()`](https://www.chaijs.com/guide/styles/#expect) function, used like that:

```js
const { expect } = cds.test(), foobar = {foo:'bar'}
it('should support chai.except style', ()=>{
  expect(foobar).to.have.property('foo')
  expect(foobar.foo).to.equal('bar')
})
```

If you prefer Jest's `expect()` functions, you can just use the respective global:

```js
cds.test()
it('should use jest.expect', ()=>{
  expect({foo:'bar'}).toHaveProperty('foo')
})
```



#### .assert { .property}

Shortcut to the [`chai.assert()`](https://www.chaijs.com/guide/styles/#assert) function, used like that:

```js
const { assert } = cds.test(), foobar = {foo:'bar'}
it('should use chai.assert style', ()=>{
  assert.property(foobar,'foo')
  assert.equal(foobar.foo,'bar')
})
```



#### .should { .property}

Shortcut to the [`chai.should()`](https://www.chaijs.com/guide/styles/#should) function, used like that:

```js
const { should } = cds.test(), foobar = {foo:'bar'}
it('should support chai.should style', ()=>{
  foobar.should.have.property('foo')
  foobar.foo.should.equal('bar')
  should.equal(foobar.foo,'bar')
})
```



#### .chai {.property}

This getter provides access to the [*chai*](https://www.chaijs.com) library, preconfigured with the [chai-subset](https://www.chaijs.com/plugins/chai-subset/) and [chai-as-promised](https://www.chaijs.com/plugins/chai-as-promised/) plugins. These plugins contribute the `containSubset` and `eventually` APIs, respectively. The getter is implemented like this:

```js
get chai() {
  return require('chai')
  .use (require('chai-subset'))
  .use (require('chai-as-promised'))
}
```



### .axios {.property}

Provides access to the [Axios](https://github.com/axios/axios) instance used as HTTP client.
It comes preconfigured with the base URL of the running server, that is, `http://localhost:<port>`.  This way, you only need to specify host-relative URLs in tests, like `/catalog/Books`. {.indent}

:::warning Using `axios` requires adding this dependency:

```sh
npm add -D axios
```

:::



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

[Learn more about Axios.](https://axios-http.com) {.learn-more}

For single URL arguments, the functions can be used in tagged template string style, which allows omitting the parentheses from function calls:

```js
let { data } = await GET('/browse/Books')
let { data } = await GET `/browse/Books`
```





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

[Learn more about Axios.](https://axios-http.com) {.learn-more}



### test .data .reset() {.method}

This is a bound method, which can be used in a `beforeEach` handler to automatically reset and redeploy the database for each test like so:

```js
const { test } = cds.test()
beforeEach (test.data.reset)
```

Instead of using the bound variant, you can also call this method the standard way:

```js
beforeEach (async()=>{
  await test.data.reset() // [!code focus]
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

[Learn how to setup integration tests with `cds bind`.](../advanced/hybrid-testing#integration-tests){.learn-more}


## Using `cds.test` in REPL

You can use `cds.test` in REPL, for example, by running this from your command line in [*cap/samples*](https://github.com/sap-samples/cloud-cap-samples):

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
  { title: 'The Raven', author: 'Edgar Allen Poe' },
  { title: 'Eleonora', author: 'Edgar Allen Poe' },
  { title: 'Catweazle', author: 'Richard Carpenter' }
]
```

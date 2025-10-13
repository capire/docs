---
label: Best Practices
synopsis: >
  Learn about Node.js best practices.
status: released
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/29c25e504fdb4752b0383d3c407f52a6.html
---

# Best Practices

From generic Node.js best practices like dependency management and error handling to CAP-specific topics like transaction handling and testing, this [video](https://www.youtube.com/watch?v=WTOOse-Flj8&t=87s) provides some tips and tricks to improve the developer experience and avoid common pitfalls, based on common customer issues. In the following section we explain these best practices.

[[toc]]


## Managing Dependencies {#dependencies}

Projects using CAP need to manage dependencies to the respective tools and libraries in their _package.json_ and/or _pom.xml_ respectively. Follow the guidelines to make sure that you consume the latest fixes and avoid vulnerabilities and version incompatibilities. These guidelines apply to you as a _consumer_ of reuse packages as well as a _provider_ of such reuse packages.


### Always Use the _Latest Minor_ Releases → for Example, `^7.2.0` {#use-caret }

This applies to both, *@sap* packages as well as open source ones. It ensures your projects receive the latest features and important fixes during development. It also leverages [NPM's dedupe](https://docs.npmjs.com/cli/dedupe.html) to make sure bundles have a minimal footprint.

Example:

```json
"dependencies": {
  "@sap/cds": "^9.1.0",
  "@sap/some-reuse-package": "^1.1.0",
  "express": "^4.17.0"
}
```
::: tip We **recommend** using the caret form such as `^1.0.2`
Caret form is the default for `npm install`, as that format clearly captures the minimum patch version.
:::

### Keep Open Ranges When *Publishing* for Reuse {#publish }

<!-- TODO: revisit duplicated attribute { #reuse} -->

Let's explain this by looking at two examples.

#### Bad {.bad}

Assume that you've developed a reuseable package, and consume a reuse package yourself. You decided to violate the previous rules and use exact dependencies in your _package.json_:

```json
"name": "@sap/your-reuse-package",
"version": "1.1.2",
"dependencies": {
  "@sap/cds": "3.0.3",
  "@sap/foundation": "2.0.1",
  "express": "4.16.3"
}
```

The effect would be as follows:

1. Consuming projects get duplicate versions of each package they also use directly, for example, `@sap/cds`, `@sap/foundation`, and `express`.
2. Consuming projects don't receive important fixes for the packages used in your _package.json_ unless you also provide an update.
3. It wouldn't be possible to reuse CDS models from common reuse packages (for example, would already fail for `@sap/cds/common`).

#### Good {.good}

Therefore, the rules when publishing packages for reuse are:

* **Keep** the open ranges in your _package.json_ (just don't touch them).
* **Do** an *npm update* before publishing and test thoroughly.
  (&rarr; ideally automated in your CI/CD pipeline).
* **Do** the vulnerability checks for your software and all open-source software used by you **or by packages you used** (&rarr; [Minimize Usage of Open Source Packages](#oss)).
* **Don't** do `npm shrinkwrap` &rarr; see also [npm's docs](https://docs.npmjs.com/cli/v10/configuring-npm/npm-shrinkwrap-json): *"It's discouraged for library authors to publish this file, ..."*

::: tip
If both your package and a consuming package reuse the same CDS models, loading those models would fail because it's impossible to automatically merge the two versions, nor is it possible to load two independent versions. The reason for this is that it's reusing models that share the **same** single definitions.
:::


### Lock Dependencies Before *Deploying* {#deploy }

When releasing a service or an application to end consumers, use `npm install` or `npm update` to produce a [_package-lock.json_](https://docs.npmjs.com/files/package-lock.json) file that freezes dependencies. This guarantees that it works correctly as it did the last time you tested it and checked it for vulnerabilities.

Overall, the process for your release should include these steps:

```sh
npm config set package-lock true  # enables package-lock.json
npm update   # update it with latest versions
git add package-lock.json # add it to version control

# conduct all test and vulnerability checks
```

The _package-lock.json_ file in your project root freezes all dependencies and is deployed with your application. Subsequent npm installs, such as by cloud deployers or build packs, always get the same versions, which you checked upon your release.

This ensures that the deployed tool/service/app doesn't receive new vulnerabilities, for example, through updated open source packages, without you being able to apply the necessary tests as prescribed by our security standards.

::: tip Run `npm update` frequently to receive latest fixes regularly
Tools like [renovate](https://github.com/renovatebot/renovate) or [GitHub's dependabot](https://docs.github.com/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically) can help you automate this process.

<div id="renovate-sap" />

:::

### Minimize Usage of Open Source Packages {#oss _}

This rule for keeping open ranges for dependencies during development, as well as when publishing for reuse, also applies for open source packages.

Because open source packages are less reliable with respect to vulnerability checks, this means that end-of-chain projects have to ensure respective checks for all the open source packages they use directly, as well as those they 'inherit' transitively from reuse packages.

So, always take into account these rules:

* When releasing to end consumers, you always have to conduct vulnerability checks for all open source packages that you used directly or transitively.

* As a provider of reuse packages you should minimize the usage of open source packages to a reasonable minimum.

**Q:** Why not freeze open source dependencies when releasing for reuse?

**A:** Because that would only affect directly consumed packages, while packages from transitive dependencies would still reach your consumers.

A good approach is to also provide certain features in combination with third-party packages, but to keep them, and hence the dependencies, optional; for example, express.js does this.


### Upgrade to _Latest Majors_ as Soon as Possible {#upgrade _}

As providers of evolving SDKs we provide major feature updates, enhancements, and improvements in 6-12 month release cycles. These updates come with an increment of major release numbers.

At the same time, we can't maintain and support unlimited numbers of branches with fixes. The following rules apply:

* Fixes and nonbreaking enhancements are made available frequently in upstream release branches (current _major_).
* Critical fixes also reach recent majors in a 2-month grace period.

To make sure that you receive ongoing fixes, make sure to also adopt the latest major releases in a timely fashion in your actively maintained projects, that is, following the 6-12 month cycle.


### Additional Advice

**Using  _npm-shrinkwrap.json_** — only if you want to publish CLI tools or other 'sealed' production packages to npm.  Unlike _package-lock.json_, it _does_ get packaged and published to npm registries.  See the [npm documentation](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json#package-lockjson-vs-npm-shrinkwrapjson) for more.


<div id="prerelease-sap" />

## Securing Your Application

To keep builds as small as possible, the Node.js runtime doesn't bring any potentially unnecessary dependencies and, hence, doesn't automatically mount any express middlewares, such as the popular [`helmet`](https://www.npmjs.com/package/helmet).

However, application developers can easily mount custom or best-practice express middlewares using the [bootstrapping mechanism](./cds-server#cds-server).

Example:

```js
// local ./server.js
const cds = require('@sap/cds')
const helmet = require('helmet')

cds.on('bootstrap', app => {
  app.use(helmet())
})

module.exports = cds.server // > delegate to default server.js
```
{ style="padding: 0 33px"}

Consult sources such as [Express' **Production Best Practices: Security** documentation](https://expressjs.com/en/advanced/best-practice-security.html) for state of the art application security.

### Content Security Policy (CSP)

Creating a [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) is a major building block in securing your web application.

[`helmet`](https://www.npmjs.com/package/helmet) provides a default policy out of the box that you can also customize as follows:

```js
cds.on('bootstrap', app => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives()
          // custom settings
        }
      }
    })
  )
})
```
Find required directives in the [OpenUI5 Content Security Policy documentation](https://openui5.hana.ondemand.com/topic/fe1a6dba940e479fb7c3bc753f92b28c) {.learn-more}

### Cross-Site Request Forgery (CSRF) Token

Protect against cross-side request forgery (CSRF) attacks by enabling CSRF token handling through the _App Router_.
::: tip For a SAPUI5 (SAP Fiori/SAP Fiori Elements) developer, CSRF token handling is transparent
There's no need to program or to configure anything in addition. In case the server rejects the request with _403_ and _“X-CSRF-Token: required”_, the UI sends a _HEAD_ request to the service document to fetch a new token.
:::

[Learn more about CSRF tokens and SAPUI5 in the **Cross-Site Scripting** documentation.](https://sapui5.hana.ondemand.com/#/topic/91f0bd316f4d1014b6dd926db0e91070){.learn-more}

Alternatively, you can add a CSRF token handler manually.

::: warning This request must never be cacheable
If a CSRF token is cached, it can potentially be reused in multiple requests, defeating its purpose of securing each individual request. Always set appropriate cache-control headers to `no-store, no-cache, must-revalidate, proxy-revalidate` to prevent caching of the CSRF token.
:::

#### Using App Router

The _App Router_ is configured to require a _CSRF_ token by default for all protected routes and all HTTP requests methods except _HEAD_ and _GET_. Thus, the endpoints are CSRF protected.

[Learn more about CSRF protection with the **App Router**](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/c19f165084d742e096c5d1625cecd2d4.html?q=csrf#loioc19f165084d742e096c5d1625cecd2d4__section_xj4_pcg_2z){.learn-more}

#### Manual Implementation

On the backend side, except for handling the _HEAD_ request mentioned previously, also the handlers for each _CSRF_ protected method and path should be added.
In the following example, the _POST_ method is protected.
::: tip
If you use SAP Fiori Elements, requests to the backend are sent as batch requests using the _POST_ method. In this case, an arbitrary _POST_ request should be protected.
:::

As already mentioned, in case the server rejects because of a bad CSRF token, the response with a status _403_ and a header _“X-CSRF-Token: required”_ should be returned to the UI. For this purpose, the error handling in the following example is extended:

```js
const csrfProtection = csrf({ cookie: true })
const parseForm = express.urlencoded({ extended: false })

cds.on('bootstrap', app => {
  app.use(cookieParser())

  // Must: Provide actual <service endpoint>s of served services.
  // Optional: Adapt for non-Fiori Elements UIs.
  .head('/<service endpoint>', csrfProtection, (req, res) => {
    res.set({
      'X-CSRF-Token': req.csrfToken(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }).send()
  })

  // Must: Provide actual <service endpoint>s of served services.
  // Optional: Adapt for non-Fiori Elements UIs.
  .post('/<service endpoint>/$batch', parseForm, csrfProtection, (req, res, next) => next())

  .use((err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)
    res.status(403).set('X-CSRF-Token', 'required').send()
  })
})
```

[Learn more about backend coding in the **csurf** documentation.](https://www.npmjs.com/package/csurf){.learn-more}
::: tip Use _App Router_ CSRF handling when scaling Node.js VMs horizontally
Handling CSRF at the _App Router_ level ensures consistency across instances. This avoids potential token mismatches that could occur if each VM handled CSRF independently.
:::


### Cross-Origin Resource Sharing (CORS)

With _Cross-Origin Resource Sharing_ (CORS) the server that hosts the UI can tell the browser about servers it trusts to provide resources. In addition, so-called "preflight" requests tell the browser if the cross-origin server will process a request with a specific method and a specific origin.

If not running in production, CAP's [built-in server.js](cds-server#built-in-server-js) allows all origins.

#### Custom CORS Implementation

For production, you can add CORS to your CAP server as follows:

```js
const ORIGINS = { 'https://example.com': 1 }
cds.on('bootstrap', app => app.use ((req, res, next) => {
  if (req.headers.origin in ORIGINS) {
    res.set('access-control-allow-origin', req.headers.origin)
    if (req.method === 'OPTIONS') // preflight request
      return res.set('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE').end()
  }
  next()
})
```

[Learn more about CORS in CAP in **this article by DJ Adams**](https://qmacro.org/blog/posts/2024/03/30/cap-cors-and-custom-headers/){.learn-more}

[Learn more about CORS in general in the **MDN Web Docs**.](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS){.learn-more}



#### Configuring CORS in App Router

The _App Router_ has full support for CORS. Thus, CORS can be configured in the _App Router_ configuration.

[Learn more about CORS handling with the **App Router**](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/ba527058dc4d423a9e0a69ecc67f4593.html?q=allowedOrigin#loioba527058dc4d423a9e0a69ecc67f4593__section_nt3_t4k_sz){.learn-more}

::: warning Avoid configuring CORS in both _App Router_ and CAP server
Configuring CORS in multiple places can lead to confusing debugging scenarios. Centralizing CORS settings in one location decreases complexity, and thus, improves security.
:::


## Availability Checks

To proactively identify problems, projects should set up availability monitoring for all the components involved in their solution.

### Anonymous Ping

An *anonymous ping* service should be implemented with the least overhead possible. Hence, it should not use any authentication or authorization mechanism, but simply respond to whoever is asking.

From `@sap/cds^7.8` onwards, the Node.js runtime provides such an endpoint for availability monitoring out of the box at `/health` that returns `{ status: 'UP' }` (with status code 200).

You can override the default implementation and register a custom express middleware during bootstrapping as follows:

```js
cds.on('bootstrap', app => app.get('/health', (_, res) => {
  res.status(200).send(`I'm fine, thanks.`)
}))
```

More sophisticated health checks, like database availability for example, should use authentication to prevent Denial of Service attacks!


## Error Handling

Good error handling is important to ensure the correctness and performance of the running app and developer productivity.
We will give you a brief overview of common best practices.

### Error Types

We need to distinguish between two types of errors:

- Programming errors: These occur because of some programming mistakes (for example, `cannot read 'foo' of undefined`). They need to be fixed.
- Operational errors: These occur during the operation (for example, when a request is sent to an erroneous remote system). They need to be handled.

### Guidelines

#### Let It Crash

'Let it crash' is a philosophy coming from the [Erlang programming language](https://www.erlang.org/) (Joe Armstrong) which can also be (partially) applied to Node.js.

The most important aspects for programming errors are:

- Fail loudly: Do not hide errors and silently continue. Make sure that unexpected errors are correctly logged. Do not catch errors you can't handle.
- Don't program in a defensive way: Concentrate on your business logic and only handle errors if you know that they occur. Only use `try`/`catch` blocks when necessary.

Never attempt to catch and handle unexpected errors, promise rejections, etc. If it's unexpected, you can't handle it correctly. If you could, it would be expected (and should already be handled). Even though your apps should be stateless, you can never be 100% certain that any shared resource wasn't affected by the unexpected error. Hence, you should never keep an app running after such an event, especially in multi-tenant apps that bear the risk of information disclosure.

This will make your code shorter, clearer, and simpler.

#### Don't Hide Origins of Errors

If an error occurs, it should be possible to know the origin. If you catch errors and re-throw them without the original information, it becomes hard to find and fix the root cause.

Example:

```js
try {
  // something
} catch (e) {
  // augment instead of replace details
  e.message = 'Oh no! ' + e.message
  e.additionalInfo = 'This is just an example.'
  // re-throw same object
  throw e
}
```

In rare cases, throwing a new error is necessary, for example, if the original error has sensitive details that should not be propagated any further. This should be kept to an absolute minimum.

### Further Readings

The following articles might be of interest:
- [Error Handling in Node.js](https://web.archive.org/web/20220417042018/https://www.joyent.com/node-js/production/design/errors)
- [Let It Crash](https://wiki.c2.com/?LetItCrash)
- [Don't Catch Exceptions](https://wiki.c2.com/?DontCatchExceptions)
- [Report And Die](https://wiki.c2.com/?ReportAndDie)



## Timestamps

When using [timestamps](events#timestamp) (for example for managed dates) the Node.js runtime offers a way to easily deal with that without knowing the format of the time string. The `req` object contains a property `timestamp` that holds the current time (specifically `new Date()`, which is comparable to `CURRENT_TIMESTAMP` in SQL). It also stays the same until the request finished, so if it is used in multiple places in the same transaction or request it will always be the same.

Example:

```js
srv.before("UPDATE", "EntityName", (req) => {
  const now = req.timestamp;
  req.data.createdAt = now;
});
```

Internally the [timestamp](events#timestamp) is a JavaScript `Date` object, that is converted to the right format, when sent to the database. So if in any case a date string is needed, the best solution would be to initialize a Date object, that is then translated to the correct UTC String for the database.


## Custom Streaming <Beta /> { #custom-streaming-beta }

[Media Data](../guides/providing-services#serving-media-data) can be served from custom handlers of the type `READ`, `action`, or `function`.
Actions and functions support the same set of `media data` annotations.
```cds
@(Core.MediaType: 'text/csv', Core.ContentDisposition.Filename: 'Books.csv')
type csv:  LargeBinary;
entity Books { ... } actions {
  function csvExport () returns csv;
}
```
Alternatively, the return type can be annotated directly in the declarations of actions or functions.
```cds
function csvExport () returns @Core.MediaType LargeBinary;
```

When returning custom media data, content information can be configured as part of the handlers `result` object.

When calling [`req.reply`](events#req-reply-results) in handlers, you can include options with an instance of [stream.Readable](https://nodejs.org/api/stream.html#class-streamreadable) to specify the [content disposition headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition). In the following example, the options are specified in the `stream.Readable` instance named `myReadable` :

```js
srv.on('READ', 'Books', (req, next) => {
  req.reply(myReadable, {
    mimetype: 'image/jpeg', // > optional
    filename: 'cover.jpg', // > optional
  })
})
```

Alternatively, you can return an instance of [stream.Readable](https://nodejs.org/api/stream.html#class-streamreadable) (named `myReadable` in the example) directly and configure content disposition information by assigning relevant property values (`mimetype`, `filename`) directly to that object:

```js
srv.on('READ', 'Books', (req, next) => {
  if (coverImageIsRequested) {
    return Object.assign(myReadable, {
      mimetype: 'image/jpeg', // > optional
      filename: 'cover.jpg', // > optional
    })
  }
  return next()
})
```

:::details Compatibility option
If needed for compatibility reasons, convey the content information using a result object specifying the information as it would appear if extracted from the appropriate CDS annotations.
In the returned object, `value` is an instance of [stream.Readable](https://nodejs.org/api/stream.html#class-streamreadable) (named `myReadable` in the example) and the properties `$mediaContentType`, `$mediaContentDispositionFilename`, and `$mediaContentDispositionType` are used to set the respective headers.

```js
srv.on('getCoverImageFunction', 'Books', (req) => {
  return {
    value: myReadable,
    $mediaContentType: 'image/jpeg',
    $mediaContentDispositionFilename: 'cover.jpg', // > optional
    $mediaContentDispositionType: 'inline' // > optional
  }
})
```

:::

In addition, the Node.js runtime will respect manually set header values.

```js
srv.on('unboundAction', (req) => {
  cds.context.http?.res.setHeader('content-type', 'image/jpeg')
  cds.context.http?.res.setHeader('content-disposition', 'inline; filename="cover.jpg"')

  return myReadable
})
```

If no content information is provided in one of the ways listed above, the Node.js runtime will fall back to using content information found in annotations or as a last resort, try to assume defaults from context.

:::warning Limited feature-set in REST
For [`protocol: rest`](cds-serve#cds-protocols) stream responses are only available for operations.
:::

## Custom $count { #custom-count }

When you write custom `READ` on-handlers, you should also support requests that contain `$count`, such as `GET /Books/$count` or `GET /Books?$count=true`. For more details, consider the following example:

```js
srv.on('READ', 'Books', function (req) {
  // simple '/$count' request
  if (req.query.SELECT.columns?.length === 1 && req.query.SELECT.columns[0].as === '$count')
    return [{ $count: 100 }]
  // support other '/$count' requests
  ...

  const resultSet = [ ... ]

  // request contains $count=true
  if (req.query.SELECT.count === true) resultSet.$count = 100

  return resultSet
})
```


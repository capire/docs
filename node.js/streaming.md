---
status: released
---

# Streaming



[[toc]]



## Overview

With `@sap/cds` and `ECMAScript 6` it is possible to produce memory efficient applications. The key for achieving this is leveraging the power of streaming.

::: tip Examples
Find examples in [*capire/samples*](https://github.com/capire/bookstore/tree/main/test) and in the [*SFlight sample*](https://github.com/capire/xtravels/tree/main/test).
:::

## Why

As applications are being used they will accumulate data. This will cause applications to eventually hit their limits. To prevent an application from becoming unusable it is required to remove these limits. The primary solution to removing the limitations on how much data an application can process is streaming. By loading in controlled subsets of the whole dataset it is possible to process an unending amount of data. Additionally streaming will have the effect that the peak memory usage of the application is greatly reduced, allowing application orchestrators to run multiple instances with the same memory quota.

## How

### Object Mode

The first thing to decide when streaming is the format, or `objectMode`, which signifies whether a stream is providing `binary` data or `objects`. For the best performance, `binary` streams are required. If you just require the capability to process **all** your data then an `object` stream is appropriate. While using `object` streams it is possible to transform the data using basic JavaScript operations.

### Pipeline

Having determined the format, the flow of the data must then be defined. This is done by creating a `pipeline`.

```js
return pipeline(req, parse, transform, stringify, res)
```

The creation of a `pipeline` can be as simple as the provided example, but usually it will require some effort to work out the individual pieces.

In JavaScript, an `AsyncGenerator` is an object that can `return` multiple times using the keyword `yield`. It is possible to loop over async generators using the `for await` syntax. The generator and the `for` loop are bound to each other, in that if the `for` loop uses `break` the generator will be stopped as well. If the generator throws an `Error` the `for` loop will throw that `Error`. In this example the `for` loop uses `break` to stop the generator:

```js
async function* generator () {
  let i = 0
  while(true) yield {ID: i++}
}

let count = 0
for await(const row of generator()) {
  if(count > 1000) break
  // ...
} 
```

This principle applies at every step of the `pipeline`. For example you can limit how much data can be uploaded to your application:

```js
return pipeline(req, async function* (stream) {
  let bytes = 0
  for await(const chunk of stream) {
    bytes += chunk.byteLength
    if(bytes > LIMIT) break
    yield chunk
  }
}, res)
```

It is often required as part of a `pipeline` to switch data structures. As all external streams will be using `binary` format, a conversion to `objects` will be needed for transforming with JavaScript, and then back to `binary` for onward transmission to an external target.

```js
return pipeline(req, parse, transform, stringify, res)
```

These basic principles are compatible with the `cds.ql` APIs.

```js
// Object mode async generator for SELECT queries
for await(const row of SELECT.from(entity)) { }

// Binary data stream for SELECT queries
await SELECT.pipeline(res)

// Object mode async generator for INSERT queries
await INSERT(generator()).into(entity)

// Binary data stream for INSERT queries
await INSERT(req).into(entity)

// Simple cds.ql pipeline
await SELECT.pipeline(async function* (stream) {
  for await(const row of stream) {
    // transform logic
    yield row
  }
}, INSERT.into(entity))
```

### Performance

While the `pipeline` APIs are easy to use when using `object` streams, there is a performance cost involved with running JavaScript. If you want to use streaming to make your application faster, it is important to make use of the CAP features you already know.

For example, it is often the case that an application's public API differs from its internal data structures. One way to address this would be with a `pipeline` that uses JavaScript to transform the incoming data structure to fit the model:

```js
await pipeline(req, parse, async function* (stream) {
  for await(const row of stream) {
    row.descr = row.description
    // ...
  }
}, INSERT.into(table))
```

As an alternative to this, you could simply define the transformation in your CDS model, as the `INSERT` and `UPSERT` queries are capable of doing the transformation directly in the database:

```cds
entity BooksRenamed projection on Books {
  *,
  descr as description,
  // ...
}
```

This will allow the application layer to use `binary` streams for better performance, and have the transformation taken care of at the database level:

```js
await INSERT(req).into(BooksRenamed)
```

Note that there is not really any "renaming" going on here, the data is just being put into the correct table columns:

```sql
INSERT INTO Books (descr, ...) SELECT value.description, ... FROM json(?)
```

### Errors

Errors can occur at all stages of streaming, as anywhere else. Distinguish between setup errors and streaming errors. If an error occurs while setting up the `pipeline`, this can be communicated clearly to the client with an appropriate status code. If an error occurs subsequently, while the data is being streamed, then while there is no formal facility for signaling an error, the connection can be closed, and the client must use normal termination handling techniques to recover.

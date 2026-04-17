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

As applications are being used they will accumulate data. Which will cause applications to eventually hit their limits. To prevent an application from becoming unusable it is required to remove these limits. The primary solution to removing the limitations on how much data an application can process is streaming. By loading in controlled subsets of the whole dataset it is possible to process an unending amount of data. Additionally streaming will have the effect that the peak memory usage of the application is greatly reduced. Allowing application orgestrators to run multiple instances with the same memory quota.

## How

### Object Mode

First thing to decide when streaming is `objectMode` this determines whether a stream is providing `binary` data or `objects`. For the best performance `binary` streams are required. If you just require the capability to process **all** your data your go to will be `object` streams. While using `object` streams it is possible to transform the data using basic javascript operations.

### Pipeline

Once you know the format you are going to stream your data it is required to identify the flow of the data. The flow of data through the application will be defined by creating a `pipeline`.

```js
return pipeline(req, parse, transform, stringify, res)
```

The creation of a `pipeline` can be as simple as the provided example, but usually it will require some effort to workout the individual pieces.

An important concept will be `async generators` that are functions that can `return` multiple times by using the keyword `yield`. It is possible to loop over `async generators` using the `for await` syntax. The `generator` and the `for` loop are bound to each other if the `for` loop uses `break` the `generator` will be stopped as well. If the `generator` throws an `Error` the `for` loop will throw that `Error`. As example the `generator` doesn't end instead the `for` loop uses `break` to stop the generator.

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

This principle applies at every step of the `pipeline`. For example you can limit how much data is allowed to be uploaded to your application.

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

It is often required as part of a `pipeline` to switch data structures. As all external streams will be using `binary` format it will be required to convert it into `objects` for transformating with `javascript` and then convert it back to a `binary` format to send it to an external target.

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

While the `pipeline` APIs are easy to use when using `object` streams. It comes with the cost of running `javascript` code. If you want to use streaming to make your application faster. It is important to leverage the CAP features you already know.

A common issue that applications will run into is that their public APIs and internal data structures slightly differ. One could go an make a `pipeline` that transforms the incoming data structure to fit that of their model.

```js
await pipeline(req, parse, async function* (stream) {
  for await(const row of stream) {
    row.descr = row.description
    // ...
  }
}, INSERT.into(table))
```

Or you could simply define the transformation in your `cds` model. As the `INSERT` and `UPSERT` queries are capable of doing the transformation in the database.

```cds
entity BooksRenamed projection on Books {
  *,
  descr as description,
  // ...
}
```

Which will allow the application layer to use `binary` streams and have the database do the renaming.

```js
await INSERT(req).into(BooksRenamed)
```

It is not really true that the databse is "renaming" the property it actually just putting it into the correct table column.

```sql
INSERT INTO Books (descr, ...) SELECT value.description, ... FROM json(?)
```

### Errors

A lot of questions arise around how to do error handling with streaming. If you send your client a `200` message and something goes wrong while transporting the `body` to the client. It might not create very clear error messages, but it is allowed to close the connection to the client. All clients are able to handle connections being terminated. Depending on the client it might automatically recover or it might show an error message. Just make sure that any errors that occur while setting up the `pipeline` are clearly communicated to the client. While the errors that occur during the streaming process are logged by your application for future analysis. All network based solutions have the possibility that the connection is terminated un expectedly.

---
status: released
---

# Serving Media Data

CAP provides out-of-the-box support for serving media and other binary data. Media data can be stored either directly in the database or in an external repository, and can be streamed to and from clients. CAP uses OData V4's support for media resources to handle media data.{.abstract}

[[toc]]



## Annotating Media Elements

You can use the following annotations in the service model to indicate that an element in an entity contains media data.

`@Core.MediaType`
: Indicates that the element contains media data (directly or using a redirect). The value of this annotation is either a string with the contained MIME type (as shown in the first example), or is a path to the element that contains the MIME type (as shown in the second example).

`@Core.IsMediaType`
: Indicates that the element contains a MIME type. The `@Core.MediaType` annotation of another element can reference this element.

`@Core.IsURL @Core.MediaType`
: Indicates that the element contains a URL pointing to the media data (redirect scenario).

`@Core.ContentDisposition.Filename`
: Indicates that the element is expected to be displayed as an attachment, that is downloaded and saved locally. The value of this annotation is a path to the element that contains the Filename (as shown in the fourth example ).

`@Core.ContentDisposition.Type`
: Can be used to instruct the browser to display the element inline, even if `@Core.ContentDisposition.Filename` is specified, by setting to `inline` (see the fifth example). If omitted, the behavior is `@Core.ContentDisposition.Type: 'attachment'`.

[Learn more how to enable stream support in SAP Fiori elements.](https://ui5.sap.com/#/topic/b236d32d48b74304887b3dd5163548c1){.learn-more}

The following examples show these annotations in action:

1. Media data is stored in a database with a fixed media type `image/png`:

```cds
entity Books { //...
  image : LargeBinary @Core.MediaType: 'image/png';
}
```

2. Media data is stored in a database with a _variable_ media type:

```cds
entity Books { //...
  image : LargeBinary @Core.MediaType: imageType;
  imageType : String  @Core.IsMediaType;
}
```

3. Media data is stored in an external repository:

```cds
entity Books { //...
  imageUrl  : String @Core.IsURL @Core.MediaType: imageType;
  imageType : String @Core.IsMediaType;
}
```

4. Content disposition data is stored in a database with a _variable_ disposition:
```cds
entity Authors { //...
  image : LargeBinary @Core.MediaType: imageType @Core.ContentDisposition.Filename: fileName;
  fileName : String;
}
```

5. The image shall have the suggested file name but be displayed inline nevertheless:

```cds
entity Authors { //...
  image : LargeBinary @Core.MediaType: imageType @Core.ContentDisposition.Filename: fileName @Core.ContentDisposition.Type: 'inline';
  fileName : String;
}
```

[Learn more about the syntax of annotations.](../../cds/cdl#annotations){.learn-more}

::: warning
In case you rename the properties holding the media type or content disposition information in a projection, you need to update the annotation's value as well.
:::

## Reading Media Resources

Read media data using `GET` requests of the form `/Entity(<ID>)/mediaProperty`:

```cds
GET ../Books(201)/image
> Content-Type: application/octet-stream
```

> The response's `Content-Type` header is typically `application/octet-stream`.

> Although allowed by [RFC 2231](https://datatracker.ietf.org/doc/html/rfc2231), Node.js does not support line breaks in HTTP headers. Hence, make sure you remove any line breaks from your `@Core.IsMediaType` content.

Read media data with `@Core.ContentDisposition.Filename` in the model:

```cds
GET ../Authors(201)/image
> Content-Disposition: 'attachment; filename="foo.jpg"'
```

> The media data is streamed automatically.

[Learn more about returning a custom streaming object (Node.js - beta).](../../node.js/best-practices#custom-streaming-beta){.learn-more}

## Creating a Media Resource

As a first step, create an entity without media data using a POST request to the entity. After creating the entity, you can insert a media property using the PUT method. The MIME type is passed in the `Content-Type` header. Here are some sample requests:

```cds
POST ../Books
Content-Type: application/json
{ <JSON> }
```

```cds
PUT ../Books(201)/image
Content-Type: image/png
<MEDIA>
```

> The media data is streamed automatically.

## Updating Media Resources

The media data for an entity can be updated using the PUT method:

```cds
PUT ../Books(201)/image
Content-Type: image/png
<MEDIA>
```

> The media data is streamed automatically.

## Deleting Media Resources

One option is to delete the complete entity, including all media data:

```http
DELETE ../Books(201)
```

Alternatively, you can delete a media data element individually:

```http
DELETE ../Books(201)/image
```

## Using External Resources

The following are requests and responses for the entity containing redirected media data from the third example, "Media data is stored in an external repository".
> This format is used by OData-Version: 4.0. To be changed in OData-Version: 4.01.

```cds
GET: ../Books(201)
>{ ...
    image@odata.mediaReadLink: "http://other-server/image.jpeg",
    image@odata.mediaContentType: "image/jpeg",
    imageType: "image/jpeg"
}
```

## Conventions & Limitations

#### General Conventions

- Binary data in payloads must be a Base64 encoded string.
- Binary data in URLs must have the format `binary'<url-safe base64 encoded>'`. For example:

```http
GET $filter=ID eq binary'Q0FQIE5vZGUuanM='
```

#### Node.js Runtime Conventions and Limitations

- The usage of binary data in some advanced constructs like the `$apply` query option and `/any()` might be limited.
- On SQLite, binary strings are stored as plain strings, whereas a buffer is stored as binary data. As a result, if in
a CDS query, a binary string is used to query data stored as binary, this wouldn't work.
- Please note, that SQLite doesn't support streaming. That means, that LargeBinary fields are read as a whole (not in chunks) and stored in memory, which can impact performance.
- SAP HANA Database Client for Node.js (HDB) and SAP HANA Client for Node.js (`@sap/hana-client`) packages handle
binary data differently. For example, HDB automatically converts binary strings into binary data, whereas SAP HANA
Client doesn't.
- In the Node.js Runtime, all binary strings are converted into binary data according to SAP HANA property types.
To disable this default behavior, you can set the environment variable <Config>cds.hana.base64_to_buffer: false</Config>.

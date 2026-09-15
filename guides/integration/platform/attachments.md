---
description: >
  How to add file attachment handling to CAP applications using the @cap-js/attachments plugin.
---

# Attachments

The [`@cap-js/attachments`](https://github.com/cap-js/attachments) plugin adds file storage and handling to CAP applications via a reusable `Attachments` aspect. In development it stores files in the local database; in production it uses an Object Store service (AWS S3, Azure Blob Storage, or GCP Cloud Storage).

## Setup

Add the package to your project:

```sh
npm add @cap-js/attachments
```

The plugin configures itself automatically.

## Adding Attachments to Your Model

Import the `Attachments` aspect and add a composition to your entity:

```cds
using { Attachments } from '@cap-js/attachments';

entity Incidents : cuid {
  //...
  attachments : Composition of many Attachments;
}
```

To get the Fiori elements attachment UI, the entity must be draft-enabled:

```cds
service IncidentsService {
  entity Incidents as projection on my.Incidents;
    annotate Incidents with @odata.draft.enabled;
}
```

## Production Setup

For Cloud Foundry, bind an Object Store service instance to your application and include it in your `mta.yaml`. The plugin picks up the binding and uses it as the storage backend.

## Further Capabilities

The plugin also supports file size and MIME type restrictions, malware scanning via SAP's malware scanning service, audit logging, and programmatic attachment copying between records. See the [plugin repository](https://github.com/cap-js/attachments) for details.

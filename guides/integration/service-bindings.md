---
description: >
  How CAP runtimes use service bindings to connect to required services at runtime, based on declared configuration and injected credentials.
---

# Service Bindings

Service bindings configure connectivity to required services. CAP runtimes use them to connect to these services at runtime, using credentials injected from the binding environment, such as `url`, and authentication details.



[[toc]]


## Declaring Required Services

Required services are declared via `cds.requires` configuration in CAP Node.js. Such configurations are typically placed in an application's _package.json_ file, for example like this in case of [_@capire/bookstore/package.json_](https://github.com/capire/bookstore/blob/main/package.json) :

::: code-group
```json [package.json]
"cds": {
  "requires": {
    "ReviewsService": { "kind": "odata" },
    "OrdersService": { "kind": "odata" }
  }
}
```
:::

The key names under `cds.requires` (here: `ReviewsService` and `OrdersService`) correspond to the names of the required services, used when calling `cds.connect.to(<service>)` in service implementations, for example:

```js
const ReviewsService = await cds.connect.to ('ReviewsService')
```

Configurations for required services can also be provided in a plug & play manner by CAP plugins. For example, the [_@capire/xtravels_](https://github.com/capire/xtravels) sample application automatically requires two services, provided by the CAP plugins [_@capire/s4_](https://github.com/capire/s4) and [_@capire/xflights_](https://github.com/capire/xflights/blob/main/apis/data-service).

[Learn more about that in the _CAP-level Service Integration_ guide.](calesi#packaged-apis) {.learn-more}



### Configuration Properties

| Property      | Description                                                      |
|---------------|------------------------------------------------------------------|
| `kind`        | (mandatory) protocol to use -> one of `odata`, `rest`, or `hcql` |
| `impl`        | custom service implementation to use                             |
| `model`       | a model to load automatically                                    |
| `service`     | name of the service definition (default: same as key)            |
| `credentials` | usually filled from binding environment, as outlined below       |

- Find detailed documentation about these properties in the [CAP Node.js documentation](../../node.js/cds-connect#cds-env-requires).


### Inspect using `cds env`

You can inspect the effective configurations of declared required services using the `cds env` command, including those from CAP plugins. For example, running this command in the _@capire/xtravels_ project yields the output below:

```sh
cds env requires
```
```zsh
'sap.capire.flights.FlightsService': {
  kind: '*'
},
```
```zsh
'sap.capire.s4.business-partner': {
  kind: 'odata-v2',
  impl: '@sap/cds/srv/remote-service.js',
  service: 'API_BUSINESS_PARTNER'
},
```

Add the `-b` flag to see the full configurations including credentials injected from the binding environment (if any). For example, run these commands from the _xtravels_ project root in three different terminals:

```shell :line-numbers=1
cds mock apis/capire/xflights.cds
```
```shell :line-numbers=2
cds mock apis/capire/s4.cds
```
```shell :line-numbers=3
cds env requires -b
```
```zsh
'sap.capire.flights.FlightsService': {
  kind: 'hcql',
  impl: '@sap/cds/srv/remote-service.js',
  credentials: { url: 'http://localhost:51441/hcql/data' }
},
```
```zsh
'sap.capire.s4.business-partner': {
  kind: 'odata-v2',
  impl: '@sap/cds/srv/remote-service.js',
  service: 'API_BUSINESS_PARTNER',
  credentials: { url: 'http://localhost:51438/odata/v4/business-partner' }
},
```



## Binding Environments

### Local Development
### Cloud Foundry

### Kyma / K8s

## Destinations

Destinations contain the necessary information to connect to a remote system. They're basically an advanced URL, that can carry additional metadata like, for example, the authentication information.

You can use [SAP BTP Destination Service](#btp-destination-service) destinations or [application-defined destinations](#application-defined-destinations) inline in your CAP configuration.

### BTP Destination Service {#btp-destination-service}

CAP supports resolving named destinations from the SAP BTP Destination Service. Configure the destination name in the `credentials` block of the required service:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata",
      "model": "srv/external/API_BUSINESS_PARTNER",
      "[production]": {
        "credentials": {
          "destination": "S4HANA",
          "path": "/sap/opu/odata/sap/API_BUSINESS_PARTNER"
        }
      }
    }
  }
}
```

Bind the Destination service to your application:

```sh
cds add destination
```

#### Native Fetch Client <Beta /> {#native-fetch-destinations}

When the [native fetch client](../../guides/deploy/to-cf#native-fetch) is active, CAP resolves BTP destinations natively without SAP Cloud SDK.

**Supported authentication types:**

| Authentication | Supported |
|---|:---:|
| `NoAuthentication` | ✓ |
| `BasicAuthentication` | ✓ |
| `OAuth2ClientCredentials` | ✓ |
| Others | Best-effort via native client |

**Caching:** Destination and token responses are cached with TTL derived from the token's `expiresIn` value. Concurrent requests for the same destination are deduplicated automatically.

**Configuration** (`cds.remote`):

| Property | Default | Description |
|---|---|---|
| `cache_size` | `0` (disabled) | Max number of cached destination/token entries (LRU) |
| `cache_expiry_buffer` | `'5min'` | Time subtracted from token TTL before cache expiry |
| `timeout` | `'10s'` | Timeout for destination service HTTP requests |

```jsonc
// package.json
{
  "cds": {
    "remote": {
      "native_fetch": true,
      "cache_size": 500,
      "cache_expiry_buffer": "2min"
    }
  }
}
```

::: warning Proxy type limitation
Only destinations with proxy type `Internet` are fully supported. On-premise destinations (proxy type `OnPremise`) require SAP Cloud SDK.
:::

#### SAP Cloud SDK

When the native fetch client is not active, CAP uses the SAP Cloud SDK to resolve BTP destinations. Additional `destinationOptions` can be passed to control resolution behavior:

```jsonc
"[production]": {
  "credentials": { ... },
  "destinationOptions": {
    "selectionStrategy": "alwaysSubscriber",
    "useCache": true
  }
}
```

[Learn more about destinations with SAP Cloud SDK.](../services/consuming-services#use-sap-btp-destinations){.learn-more}

### Application-Defined Destinations {#application-defined-destinations}

If you don't want to use the BTP Destination Service, you can define the URL and authentication details directly in your CAP configuration:

```jsonc
"cds": {
  "requires": {
    "REVIEWS": {
      "kind": "odata",
      "[production]": {
        "credentials": {
          "url": "https://reviews.ondemand.com/reviews",
          "authentication": "BasicAuthentication",
          "username": "<set from env>",
          "password": "<set from env>"
        }
      }
    }
  }
}
```

[Learn more about application-defined destinations.](../services/consuming-services#use-application-defined-destinations){.learn-more}

## Service Keys
## Using API Keys

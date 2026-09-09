---
description: >
  Class `cds.RemoteService` is a service proxy class to consume remote services via different [protocols](cds-serve#cds-protocols), like OData or plain REST.
---

# Remote Services <Concept />

Class `cds.RemoteService` is a service proxy class to consume remote services via different [protocols](cds-serve#cds-protocols), like OData or plain REST.

[[toc]]

<!--- % include links-for-node.md %} -->
<!--- % include _chapters toc="2,3" %} -->

<!--- % assign srv = '<span style="color:grey">&#8627; </span>' %} -->
<!--- % assign srv = '<span style="color:grey">srv</span>' %} -->


## cds.**RemoteService**  <i>  class </i> { #cds-remote-service}

### class cds.**RemoteService** <i>  extends cds.Service </i>

## cds.RemoteService — Configuration {#remoteservice-configuration }
[remoteservice configuration]: #remoteservice-configuration

The `cds.RemoteService` configuration allows you to define various options for connecting to remote services.

<!--- % assign tx = '<span style="color:grey">srv</span>' %} -->


### HTTP Client {#http-client}

CAP supports two HTTP clients for outgoing remote service calls.

#### SAP Cloud SDK

By default, CAP uses the SAP Cloud SDK HTTP client when `@sap-cloud-sdk/http-client` is installed. This provides full support for all BTP Destination service features including on-premise connectivity.

[Learn more about SAP Cloud SDK.](https://sap.github.io/cloud-sdk/docs/js/overview){.learn-more}

#### Native Fetch Client <Beta /> {#native-fetch}

CAP provides a built-in remote client that uses the native Node.js `fetch` API, including support for resolving named destinations from the SAP BTP Destination service.
During local development, you don't need SAP Cloud SDK.
For production, SAP Cloud SDK is only required if you use authentication types or proxy configurations not yet supported by the native client (see warning below).

CAP selects the native fetch client for each outgoing request according to the following rules:

1. If you explicitly set <Config>cds.remote.native_fetch</Config> to `true` or `false`, CAP uses that setting.
2. Otherwise, CAP uses native fetch when you haven't installed `@sap-cloud-sdk/http-client`.

::: warning Current limitations
The native fetch client supports only proxy type `Internet` and authentication types `NoAuthentication`, `BasicAuthentication`, and `OAuth2ClientCredentials`. Other authentication types are resolved on a best-effort basis via the native destination client.
:::

[Learn more about BTP Destination service support for the native fetch client.](../guides/integration/service-bindings#native-fetch-destinations){.learn-more}

### CSRF-Token Handling

If the remote system you want to consume requires it, you can enable the new CSRF-token handling of `@sap-cloud-sdk/core` via configuration options `csrf` and `csrfInBatch`. These options allow to configure CSRF-token handling for each remote service separately.

#### Basic Configuration

```json
"cds": {
    "requires": {
        "API_BUSINESS_PARTNER": {
            "kind": "odata",
            "model": "srv/external/API_BUSINESS_PARTNER",
            "csrf": true,
            "csrfInBatch": true
        }
    }
}
```

In this example, CSRF handling is enabled for the `API_BUSINESS_PARTNER` service, for regular requests (`csrf: true`) and requests made within batch operations (`csrfInBatch: true`).

#### Advanced Configuration

Actually `csrf: true` is a convenient preset. If needed, you can further customize the CSRF-token handling with additional parameters:

```json
"cds": {
    "requires": {
        "API_BUSINESS_PARTNER": {
            ...
            "csrf": {  // [!code focus]
              "method": "get",  // [!code focus]
              "url": "..."  // [!code focus]
            }
        }
    }
}
```

Here, the CSRF-token handling is customized at a more granular level:

 - `method`: The HTTP method for fetching the CSRF token. The default is `head`.
 - `url`: The URL for fetching the CSRF token. The default is the resource path without parameters.

### Timeout Handling

The `requestTimeout` setting in the `cds.RemoteService` configuration specifies the maximum duration, in milliseconds
(default: 60000), to wait for a response from the remote service before timing out.


#### Configuration Option

```json
{
  "API_BUSINESS_PARTNER": {
    "kind": "odata",
    "credentials": {
      ...
      "requestTimeout": 1000000 // [!code focus]
    }
  }
}
```

::: tip
See [BTP Destination Service](../guides/integration/service-bindings#btp-destination-service) for more details on destination configuration.
:::

##  <i>  More to Come </i>

This documentation is not complete yet, or the APIs are not released for general availability. There's more to come in this place in upcoming releases.

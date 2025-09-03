---
synopsis: >
  Learn details about using messaging services and outbox for asynchronous communications.
# layout: node-js
status: released
---

# Messaging

{{$frontmatter?.synopsis}}

[[toc]]

<!--- % include links-for-node.md %} -->
<!--- % include _chapters toc="2,3" %} -->


## cds.**MessagingService**  <i>  class </i>

  Class `cds.MessagingService` and subclasses thereof are technical services representing asynchronous messaging channels.
  They can be used directly/low-level, or behind the scenes on higher-level service-to-service eventing.

### class cds.**MessagingService**  <i>  extends cds.Service </i>

## Declaring Events

In your CDS model, you can model events using the `event` keyword inside services.
Once you created the `messaging` section in `cds.requires`, all modeled events are automatically enabled for messaging.

You can then use the services to emit events (for your own service) or receive events (for external services).

Example:

In your _package.json_:

```json
{
  "cds": {
    "requires": {
      "ExternalService": {
        "kind": "odata",
        "model": "srv/external/external.cds"
      },
      "messaging": {
        "kind": "enterprise-messaging"
      }
    }
  }
}
```

In _srv/external/external.cds_:

```cds
service ExternalService {
    event ExternalEvent {
        ID: UUID;
        name: String;
    }
}
```

In _srv/own.cds_:

```cds
service OwnService {
    event OwnEvent {
        ID: UUID;
        name: String;
    }
}
```

In _srv/own.js_:

```js
module.exports = async srv => {
  const externalService = await cds.connect.to('ExternalService')
  externalService.on('ExternalEvent', async msg => {
    await srv.emit('OwnEvent', msg.data)
  })
}
```

#### Custom Topics with Declared Events

You can specify topics to modeled events using the `@topic` annotation.
::: tip
If no annotation is provided, the topic will be set to the fully qualified event name.
:::

Example:

```cds
service OwnService {
    @topic: 'my.custom.topic'
    event OwnEvent { ID: UUID; name: String; }
}
```


## Emitting Events

To send a message to the message broker, you can use the `emit` method on a transaction for the connected service.

Example:

```js
const messaging = await cds.connect.to('messaging')

this.after(['CREATE', 'UPDATE', 'DELETE'], 'Reviews', async (_, req) => {
  const { subject } = req.data
  const { rating } = await cds.run(
    SELECT.one(['round(avg(rating),2) as rating'])
    .from(Reviews)
    .where({ subject }))

  // send to a topic
  await messaging.emit('cap/msg/system/review/reviewed',
   { subject, rating })

  // alternative if you want to send custom headers
  await messaging.emit({ event: 'cap/msg/system/review/reviewed',
    data: { subject, rating },
    headers: { 'X-Correlation-ID': req.headers['X-Correlation-ID'] }})
})
```
::: tip
The messages are sent once the transaction is successful.
Per default, a persistent queue is used. See [Messaging - Queue](./queue) for more information.
:::

## Receiving Events

To listen to messages from a message broker, you can use the `on` method on the connected service.
This also creates the necessary topic subscriptions.

Example:

```js
const messaging = await cds.connect.to('messaging')

// listen to a topic
messaging.on('cap/msg/system/review/reviewed', msg => {
  const { subject, rating } = msg.data
  return cds.run(UPDATE(Books, subject).with({ rating }))
})
```

Once all handlers are executed successfully, the message is acknowledged.
If one handler throws an error, the message broker will be informed that the message couldn't be consumed properly and might send the message again. To avoid endless cycles, consider catching all errors.

If you want to receive all messages without creating topic subscriptions, you can register on `'*'`. This is useful when consuming messages from a dead letter queue.

```js
messaging.on('*', async msg => { /*...*/ })
```

::: tip
In general, messages do not contain user information but operate with a technical user. As a consequence, the user of the message processing context (`cds.context.user`) is set to [`cds.User.privileged`](/node.js/authentication#privileged-user) and, hence, any necessary authorization checks must be done in custom handlers.
:::

### Inbox <Beta />

You can store received messages in an inbox before they're processed. Under the hood, it uses the [task queue](./queue) for reliable asynchronous processing.
Enable it by setting the `inboxed` option to `true`, for example:

```js
{
  cds: {
    requires: {
      messaging: {
        kind: 'enterprise-messaging',
        inboxed: true
      }
    }
  }
}
```

## CloudEvents Protocol

[CloudEvents](https://cloudevents.io/) is a commonly used specification for describing event data.

An example event looks like this:

```js
{
  "type": "sap.s4.beh.salesorder.v1.SalesOrder.Created.v1",
  "specversion": "1.0",
  "source": "/default/sap.s4.beh/ER9CLNT001",
  "id": "0894ef45-7741-1eea-b7be-ce30f48e9a1d",
  "time": "2020-08-14T06:21:52Z",
  "datacontenttype": "application/json",
  "data": {
    "SalesOrder":"3016329"
  }
}
```

To help you adhere to this standard, CAP prefills these header fields automatically.
To enable this, you need to set the option `format: 'cloudevents'` in your message broker.

Example:

```js
{
  cds: {
    requires: {
      messaging: {
        kind: 'enterprise-messaging-shared',
        format: 'cloudevents'
      }
    }
  }
}
```

You can always overwrite the default values.

### Topic Prefixes

If you want the topics to start with a certain string, you can set a publish and/or a subscribe prefix in your message broker.

Example:

```js
{
  cds: {
    requires: {
      messaging: {
        kind: 'enterprise-messaging-shared',
        publishPrefix: 'default/sap.cap/books/',
        subscribePrefix: 'default/sap.cap/reviews/'
      }
    }
  }
}
```

### Topic Manipulations

<span id="beforeeventmesh" />

#### [SAP Event Mesh](../guides/messaging/#sap-event-mesh)

If you specify your format to be `cloudevents`, the following default prefixes are set:

```js
{
  publishPrefix: '$namespace/ce/',
  subscribePrefix: '+/+/+/ce/'
}
```

In addition to that, slashes in the event name are replaced by dots and the `source` header field is derived based on `publishPrefix`.

Examples:

| publishPrefix            | derived source      |
|--------------------------|---------------------|
| `my/own/namespace/ce/`   | `/my/own/namespace` |
| `my/own.namespace/-/ce/` | `/my/own.namespace` |


## Message Brokers

To safely send and receive messages between applications, you need a message broker in-between where you can create queues that listen to topics. All relevant incoming messages are first stored in those queues before they're consumed. This way messages aren't lost when the consuming application isn't available.

In CDS, you can configure one of the available broker services in your [`requires` section](cds-connect#cds-env-requires).

According to our [grow as you go principle](../about/#grow-as-you-go), it makes sense to first test your application logic without a message broker and enable it later. Therefore, we provide support for [local messaging](#local-messaging) (if everything is inside one Node.js process) as well as [file-based messaging](#file-based).

### Configuring Message Brokers

You must provide all necessary credentials by [binding](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/296cd5945fd84d7d91061b2b2bcacb93.html) the message broker to your app.

For local environments, use [`cds bind`](../advanced/hybrid-testing#cds-bind-usage) in a [hybrid setup](../guides/messaging/event-mesh#run-tests-in-hybrid-setup).

::: tip
For local testing use [`kind`: `enterprise-messaging-shared`](#event-mesh-shared) to avoid the complexity of HTTP-based messaging.
:::

### SAP Event Mesh (Shared) { #event-mesh-shared}

`kind`: `enterprise-messaging-shared`

Use this if you want to communicate using [SAP Event Mesh](https://help.sap.com/docs/SAP_EM/bf82e6b26456494cbdd197057c09979f/df532e8735eb4322b00bfc7e42f84e8d.html) in a shared way.

If you register at least one handler, a queue will automatically be created if not yet existent. Keep in mind that unused queues aren't automatically deleted, this has to be done manually.

You have the following configuration options:

- `queue`: An object containing the `name` property as the name of your queue, additional properties are described [in the SAP Business Accelerator Hub](https://hub.sap.com/api/SAPEventMeshDefaultManagementAPIs/path/putQueue).
- `amqp`: AQMP client options as described in the [`@sap/xb-msg-amqp-v100` documentation](https://www.npmjs.com/package/@sap/xb-msg-amqp-v100?activeTab=readme)

If the queue name isn't specified, it's derived from `application_name` and the first four characters of `application_id` of your `VCAP_APPLICATION` environmental variable, as well as the `namespace` property of your SAP Event Mesh binding in `VCAP_SERVICES`: `{namespace}/{application_name}/{truncated_application_id}`.
This makes sure that every application has its own queue.

Example:

```json
{
    "requires": {
        "messaging": {
            "kind": "enterprise-messaging-shared",
            "queue": {
               "name": "my/enterprise/messaging/queue",
               "accessType": "EXCLUSIVE",
               "maxMessageSizeInBytes": 19000000
            },
            "amqp": {
              "incomingSessionWindow": 100
            }
        }
    }
}
```

::: warning _❗ Warning_
When using `enterprise-messaging-shared` in a multitenant scenario, only the provider account will have an event bus. There is no tenant isolation.
:::

::: tip
You need to install the latest version of the npm package `@sap/xb-msg-amqp-v100`.
:::

::: tip
For optimal performance, you should set the correct access type.
To make sure your server is not flooded with messages, you should set the incoming session window.
:::

### SAP Event Mesh

`kind`: `enterprise-messaging`

This is the same as `enterprise-messaging-shared` except that messages are transferred through HTTP. For incoming messages, a webhook is used.

Compared to `enterprise-messaging-shared` you have the additional configuration option:
- `webhook`: An object containing the `waitingPeriod` property as the time in milliseconds until a webhook is created after the application is listening to incoming HTTP requests (default: 5000). Additional properties are described in the `Subscription` object in [SAP Event Mesh - REST APIs Messaging](https://help.sap.com/doc/3dfdf81b17b744ea921ce7ad464d1bd7/Cloud/en-US/messagingrest-api-spec.html).

Example:

```json
{
    "requires": {
        "messaging": {
            "kind": "enterprise-messaging",
            "queue": {
               "name": "my/enterprise/messaging/queue",
               "accessType": "EXCLUSIVE",
               "maxMessageSizeInBytes": 19000000
            },
            "webhook": {
              "waitingPeriod": 7000
            }
        }
    }
}

```
<!-- ```js -->
<!-- { -->
<!--   waitingPeriod: 5000, -->
<!--   name: "{queueName}", -->
<!--   address: "queue:{queueName}", -->
<!--   qos: 1, -->
<!--   pushConfig: { -->
<!--     type: "webhook", -->
<!--     endpoint: "{VCAP_SERVICES.application_uris[0]}/messaging/enterprise-messaging?q={queueName}", -->
<!--     exemptHandshake: false, -->
<!--     securitySchema: { // if application is bound to an XSUAA instance -->
<!--       type: "oauth2", -->
<!--       grantType: "client_credentials", -->
<!--       clientId: "from Event Mesh binding", -->
<!--       clientSecret: "from Event Mesh binding", -->
<!--       tokenUrl: "from Event Mesh binding" -->
<!--     } -->
<!--   } -->
<!-- } -->
<!-- ``` -->
If your server is authenticated using [XSUAA](authentication#jwt), you need to grant the scope `$XSAPPNAME.emcallback` to SAP Event Mesh for it to be able to trigger the handshake and send messages.

::: code-group
```js [xs-security.json]
{
  ...,
  "scopes": [
    ...,
    {
      "name": "$XSAPPNAME.emcallback",
      "description": "Event Mesh Callback Access",
      "grant-as-authority-to-apps": [
        "$XSSERVICENAME(<SERVICE_NAME_OF_YOUR_EVENT_MESH_INSTANCE>)"
      ]
    }
  ]
}
```
:::

Make sure to add this to the service descriptor of your SAP Event Mesh instance:

```js
{
  ...,
  "authorities": [
    "$ACCEPT_GRANTED_AUTHORITIES"
  ]
}
```
::: warning
This will not work in the `dev` plan of SAP Event Mesh.
:::

::: warning
If you enable the [cors middleware](https://www.npmjs.com/package/cors), [handshake requests](https://help.sap.com/docs/SAP_EM/bf82e6b26456494cbdd197057c09979f/6a0e4c77e3014acb8738af039bd9df71.html?q=handshake) from SAP Event Mesh might be intercepted.
:::

<span id="aftereventmesh" />

### SAP Cloud Application Event Hub { #event-broker }

`kind`: `event-broker`

Use this if you want to communicate using [SAP Cloud Application Event Hub](https://help.sap.com/docs/event-broker).

The integration with SAP Cloud Application Event Hub is provided using the plugin [`@cap-js/event-broker`](https://github.com/cap-js/event-broker).
Please see the plugin's [setup guide](https://github.com/cap-js/event-broker/blob/main/README.md#setup) for more details.

### SAP Integration Suite, Advanced Event Mesh <Beta />  { #advanced-event-mesh }

`kind`: `advanced-event-mesh`

Use this if you want to communicate using [SAP Integration Suite, advanced event mesh](https://help.sap.com/docs/event-broker).

The integration with SAP Integration Suite, advanced event mesh is provided using the plugin [`@cap-js/advanced-event-mesh`](https://github.com/cap-js/advanced-event-mesh).
Please see the plugin's [setup guide](https://github.com/cap-js/advanced-event-mesh/blob/main/README.md#setup) for more details.

<div id="queuing-sap" />

<div id="kafka-sap" />

### Redis PubSub <Beta />
::: warning
This is a beta feature. Beta features aren't part of the officially delivered scope that SAP guarantees for future releases.
:::

`kind`: `redis-messaging`

Use [Redis PubSub](https://redis.io/) as a message broker.

There are no queues:
- Messages are lost when consumers are not available.
- All instances receive the messages independently.

::: warning No tenant isolation in multitenant scenario
When using `redis-messaging` in a multitenant scenario, only the provider account will have an event bus. There is no tenant isolation.
:::

::: tip
You need to install the latest version of the npm package `redis`.
:::


### File Based

`kind`: `file-based-messaging`

Don't use this in production, only if you want to test your application _locally_. It creates a file and uses it as a simple message broker.

>You can have at most one consuming app per emitted event.

You have the following configuration options:
* `file`: You can set the file path (default is _~/.cds-msg-box_).

Example:

```json
{
    "requires": {
        "messaging": {
            "kind": "file-based-messaging",
            "file": "../msg-box"
        }
    }
}
```

::: warning No tenant isolation in multitenant scenario
When using `file-based-messaging` in a multitenant scenario, only the provider account will have an event bus. There is no tenant isolation.
:::


### Local Messaging

`kind`: `local-messaging`

You can use local messaging to communicate inside one Node.js process. It's especially useful in your automated tests.

### Composite-Messaging

`kind`: `composite-messaging`

If you have several messaging services and don't want to mention them explicitly in your code, you can create a `composite-messaging` service where you can define routes for incoming and outgoing messages. In those routes, you can use glob patterns to match topics (`**` for any number of any character, `*` for any number of any character except `/` and `.`, `?` for a single character).

Example:

```json
{
  "requires": {
    "messaging": {
      "kind": "composite-messaging",
      "routes": {
        "myEnterpriseMessagingReview": ["cap/msg/system/review/*"],
        "myEnterpriseMessagingBook": ["**/book/*"]
      }
    },
    "myEnterpriseMessagingReview": {
      "kind": "enterprise-messaging",
      "queue": {
        "name": "cap/msg/system/review"
      }
    },
    "myEnterpriseMessagingBook": {
      "kind": "enterprise-messaging",
      "queue": {
        "name": "cap/msg/system/book"
      }
    }
  }
}
```

```js
module.exports = async srv => {
  const messaging = await cds.connect.to('messaging')

  messaging.on('book/repository/book/modified', msg => {
    // comes from myEnterpriseMessagingBook
  })

  messaging.on('cap/msg/system/review/reviewed', msg => {
    // comes from myEnterpriseMessagingReview
  })
}
```

---
synopsis: >
  CAP provides intrinsic support for emitting and receiving events.
  This is complemented by Messaging Services connecting to message brokers to exchange event messages across remote services.
status: released
---

# CAP-level Messaging

<!-- <div id="impl-variants" style="margin:-80px 0 80px 3px;">
  <a impl-variant="node" class="impl-variant" title="Content for Node.js">Node.js</a>
  <a impl-variant="java" class="impl-variant" title="Content for Java">Java</a>
</div> -->

{{ $frontmatter.synopsis }}

[[toc]]

## Why Using Messaging?

Using messaging has two major advantages:

::: tip Resilience
If a receiving service goes offline for a while, event messages are safely stored, and guaranteed to be delivered to the receiver as soon as it goes online again.
:::

::: tip Decoupling
Emitters of event messages are decoupled from the receivers and don't need to know them at the time of sending. This way a service is able to emit events that other services can register on in the future, for example, to implement **extension** points.
:::


## Using Message Channels

When emitters and receivers live in separate processes, you need to add a message channel to forward event messages. CAP provides messaging services, which take care for that message channel behind the scenes as illustrated in the following graphic:

![The reviews service and the catalog service, each in a seperate process, are connected to the messaging service which holds the messaging channel behind the scenes.](assets/remote.drawio.svg)


::: tip Uniform, Agnostic Messaging
CAP provides messaging services, which transport messages behind the scenes using different messaging channels and brokers. All of this happens without the need to touch your code, which stays on conceptual level.
:::



### 1. Use `file-based-messaging` in Development

For quick tests during development, CAP provides a simple file-based messaging service implementation. Configure that as follows for the `[development]` profile:

```jsonc
"cds": {
  "requires": {
    "messaging": {
      "[development]": { "kind": "file-based-messaging" }
    },
  }
}
```

[Learn more about `cds.env` profiles.](../../node.js/cds-env#profiles){.learn-more}

In our samples, you find that in [@capire/reviews/package.json](https://github.com/capire/reviews/blob/main/package.json) as well as [@capire/bookstore/package.json](https://github.com/capire/bookstore/blob/main/package.json), which you'll run in the next step as separate processes.


### 2. Start the `reviews` Service and `bookstore` Separately 

First start the `reviews` service separately:

```sh
cds watch reviews
```

The trace output should contain these lines, confirming that you're using `file-based-messaging`, and that the `ReviewsService` is served by that process at port 4005:

```log
[cds] - connect to messaging > file-based-messaging { file: '~/.cds-msg-box' }
[cds] - serving ReviewsService { path: '/reviews', impl: '../reviews/srv/reviews-service.js' }

[cds] - server listening on { url: 'http://localhost:4005' }
[cds] - launched at 5/25/2023, 4:53:46 PM, version: 7.0.0, in: 593.274ms
```

Then, in a separate terminal start the `bookstore` server as before:

```sh
cds watch bookstore
```

This time the trace output is different to [when you started all in a single server](./core-concepts#start-server). The output confirms that you're using `file-based-messaging`, and that you now *connected* to the separately started `ReviewsService` at port 4005:

```log
[cds] - connect to messaging > file-based-messaging { file: '~/.cds-msg-box' }
[cds] - mocking OrdersService { path: '/orders', impl: '../orders/srv/orders-service.js' }
[cds] - serving CatalogService { path: '/browse', impl: '../reviews/srv/cat-service.js' }
[cds] - serving AdminService { path: '/admin', impl: '../reviews/srv/admin-service.js' }
[cds] - connect to ReviewsService > odata { url: 'http://localhost:4005/reviews' }

[cds] - server listening on { url: 'http://localhost:4004' }
[cds] - launched at 5/25/2023, 4:55:46 PM, version: 7.0.0, in: 1.053s
```

### 3. Add or Update Reviews {#add-or-update-reviews}

Similar to before, open [http://localhost:4005/vue/index.html](http://localhost:4005/vue/index.html) to add or update reviews.

→ In the terminal window for the `reviews` server you should see this:

```log
[cds] - PATCH /reviews/Reviews/74191a20-f197-4829-bd47-c4676710e04a
< emitting: reviewed { subject: '251', count: 1, rating: 3 }
```

→ In the terminal window for the `bookstore` server you should see this:

```log
> received: reviewed { subject: '251', count: 1, rating: 3 }
```

::: tip **Agnostic Messaging APIs**
Without touching any code the event emitted from the `ReviewsService` got transported via `file-based-messaging` channel behind the scenes and was received in the `bookstore` as before, when you used in-process eventing → which was to be shown (*QED*).
:::

### 4. Shut Down and Restart Receiver → Resilience by Design

You can simulate a server outage to demonstrate the value of messaging for resilience as follows:

1. Terminate the `bookstore` server with <kbd>Ctrl</kbd> + <kbd>C</kbd> in the respective terminal.
2. Add or update more reviews as described before.
3. Restart the receiver with `cds watch bookstore`.

→ You should see some trace output like that:

```log
[cds] - server listening on { url: 'http://localhost:4004' }
[cds] - launched at 5/25/2023, 10:45:42 PM, version: 7.0.0, in: 1.023s
[cds] - [ terminate with ^C ]

> received: reviewed { subject: '207', count: 1, rating: 2 }
> received: reviewed { subject: '207', count: 1, rating: 2 }
> received: reviewed { subject: '207', count: 1, rating: 2 }
```

::: tip **Resilience by Design**
All messages emitted while the receiver was down stayed in the messaging queue and are delivered when the server is back.
:::


### Have a Look Into _~/.cds-msg-box_

You can watch the messages flowing through the message queue by opening _~/.cds-msg-box_ in a text editor. When the receiver is down and therefore the message not already consumed, you can see the event messages emitted by the `ReviewsService` in entries like that:

```json
ReviewsService.reviewed {"data":{"subject":"201","count":4,"rating":5}, "headers": {...}}
```



## Using Multiple Channels

By default CAP uses a single message channel for all messages.

For example: If you consume messages from SAP S/4HANA in an enhanced version of `bookstore`, as well as emit messages a customer could subscribe and react to in a customer extension, the overall topology would look like that:

![The reviews service, bookstore, and the SAP S/4HANA system send events to a common message bus. The bookstore also receives events and customer extensions as well.](assets/composite1.drawio.svg)

### Using Separate Channels

Now, sometimes you want to use separate channels for different emitters or receivers. Let's assume you want to have a dedicated channel for all events from SAP S/4HANA, and yet another separate one for all outgoing events, to which customer extensions can subscribe too. This situation is illustrated in this graphic:

![The graphic shows seperate message channels for each event emitter and its subscribers.](assets/composite2.drawio.svg)

This is possible when using [low-level messaging](#low-level-messaging), but comes at the price of loosing all advantages of conceptual-level messaging as explained in the following.

### Using `composite-messaging` Implementation

To avoid falling back to low-level messaging, CAP provides the `composite-messaging` implementation, which basically acts like a transparent dispatcher for both, inbound and outbound messages. The resulting topology would look like that:

![Each emitter and subscriber has its own message channel. In additon there's a composite message channel that dispatches to/from each of those seperate channels.](assets/composite3.drawio.svg)


::: tip **Transparent Topologies**
The `composite-messaging` implementation allows to flexibly change topologies of message channels at deployment time, without touching source code or models.
:::

### Configuring Individual Channels and Routes

You would configure this in `bookstore`'s _package.json_ as follows:

```jsonc
"cds": {
  "requires": {
    "messaging": {
      "kind": "composite-messaging",
      "routes": {
        "ChannelA": ["**/ReviewsService/*"],
        "ChannelB": ["**/sap/s4/**"]
        "ChannelC": ["**/bookshop/**"]
      }
    },
    "ChannelA": {
      "kind": "enterprise-messaging", ...
    },
    "ChannelB": {
      "kind": "enterprise-messaging", ...
    },
    "ChannelC": {
      "kind": "enterprise-messaging", ...
    }
  }
}
```

In essence, you first configure a messaging service for each channel. In addition, you would configure the default `messaging` service to be of kind `composite-messaging`.

In the `routes`, you can use the glob pattern to define filters for event names, that means:

- `**` will match any number of characters.
- `*` will match any number of characters except `/` and `.`.
- `?` will match a single character.

::: tip
You can also refer to events declared in CDS models, by using their fully qualified event name (unless annotation `@topic` is used on them).
:::

## Low-Level Messaging

In the previous sections it's documented how CAP promotes messaging on conceptual levels, staying agnostic to topologies and message brokers. While CAP strongly recommends staying on that level, CAP also offers lower-level messaging, which loses some of the advantages but still stays independent from specific message brokers.

::: tip Messaging as Just Another CAP Service
All messaging implementations are provided through class `cds.MessagingService` and broker-specific subclasses of that. This class is in turn a standard CAP service, derived from `cds.Service`, hence it's consumed as any other CAP service, and can also be extended by adding event handlers as usual.
:::

#### Configure Messaging Services

As with all other CAP services, add an entry to `cds.requires` in your _package.json_ or _.cdsrc.json_ like that:

```jsonc
"cds": {
  "requires": {
    "messaging": {
      "kind": // ...
    },
  }
}
```

[Learn more about `cds.env` and `cds.requires`.](../../node.js/cds-env#services){.learn-more}

You're free how you name your messaging service. Could be `messaging` as in the previous example, or any other name you choose. You can also configure multiple messages services with different names.

#### Connect to the Messaging Service

Instead of connecting to an emitter service, connect to the messaging service:

```js
const messaging = await cds.connect.to('messaging')
```

#### Emit Events to Messaging Service

Instead of emitter services emitting to themselves, emit to the messaging service:

```js
await messaging.emit ('ReviewsService.reviewed', { ... })
```

#### Receive Events from Messaging Service

Instead of registering event handlers with a concrete emitter service, register handlers on the messaging service:

```js
messaging.on ('ReviewsService.reviewed', msg => console.log(msg))
```

<br>

#### Declared Events and `@topic` Names

When declaring events in CDS models, be aware that the fully qualified name of the event is used as topic names when emitting to message brokers. Based on the following model, the resulting topic name is `my.namespace.SomeEventEmitter.SomeEvent`.

```cds
namespace my.namespace;
service SomeEventEmitter {
  event SomeEvent { ... }
}
```

If you want to manually define the topic, you can use the `@topic` annotation:

```cds
//...
@topic: 'some.very.different.topic-name'
event SomeEvent { ... }
```



#### Conceptual vs. Low-Level Messaging

When looking at the previous code samples, you see that in contrast to conceptual messaging you need to provide fully qualified event names now. This is just one of the advantages you lose. Have a look at the following list of advantages you have using conceptual messaging and lose with low-level messaging.

- Service-local event names (as already mentioned)
- Event declarations (as they go with individual services)
- Generated typed API classes for declared events
- Run in-process without any messaging service

::: tip Always prefer conceptual-level API over low-level API variants.
Besides the things listed above, this allows you to flexibly change topologies, such as starting with co-located services in a single process, and moving single services out to separate micro services later on.
:::



## CloudEvents Standard {#cloudevents}

CAP messaging has built-in support for formatting event data compliant to the [CloudEvents](https://cloudevents.io/) standard. Enable this using the `format` config option as follows:

```json
"cds": {
  "requires": {
    "messaging": {
      "format": "cloudevents"
    }
  }
}
```

With this setting, all mandatory and some more basic header fields, like `type`, `source`, `id`, `datacontenttype`, `specversion`, `time` are filled in automatically. The event name is used as `type`. The message payload is in the `data` property anyways.

::: tip CloudEvents is a wire protocol specification.
Application developers shouldn't have to care for such technical details. CAP ensures that for you, by filling in the respective fields behind the scenes.
:::

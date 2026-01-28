---
status: released
---


# Custom Event Handlers

As most use cases are covered by [generic runtimes](served-ootb), the need for custom coding is greatly reduced. Nevertheless, there are still numerous cases where custom code is required. And the CAP runtimes provide a flexible and powerful event handler mechanism for you to add custom code at any point during request processing. {.abstract}

> [!tip] Always prefer declarative techniques 
> Consider first whether your custom logic can be addressed using declarative techniques, like [status flows](./status-flows) or [declarative constraints](./constraints), before resorting over to programmatic and hence imperative options.

[[toc]]


## Custom Service Providers

**In Node.js**, the easiest way to add custom implementations for services is through equally named _.js_ files placed next to a service definition's _.cds_ file:

```sh
./srv
  - cat-service.cds  # service definitions
  - cat-service.js   # service implementation
...
```

[Learn more about providing service implementations in Node.js.](../../node.js/core-services#implementing-services){.learn-more}

**In Java**, you'd assign `EventHandler` classes using dependency injection as follows:

```Java
@Component
@ServiceName("org.acme.Foo")
public class FooServiceImpl implements EventHandler {...}
```

[Learn more about Event Handler classes in Java.](../../java/event-handlers/index#handlerclasses){.learn-more}



## Custom Event Handlers

Within your custom implementations, you can register event handlers like that:

::: code-group

```js [Node.js]
module.exports = function (){
  this.on ('submitOrder', (req)=>{...}) //> custom actions
  this.on ('CREATE',`Books`, (req)=>{...})
  this.before ('UPDATE',`*`, (req)=>{...})
  this.after ('READ',`Books`, (books)=>{...})
}
```
```Java
@Component
@ServiceName("BookshopService")
public class BookshopServiceImpl implements EventHandler {
  @On(event="submitOrder") public void onSubmitOrder (EventContext req) {...}
  @On(event="CREATE", entity="Books") public void onCreateBooks (EventContext req) {...}
  @Before(event="UPDATE", entity="*") public void onUpdate (EventContext req) {...}
  @After(event="READ", entity="Books") public void onReadBooks (EventContext req) {...}
}
```

:::

[Learn more about **adding event handlers in Node.js**.](../../node.js/core-services#srv-on-before-after){.learn-more}

[Learn more about **adding event handlers in Java**.](../../java/event-handlers/index#handlerclasses){.learn-more}



## Hooks: `on`, `before`, `after`

In essence, event handlers are functions/method registered to be called when a certain event occurs, with the event being a custom operation, like `submitOrder`, or a CRUD operation on a certain entity, like `READ Books`; in general following this scheme:

- `<hook:on|before|after>` , `<event>` , `[<entity>]` &rarr; handler function

CAP allows to plug in event handlers to these different hooks, that is phases during processing a certain event:

- `on` handlers run _instead of_ the generic/default handlers.
- `before` handlers run _before_ the `on` handlers
- `after` handlers run _after_ the `on` handlers, and get the result set as input

`on` handlers form an *interceptor* stack: the topmost handler getting called by the framework. The implementation of this handler   is in control whether to delegate to default handlers down the stack or not.

`before` and `after` handlers are *listeners*: all registered listeners are invoked in parallel. If one vetoes / throws an error the request fails.



## Within Event Handlers {#handler-impls}

Event handlers all get a uniform _Request_/_Event Message_ context object as their primary argument, which, among others, provides access to the following information:

- The `event` name — that is, a CRUD method name, or a custom-defined one
- The `target` entity, if any
- The `query` in [CQN](../../cds/cqn) format, for CRUD requests
- The `data` payload
- The `user`, if identified/authenticated
- The `tenant` using your SaaS application, if enabled

[Learn more about **implementing event handlers in Node.js**.](../../node.js/events#cds-request){.learn-more}
[Learn more about **implementing event handlers in Java**.](../../java/event-handlers/index#eventcontext){.learn-more}

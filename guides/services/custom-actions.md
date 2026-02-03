---
status: released
---


# Custom Actions and Functions

[[toc]]


## Defining Custom Actions

In addition to common CRUD operations, you can declare domain-specific custom operations as shown below. These custom operations always need custom implementations in corresponding events handlers.

You can define `actions` and `functions` in CDS models like that:
```cds
service Sue {
  // unbound actions & functions
  function sum (x:Integer, y:Integer) returns Integer;
  function stock (id : Foo:ID) returns Integer;
  action add (x:Integer, to: Integer) returns Integer;

  // bound actions & functions
  entity Foo { key ID:Integer } actions {
    function getStock() returns Integer;
    action order (x:Integer) returns Integer;
    // bound to the collection and not a specific instance of Foo
    action customCreate (in: many $self, x: String) returns Foo;
    // All parameters are optional by default, unless marked with `not null`:
    action discard (reason: String not null);
  }
}
```

[Learn more about modeling actions and functions in CDS.](../../cds/cdl#actions){.learn-more}


## Kinds of Actions

The differentiation between *Actions* and *Functions* as well as *bound* and *unbound* stems from the OData specifications, and in essence is as follows:

- **Actions** modify data in the server
- **Functions** retrieve data
- **Unbound** actions/functions are like plain unbound functions in JavaScript.
- **Bound** actions/functions always receive the bound entity's primary key as implicit first argument, similar to `this` pointers in Java or JavaScript. The exception are bound actions to collections, which are bound against the collection and not a specific instance of the entity. An example use case are custom create actions for the SAP Fiori elements UI.


## Implementing Actions

In general, implement actions or functions like that:

```js
module.exports = function Sue(){
  this.on('sum', ({data:{x,y}}) => x+y)
  this.on('add', ({data:{x,to}}) => stocks[to] += x)
  this.on('stock', ({data:{id}}) => stocks[id])
  this.on('getStock','Foo', ({params:[id]}) => stocks[id])
  this.on('order','Foo', ({params:[id],data:{x}}) => stocks[id] -= x)
}
```

Event handlers for actions or functions are very similar to those for CRUD events, with the name of the action/function replacing the name of the CRUD operations. No entity is specific for unbound actions/functions.

**Method-style Implementations** in Node.js, you can alternatively implement actions and functions using conventional JavaScript methods with subclasses of `cds.Service`:

```js
module.exports = class Sue extends cds.ApplicationService {
  sum(x,y) { return x+y }
  add(x,to) { return stocks[to] += x }
  stock(id) { return stocks[id] }
  getStock(Foo,id) { return stocks[id] }
  order(Foo,id,x) { return stocks[id] -= x }
}
```



## Calling Actions / Functions

**HTTP Requests** to call the actions/function declared above look like that:

```js
GET .../sue/sum(x=1,y=2)              // unbound function
GET .../sue/stock(id=2)               // unbound function
POST .../sue/add {"x":11,"to":2}      // unbound action
GET .../sue/Foo(2)/Sue.getStock()     // bound function
POST .../sue/Foo(2)/Sue.order {"x":3} // bound action
```

> Note: You always need to add the `()` for functions, even if no arguments are required. The OData standard specifies that bound actions/functions need to be prefixed with the service's name. In the previous example, entity `Foo` has a bound action `order`. That action must be called via `/Foo(2)/Sue.order` instead of simply `/Foo(2)/order`.
> For convenience, you may:
> - Call bound actions/functions without prefixing them with the service name.
> - Omit the `()` if no parameter is required.
> - Use query options to provide function parameters like `sue/sum?x=1&y=2`

<br>


**Programmatic** usage via **generic APIs** for Node.js:

For unbound actions and functions:

```ts
async function srv.send (
  event   : string | { event, data?, headers?: object },
  data?   : object | any
)
return : result of this.dispatch(req)
```

For bound actions and functions:

```ts
async function srv.send (
 event   : string | { event, entity, data?, params?: array of object, headers?: object },
 entity  : string,
 data?   : object | any
)
return : result of this.dispatch(req)
```

-  `event` is a name of a custom action or function
-  `entity` is a name of an entity
-  `params` are keys of the entity instance

Programmatic usage would look like this for Node.js:

```js
  const srv = await cds.connect.to('Sue')
  // unbound actions/functions
  await srv.send('sum',{x:1,y:2})
  await srv.send('stock',{id:2})
  await srv.send('add',{x:11,to:2})
  // actions/functions bound to collection
  await srv.send('getStock','Foo',{id:2})
  // for actions/functions bound to entity instance, use this syntax
  await srv.send({ event: 'order', entity: 'Foo', data: {x:3}, params: [{id:2}]})
```

> Note: Always pass the target entity name as second argument for bound actions/functions.

<br>

**Programmatic** usage via **typed API** — Node.js automatically equips generated service instances with specific methods matching the definitions of actions/functions found in the services' model. This allows convenient usage like that:

```js
  const srv = await cds.connect.to(Sue)
  // unbound actions/functions
  srv.sum(1,2)
  srv.stock(2)
  srv.add(11,2)
  // bound actions/functions
  srv.getStock('Foo',2)
  srv.order('Foo',2,3)
```

> Note: Even with that typed APIs, always pass the target entity name as second argument for bound actions/functions.

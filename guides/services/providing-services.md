---
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
---


# Define Provided Services

Services are defined in CDS using the `service` construct. A service definition declares the data entities and operations it serves, typically exposing projections on underlying domain model entities.
{.abstract}


[[toc]]


## Services as APIs

In its most basic form, a service definition simply declares the data entities and operations it serves. For example:

```cds
service BookshopService {

  entity Books {
    key ID : UUID;
    title  : String;
    author : Association to Authors;
  }

  entity Authors {
    key ID : UUID;
    name   : String;
    books  : Association to many Books on books.author = $self;
  }

  action submitOrder (book : Books:ID, quantity : Integer);

}
```

This definition effectively defines the API served by `BookshopService`.

![This graphic is explained in the accompanying text.](./assets/service-apis.drawio.svg)

Simple service definitions like that are all we need to run full-fledged servers out of the box, served by CAP's generic runtimes, without any implementation coding required.

## Services as Facades

In contrast to the all-in-one definition above, services usually expose views, aka projections, on underlying domain model entities:

```cds
using { sap.capire.bookshop as my } from '../db/schema';
service BookshopService {
  entity Books as projection on my.Books;
  entity Authors as projection on my.Authors;
  action submitOrder (book : Books:ID, quantity : Integer);
}
```

This way, services become facades to encapsulated domain data, exposing different aspects tailored to respective use cases.

![This graphic is explained in the accompanying text.](./assets/service-as-facades.drawio.svg)


## Denormalized Views

Instead of exposing access to underlying data in a 1:1 fashion, services frequently expose denormalized views, tailored to specific use cases.

For example, the following service definition, undiscloses information about maintainers from end users and also [marks the entities as `@readonly`](constraints#readonly):

```cds
using { sap.capire.bookshop as my } from '../db/schema';

/** For serving end users */
service CatalogService @(path:'/browse') {

  /** For displaying lists of Books */
  @readonly entity ListOfBooks as projection on Books
  excluding { descr };

  /** For display in details pages */
  @readonly entity Books as projection on my.Books { *,
    author.name as author
  } excluding { createdBy, modifiedBy };

}
```

[Learn more about **CQL** the language used for `projections`.](../../cds/cql){.learn-more}
[See also: Use Case-Oriented Services!](#use-case-oriented-services){.learn-more}
[Find above sources in **capire/bookshop**.](https://github.com/capire/bookshop/blob/main/srv/cat-service.cds){ .learn-more}


## Auto-Exposed Entities

Annotate entities with `@cds.autoexpose` to automatically include them in services containing entities with Association referencing to them.
For example, this is commonly done for code list entities in order to serve Value Lists dropdowns on UIs:

```cds
service Zoo {
  entity Foo { //...
    code : Association to SomeCodeList;
  }
}
@cds.autoexpose entity SomeCodeList {...}
```

[Learn more about Auto-Exposed Entities in the CDS reference docs.](../../cds/cdl#auto-expose){.learn-more}


## Redirected Associations

When exposing related entities, associations are automatically redirected. This ensures that clients can navigate between projected entities as expected. For example:

```cds
service AdminService {
  entity Books as projection on my.Books;
  entity Authors as projection on my.Authors;
  //> AdminService.Authors.books refers to AdminService.Books
}
```

[Learn more about Redirected Associations in the CDS reference docs.](../../cds/cdl#auto-redirect){.learn-more}



## Use Case-oriented Services

We strongly recommend designing your services for single use cases.
Services in CAP are cheap, so there's no need to save on them.


#### **DON'T:**{.bad} Single Services Exposing All Entities 1:1

The anti-pattern to that are single services exposing all underlying entities in your app in a 1:1 fashion. While that may save you some thoughts in the beginning, it's likely that it will result in lots of headaches in the long run:

* They open huge entry doors to your clients with only few restrictions
* Individual use-cases aren't reflected in your API design
* You have to add numerous checks on a per-request basis...
* Which have to reflect on the actual use cases in complex and expensive evaluations


#### **DO:**{.good} One Service Per Use Case

For example, let's assume that we have a domain model defining *Books* and *Authors* more or less as above, and then we add *Orders*. We could define the following services:

```cds
using { my.domain as my } from './db/schema';
```

```cds
/** Serves end users browsing books and place orders */
service CatalogService {
  @readonly entity Books as select from my.Books {
    ID, title, author.name as author
  };
  @requires: 'authenticated-user'
  @insertonly entity Orders as projection on my.Orders;
}
```

```cds
/** Serves registered users managing their account and their orders */
@requires: 'authenticated-user'
service UsersService {
  @restrict: [{ grant: 'READ', where: 'buyer = $user' }] // limit to own ones
  @readonly entity Orders as projection on my.Orders;
  action cancelOrder ( ID:Orders.ID, reason:String );
}
```

```cds
/** Serves administrators managing everything */
@requires: 'authenticated-user'
service AdminService {
  entity Books   as projection on my.Books;
  entity Authors as projection on my.Authors;
  entity Orders  as projection on my.Orders;
}
```

These services serve different use cases and are tailored for each.
Note, for example, that we intentionally don't expose the `Authors` entity
to end users.

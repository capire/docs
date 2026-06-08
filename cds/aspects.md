---
synopsis: >
  Discusses the differences of the mixin-based approach of Aspects to inheritance as known from languages like Java.
status: released
---

# Aspect-Oriented Modeling

The technique of [*Aspects*](cdl#aspects) provides a very powerful means to organize your models in a way that keeps your core domain models concise and comprehensible by factoring out secondary concerns into separate files, defining and reusing common aspects, as well as adapting reused definitions to specific needs.

**See also:** Respective section in [*Five reasons to use CAP*](https://qmacro.org/blog/posts/2024/11/07/five-reasons-to-use-cap/) , and [*Separating concerns and focusing on important stuff*](https://qmacro.org/blog/posts/2024/11/04/separating-concerns-and-focusing-on-the-important-stuff/) blog posts by DJ Adams. {.learn-more}



[[toc]]



## Similar to Aspect-Oriented Programming

Aspect-oriented Modeling as promoted by CDS is very similar in goals and approaches to [Aspect-oriented Programming as defined in this Wikipedia article](https://en.wikipedia.org/wiki/Aspect-oriented_programming):

> *Aspect-oriented programming (AOP) is a programming paradigm that aims to increase modularity by allowing the [separation](https://en.wikipedia.org/wiki/Separation_of_concerns) of [cross-cutting concerns](https://en.wikipedia.org/wiki/Cross-cutting_concern). It does so by adding behavior to existing code (an [advice](https://en.wikipedia.org/wiki/Advice_(programming))) without modifying the code, [...].*

::: tip Extend anything from anywhere

In essence [CDS Aspects](cdl#aspects) allow  you to arbitrarily spread a definition across different places in the same files, or separate ones, in different projects, with different ownerships and different lifecycles.

:::

## Separation of Concerns

Use aspects to factor out secondary concerns into separate files as follows...



### All-in-one Models {.avoid}

Instead of polluting your core domain models with a multitude of annotations, put such annotations into separate files. For example, instead of having a single-source model like that:

::: code-group
```cds [srv/cat-service.cds]
service CatalogService {
  @UI.SelectionFields: [
    ID, price, currency_code
  ]
  @UI.LineItem: [
    { Value: ID, Label: '{i18n>Title}' },
    { Value: author, Label : '{i18n>Author}' },
    { Value: genre.name},
    { Value: price},
    { Value: currency.symbol},
  ]
  @UI.HeaderInfo: {
    TypeName       : '{i18n>Book}',
    TypeNamePlural : '{i18n>Books}',
    Description    : { Value: author }
  }
  @UI.HeaderFacets: [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Description}',
    Target : '@UI.FieldGroup#Descr'
  }]
  @UI.Facets: [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Details}',
    Target : '@UI.FieldGroup#Price'
  }]
  @UI.FieldGroup #Descr : { Data: [{Value : descr}, ]}
  @UI:FieldGroup #Price : { Data: [
    { Value: price},
    { Value: currency.symbol, Label: '{i18n>Currency}' },
  ]}
  entity Books { ... }
  ...
}
```
:::

### Keep Your Core Clean {.prefer}

Rather, keep your core model concise and comprehensible:

::: code-group
```cds [srv/cat-service.cds]
service CatalogService {
  entity Books { ... }
  ...
}
```
:::

### Factor Out Separate Concerns {.prefer}

And factor out the UI concerns into a separate file like that:

::: code-group
```cds [app/fiori-layout.cds]
using { CatalogService } from '../srv/cat-service';

// Annotations for List Pages
annotate CatalogService.Books with @UI:{
  SelectionFields: [
    ID, price, currency_code
  ],
  LineItem: [
    { Value: ID, Label: '{i18n>Title}' },
    { Value: author, Label : '{i18n>Author}' },
    { Value: genre.name},
    { Value: price},
    { Value: currency.symbol},
  ]
}

// Annotations for Object Pages
annotate CatalogService.Books with @UI:{
  HeaderInfo: {
    TypeName       : '{i18n>Book}',
    TypeNamePlural : '{i18n>Books}',
    Description    : { Value: author }
  },
  HeaderFacets: [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Description}',
    Target : '@UI.FieldGroup#Descr'
  }],
  Facets: [{
    $Type  : 'UI.ReferenceFacet',
    Label  : '{i18n>Details}',
    Target : '@UI.FieldGroup#Price'
  }],
  FieldGroup #Descr : { Data: [{Value : descr}, ]},
  FieldGroup #Price : { Data: [
    { Value: price},
    { Value: currency.symbol, Label: '{i18n>Currency}' },
  ]}
}
```
:::





## Common Reuse Aspects


Quite frequently, you want some common aspects to be factored out and shared by and applied to multiple entities. For example, lets assume we'd want to factor out the common aspects of a standardized primary key, managed data, change tracking, extensibility, and temporal data...


### _Max Base Class_ Approach {.avoid}

The classic way to do so, for example in class-based inheritance systems like Java, is to have a central team defining single base classes like `Object` for that, and either add all the aspects in question to that single base class, or have a base class hierarchy, like that:

```cds
abstract entity BusinessObject {
  key ID     : UUID;
  createdAt  : DateTime;
  createdBy  : User;
  modifiedAt : DateTime;
  modifiedBy : User;
  changes    : Composition of many Changes;
  extensions : PredefinedExtensionFields;
}
```
::: details With `Changes` and  `PredefinedExtensionFields` defined like that...

```cds
aspect Changes {
  operation : String enum { CREATED; MODIFIED; DELETED };
  changedAt : DateTime;
  changedBy : User;
  diff : array of {
    element : String;
    old : String;
    new : String;
  };
}
```
```cds
type PredefinedExtensionFields {
  s1 : String;
  s2 : String;
  s3 : String;
  i1 : Integer;
  i2 : Integer;
  dt1 : DateTime;
  ...
}
```

:::

```cds
abstract entity TemporalBO : BusinessObject {
  validFrom  : Date @cds.valid.from;
  validTo    : Date @cds.valid.to;
}
```

Consumers would then use these base classes like that:

```cds
using { BusinessObject, TemporalBO } from 'your-base-classes';
entity Foo : BusinessObject {...}
entity Bar : TemporalBO {...}
```

::: warning Issues with that approach...

One issue is that due to single inheritance limitations, these base classes frequently have to combine several actually independent aspects into one definition, and the consumers have to take them all. Related to that is that these base classes have to depend on each other, which ultimately means they can only be provided and owned by central teams.

:::

::: details `abstract entity` is deprecated...

If you try to use `abstract entity` in CDS, you'll get a warning that it is deprecated.
Reason for that we found it was used mostly for the _'Max Base Class'_ anti pattern.
So we decided to deprecate it to encourage the use of [_Separate Reuse Aspects_](#separate-reuse-aspects) pattern instead.

:::


### Separate Reuse Aspects {.prefer}

While, as shown above, the central single-inheritance-style base class approach is also possible with CDS, we can do better using CDS Aspects, leveraging the equivalent of multiple inheritance, and hence distributed ownership instead of central one:

```cds
aspect cuid { key ID : UUID; }
```

```cds
aspect managed {
  createdAt  : DateTime;
  createdBy  : User;
  modifiedAt : DateTime;
  modifiedBy : User;
}
```

```cds
aspect tracked {
  changes : Composition of many Changes;
}
```

```cds
aspect extensible {
  s1 : String;
  s2 : String;
  s3 : String;
  i1 : Integer;
  i2 : Integer;
  dt1 : DateTime;
  ...
}
```

```cds
aspect temporal {
  validFrom : Date @cds.valid.from;
  validTo   : Date @cds.valid.to;
}
```

[Some of such common reuse aspects are already covered by `@sap/cds/common`.](common) {.learn-more}

Consumers would then flexibly use these reuse aspects like so:

```cds
using { cuid, managed, tracked, extensible, temporal } from 'your-reuse-aspects';
entity Foo : cuid, managed, tracked, extensible {...}
entity Bar : cuid, managed, temporal {...}
```

::: tip Advantages of that approach

Not only does that approach allow clearer separation of concerns, and thus freedom of choice on which combinations of aspects to pick for consumers, it also allows distributed ownership of such reuse aspects, as they don't depend on each other.

:::

::: tip Looks Like Inheritance...

The [`:`-based syntax for includes](cdl#includes) looks very much like (multiple) inheritance and in fact has very much the same effects.
Yet, it is not based on inheritance but on mixins, which are more powerful and also avoid common problems like the infamous diamond shapes in classical inheritance-based approaches.

:::



## Adaptation of Reused Definitions

Assumed there's a reuse package offering some common types and entities which would nicely fit your needs. For example:

::: code-group

```cds [some-reuse-package/index.cds]
entity Currencies : CodeList { key code : String(3); }
entity Countries : CodeList { key code : String(5); }
entity Languages : CodeList { key locale : String(5); }
type CodeList : {
  name : localized String;
}
```

:::

### Adding / Adapting Fields

Now also assumed, you'd want all code lists to have an additional field for long descriptions, and you also want currency symbols, and the `locale` field for languages needs to support values with up to 15 characters. With aspects, you could simply adapt the reuse types and entities accordingly as follows:

::: code-group

```cds [db/common.cds]
using { CodeList, Currencies, Languages } from 'some-reuse-package';
extend CodeList with { descr: localized String }
extend Currencies with { symbol: String(2) }
extend Languages:locale with (length:15);
```

:::

### Adding Relationships

You can even add [Associations](cdl#associations) and [Compositions](cdl#compositions) to definitions you obtained from somewhere else. For example, the following would extend the common reuse type `managed` obtained from `@sap/cds/common` to not only capture latest modifications, but a history of commented changes, with all entities inheriting from that aspect, own or reused ones, receiving this enhancement automatically:

```cds [db/common.cds]
using { User, managed } from '@sap/cds/common';
extend managed with {
  ChangeNotes : Composition of many {
    key timestamp : DateTime;
    author : User;
    note : String(1000);
  }
}
```

[Learn more about  `managed` and `@sap/cds/common`](common) {.learn-more}



### Adding Reuse Aspects

And as the `:` notation to *inherit* an aspect is essentially just [syntactical sugar](cdl#includes) for extending a given definition with a [*named* aspect](cdl#named-aspects), you can also adapt a reused definition to *inherit* from a common reuse aspect from 'the outside' like so:

```cds
using { SomeEntity } from 'some-reuse-package';
using { managed } from '@sap/cds/common';
extend SomeEntity with managed;
```





## Customization, Verticalization

The same approach and techniques are used by SaaS customers when customizing a SaaS application to tailor it to their needs.



### Adding Custom Fields

For example, SaaS customers would quite frequently add extension fields like that:

```cds
using { ShipmentOrders } from 'some-saas-application';
extend ShipmentOrders with {
  carrier : Association to Carriers; // new association
  delayedBy : Time; // new field
}
```

[Learn more about Extensibility](../guides/extensibility/) {.learn-more}



### Overriding Annotations

Sometimes they'd need to override existing annotations, such as for UI labels:

```cds
using { Customers } from 'some-saas-application';
annotate Customers with @title:'Patients'; // e.g. for health care
```



### Verticalization

Verticalization means to adapt a given application for different regions or industries, which can be accomplished by providing respective predefined extension packages and switch them on per customer using [feature toggles](../guides/extensibility/feature-toggles).





## Inheritance Hierarchies

Sometimes you'd be tempted to create deeply nested inheritance hierarchies as you might be used to do in Java. For example, let's assume we're tempted to model something like that:

```cds
abstract entity Grantees { // equivalent to aspect
  key name : String;
}
entity Users : Grantees {
  group : Association to Groups;
}
entity Groups : Grantees {
  members : Composition of many Users on members.group = $self;
}
```

When combining that with relational persistence, you'll always end up in trade-off decisions about which strategy to choose for mapping such class hierarchies to flat tables. As that choice heavily depends on the use cases, CDS intentionally doesn't provide any automatic mapping of such inheritance hierarchies, but you have to choose one of the [three commonly known approaches](https://wiki.c2.com/?MappingInheritanceHierarchiesToRelationalSchemataInvolvesCompromises) explicitly in your models as follows...

### Table Per Leaf Class Strategy {.avoid}

If we'd keep the model as given above, we'd end up with two separate tables, one for each leaf entity. The problem with that approach is that we'd need expensive UNIONs to, for example, display a heterogeneous list of Users and Groups. For example:

```cds
entity UsersAndGroups as (
  SELECT from Users
) UNION ALL (
  SELECT from Groups
);
```



### Table Per Class Strategy {.avoid}

If we want a separate table for each entity in our model above, including the 'superclass' entity `Grantees`, we'd have to rewrite our model to use composition over inheritance like that:

```cds
entity Grantees {
  key name : String;
}
entity Users {
  header : Association to Grantees;
  group : Association to Groups;
}
entity Groups {
  header : Association to Grantees;
  members : Composition of many Users on members.group = $self;
}
```

This would allow you to display heterogeneous lists of `Grantees` without UNIONs. A lot more JOINs would be required in real-world examples, though.



### Single Table Strategy {.prefer}

The third strategy is to put everything into a single table and an additional type discriminator element (→ `kind` in the sample below).

```cds
entity Users {
  key name : String;
  kind : String enum { user; group }; // discriminator
  group : Association to Users;
  members : Composition of many Users on members.group = $self;
}
```

::: tip Advantages

- Simple model
- No UNIONs, no excess JOINs
- Bonus: deeply nested `Groups`

:::

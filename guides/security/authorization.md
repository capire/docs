---
synopsis: >
  This guide explains how to restrict access to data by adding respective declarations to CDS models, which are then enforced by CAP's generic service providers.
uacp: Used as link target from SAP Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
---

<script setup>
  import { h } from 'vue'
  const Y  =  () => h('span', { class: 'y',   title: 'Available' },      ['✓']   )
  const X  =  () => h('span', { class: 'x',   title: 'Available' },      ['✗']   )
  const Na =  () => h('span', { class: 'na',  title: 'Not available' },  ['n/a']   )
</script>
<style scoped>
  .y   { color: var(--green); font-weight:900; }
  .x   { color: var(--red);   font-weight:900; }
  /* .na  { font-weight:500; } */
</style>


# CAP-level Authorization { #authorization }

<ImplVariantsHint />

This guide explains how to restrict access to data by adding respective declarations to CDS models, that are then enforced by CAP's generic service providers.

[[toc]]


## Declarative Access Control { #restrictions}

In essence, [authentication](./authentication#authentication) verifies the user's identity and the presented claims. Briefly, authentication reveals _who_ is using the service.
In contrast, **authorization controls _how_ the user may interact with the application's resources**. 
As access control depends on user information, authentication is a prerequisite for authorization.

![Authorization with CAP](./assets/authorization.drawio.svg){width="450px"}

CAP authorization modeling means restricting user access to application resources in a declarative way.
The decisive point here is that the application logic does not need to contribute any security-critical code for this, but can rely on the generic framework.

There are several ways to define access rules on CDS resources:
- [Static access control](#static-access-control) limits access to CDS services on a general level independently of the request user.
- [Role-based access control](#role-based-access-control) derives resource access rules from roles granted by user administrators.
- [Instance-based access control](#instance-based-auth) allows entity-level filters that usually depend on user criteria.

**By default, CDS services have no access control**, which means that without authorization modeling, authenticated users have access to all entities.

::: warning
**Applications must implement proper authorization.** CAP cannot enforce this automatically as it depends entirely on the specific domain model.
:::

Finally, according to the key concept [Customizable Security](./overview#key-concept-customizable), applications can implement custom authorization logic for exceptional scenarios when declarative approaches are insufficient.


## Static Access Control { #static-access-control }

### Internal Services

CDS services that are only meant for *internal* usage shouldn't be exposed via protocol adapters. 
To prevent access from *any* external clients, annotate those services with `@protocol: 'none'`:

```cds
@protocol: 'none'
service InternalService {
  ...
}
```
`InternalService` can only receive events sent by in-process handlers.


### @readonly and @insertonly { #restricting-events}

Annotate entities with `@readonly` or `@insertonly` to statically restrict allowed operations for **all** users as demonstrated in the example:

```cds
service BookshopService {
  @readonly entity Books {...}
  @insertonly entity Orders {...}
}
```

Note that both annotations introduce access control on an entity level. In contrast, for the sake of [input validation](../services/constraints), you can also use `@readonly` on a property level.

In addition, annotation `@Capabilities` from standard OData vocabulary is enforced by the runtimes analogously:

```cds
service SomeService {
  @Capabilities: {
    InsertRestrictions.Insertable: true,
    UpdateRestrictions.Updatable: true,
    DeleteRestrictions.Deletable: false
  }
  entity Foo { key ID : UUID }
}
```

#### Events to Auto-Exposed Entities { #events-and-auto-expose}

In general, entities can be exposed in services in different ways: they can be **explicitly exposed** by the modeler (for example, by a projection), or they can be [**auto-exposed**](../../cds/cdl#auto-exposed-entities) by the CDS compiler for some reason.
Access to auto-exposed entities needs to be controlled in a specific way. Consider the following example:

```cds
context db {
  @cds.autoexpose
  entity Categories : cuid { // explicitly auto-exposed (by @cds.autoexpose)
    ...
  }

  entity Issues : cuid { // implicitly auto-exposed (by composition in Components)
    category: Association to Categories;
    ...
  }

  entity Components : cuid { // explicitly exposed (by projection in IssuesService)
    issues: Composition of many Issues;
    ...
  }
}

service IssuesService {
  entity Components as projection on db.Components;
}
```

As a result, the `IssuesService` service actually exposes *all* three entities from the `db` context:
* `db.Components` is explicitly exposed due to the projection in the service.
* `db.Issues` is implicitly auto-exposed by the compiler as it is a composition entity of `Components`.
* `db.Categories` is explicitly auto-exposed due to the `@cds.autoexpose` annotation.

In general, **implicitly auto-exposed entities cannot be accessed directly**, which means only access via a navigation path (starting from an explicitly exposed entity) is allowed.

In contrast, **explicitly auto-exposed entities can be accessed directly, but only as `@readonly`**. The rationale behind that is that entities representing value lists need to be readable at the service level, for instance to support value help lists.

See details about `@cds.autoexpose` in [Auto-Exposed Entities](../services/providing-services#auto-exposed-entities).

This results in the following access matrix:

| Request                                                | `READ` | `WRITE` |
|--------------------------------------------------------|:------:|:-------:|
| `IssuesService.Components`                             |  <Y/>  |  <Y/>   |
| `IssuesService.Issues`                                 |  <X/>  |  <X/>   |
| `IssuesService.Categories`                             |  <Y/>  |  <X/>   |
| `IssuesService.Components[<id>].issues`                |  <Y/>  |  <Y/>   |
| `IssuesService.Components[<id>].issues[<id>].category` |  <Y/>  |  <X/>   |

::: tip
CodeLists such as `Languages`, `Currencies`, and `Countries` from `sap.common` are annotated with `@cds.autoexpose` and so are explicitly auto-exposed.
:::

## Role-Based Access Control { #role-based-access-control }

To protect resources according to your business needs, you can declaratively restrict access according to a [CAP role](./cap-users#roles) by adding [@requires](#requires) or [@restrict](#restrict-annotation) annotations. 

Restrictions can be defined on *different CDS resources*:

- Services
- Entities
- (Un)bound actions and functions

You can influence the scope of a restriction by choosing an adequate hierarchy level in the CDS model. 
For instance, a restriction on the service level applies to all entities in the service. 
Additional restrictions on entities or actions can further limit authorized requests. 
See [combined restrictions](#combined-restrictions) for more details.

Beside the scope, restrictions can limit access to resources with regards to *different dimensions*:

- The [event](#restricting-events) of the request, that is, the type of the operation (what?)
- The [roles](cap-users#roles) of the user (who?)
- [Filter-condition](#instance-based-auth) on instances to operate on (which?)

### @requires { #requires}

You can use the `@requires` annotation to control which (pseudo-)role a user requires to access a resource:

```cds
annotate BrowseBooksService with @(requires: 'authenticated-user');
annotate ShopService.Books with @(requires: ['Vendor', 'ProcurementManager']);
annotate ShopService.ReplicationAction with @(requires: 'system-user');
```

In this example, the `BrowseBooksService` service is open for authenticated but not for anonymous users. A user who has the `Vendor` _or_ `ProcurementManager` role is allowed to access the `ShopService.Books` entity. Unbound action `ShopService.ReplicationAction` can only be triggered by a technical user.
::: tip
When restricting service access through `@requires`, the service's metadata endpoints (that is, `/$metadata` as well as the service root `/`) are restricted by default as well. If you require public metadata, you can disable the check with [a custom express middleware](../../node.js/cds-serve#add-mw-pos) using the [privileged user](../../node.js/authentication#privileged-user) (Node.js) or through config <Config java>cds.security.authentication.authenticateMetadataEndpoints = false</Config> (Java), respectively. Please be aware that the `/$metadata` endpoint is *not* checking for authorizations implied by `@restrict` annotation.
:::


### @restrict { #restrict-annotation}

You can use the `@restrict` annotation to define authorizations on a fine-grained level. In essence, all kinds of restrictions that are based on static user roles, the request operation, and instance filters can be expressed by this annotation.<br>
The building block of such a restriction is a single **privilege**, which has the general form:

<!-- cds-mode: ignore -->
```cds
{ grant:<events>, to:<roles>, where:<filter-condition> }
```

whereas the properties are:

* `grant`: one or more events that the privilege applies to
* `to`: one or more [user roles](cap-users#roles) that the privilege applies to (optional)
* `where`: a filter condition that further restricts access on an instance level (optional).

The following values are supported:
- `grant` accepts all standard [CDS events](../../get-started/concepts#events) (such as `READ`, `CREATE`, `UPDATE`, and `DELETE`) as well as action and function names. `WRITE` is a virtual event for all standard CDS events with write semantic (`CREATE`, `DELETE`, `UPDATE`, `UPSERT`) and `*` is a wildcard for all events.

- The `to` property lists all [user roles](cap-users#roles) or [pseudo roles](cap-users#pseudo-roles) that the privilege applies to. Note that the `any` pseudo-role applies for all users and is the default if no value is provided.

- The `where`-clause can contain a Boolean expression in [CQL](../../cds/cql)-syntax that filters the instances that the event applies to. As it allows user values (name, attributes, etc.) and entity data as input, it's suitable for *dynamic authorizations based on the business domain*. Supported expressions and typical use cases are presented in [instance-based authorization](#instance-based-auth).

A privilege is met, if and only if **all properties are fulfilled** for the current request. In the following example, orders can only be read by an `Auditor` who meets `AuditBy` element of the instance:

```cds
entity Orders @(restrict: [
    { grant: 'READ', to: 'Auditor', where: (AuditBy = $user) }
  ]) {/*...*/}
```

If a privilege contains several events, only one of them needs to match the request event to comply with the privilege. The same holds, if there are multiple roles defined in the `to` property:

```cds
entity Reviews @(restrict: [
    { grant:['READ', 'WRITE'], to: ['Reviewer', 'Customer'] }
  ]) {/*...*/}
```

In this example, all users that have the `Reviewer` *or* `Customer` role can read *or* write to `Reviews`.

You can build restrictions based on *multiple privileges*:

```cds
entity Orders @(restrict: [
    { grant: ['READ','WRITE'], to: 'Admin' },
    { grant: 'READ', where: (buyer = $user) }
  ]) {/*...*/}
```

A request passes such a restriction **if at least one of the privileges is met**. In this example, `Admin` users can read and write the `Orders` entity. But a user can also read all orders that have a `buyer` property that matches the request user.

Similarly, the filter conditions of matched privileges are combined with logical OR:

```cds
entity Orders @(restrict: [
    { grant: 'READ', to: 'Auditor', where: (country = $user.country) },
    { grant: ['READ','WRITE'], where: (CreatedBy = $user) },
  ]) {/*...*/}
```

Here an `Auditor` user can read all orders with matching `country` or that they have created.

> Annotations such as @requires or @readonly are just convenience shortcuts for @restrict, for example:
   - `@requires: 'Viewer'` is equivalent to `@restrict: [{grant:'*', to: 'Viewer'}]`
   - `@readonly` is the same as `@restrict: [{ grant:'READ' }]`



#### Supported Combinations with CDS Resources

Restrictions can be defined on different types of CDS resources, but there are some limitations with regards to supported privileges:

| CDS Resource    | `grant` | `to` |      `where`      | Remark        |
|-----------------|:-------:|:----:|:-----------------:|---------------|
| service         |  <Na/>  | <Y/> |       <Na/>       | = `@requires` |
| entity          |  <Y/>   | <Y/> | <Y/><sup>1</sup>  |               |
| action/function |  <Na/>  | <Y/> | <Na/><sup>2</sup> | = `@requires` |

> <sup>1</sup>For bound actions and functions that are not bound against a collection, Node.js supports instance-based authorization at the entity level, see [link] (somewhere in Node.js docs)<br>
> <sup>2</sup> For unbound actions and functions, Node.js supports simple static expressions that *don't have any reference to the model*, such as `where: $user.level = 2`.

Unsupported privilege properties are ignored by the runtime. Especially, for bound or unbound actions, the `grant` property is implicitly removed (assuming `grant: '*'` instead). The same also holds for functions:

::: code-group
```cds [Model w/ unsupported privilege properties]
service CatalogService {
  entity Products as projection on db.Products { ... }
  actions {
    @(requires: 'Admin')
    action addRating (stars: Integer);
  }
  function getViewsCount @(restrict: [{ grant: 'READ' to: 'Admin' }]) () returns Integer;
}
```
```cds [Resulting model]
service CatalogService {
  entity Products as projection on db.Products { ... }
  actions {
    @(requires: 'Admin') // is already in implicit {grant: '*'}
    action addRating (stars: Integer);
  }
   //unsupported property is removed, means implicit { grant: '*'}
  function getViewsCount @(restrict: [{ to: 'Admin' }]) () returns Integer; 
}

```
:::


### Combined Restrictions { #combined-restrictions}

Restrictions can be defined on different levels in the CDS model hierarchy. Bound actions and functions refer to an entity, which in turn refers to a service. Unbound actions and functions refer directly to a service. As a general rule, **all authorization checks of the hierarchy need to be passed** (logical AND).
This is illustrated in the following example:

```cds
service CustomerService @(requires: 'authenticated-user') {
  entity Products @(restrict: [
    { grant: 'READ' },
    { grant: 'WRITE', to: 'Vendor' },
    { grant: 'addRating', to: 'Customer'}
  ]) {/*...*/}
  actions {
     action addRating (stars: Integer);
  }
  entity Orders @(restrict: [
    { grant: '*', to: 'Customer', where: (CreatedBy = $user) }
  ]) {/*...*/}
  action monthlyBalance @(requires: 'Vendor') ();
}
```

> The privilege for the `addRating` action is defined on an entity level.


The resulting authorizations are illustrated in the following access matrix:

| Operation                            | `Vendor` |    `Customer`    | `authenticated-user` | not authenticated |
|--------------------------------------|:--------:|:----------------:|:--------------------:|-------------------|
| `CustomerService.Products` (`READ`)  |   <Y/>   |       <Y/>       |         <Y/>         | <X/>              |
| `CustomerService.Products` (`WRITE`) |   <Y/>   |       <X/>       |         <X/>         | <X/>              |
| `CustomerService.Products.addRating` |   <X/>   |       <Y/>       |         <X/>         | <X/>              |
| `CustomerService.Orders` (*)         |   <X/>   | <Y/><sup>1</sup> |         <X/>         | <X/>              |
| `CustomerService.monthlyBalance`     |   <Y/>   |       <X/>       |         <X/>         | <X/>              |

> <sup>1</sup> A `Vendor` user can only access the instances that they created. <br>

The example models access rules for different roles in the same service. In general, this is _not recommended_ due to the high complexity. See [best practices](#dedicated-services) for information about how to avoid this.

### Propagation of Restrictions { #propagated-restrictions }

Service entities inherit the restriction from the database entity, on which they define a projection.
An explicit restriction defined on a service entity *replaces* inherited restrictions from the underlying entity.

Entity `Books` on a database level:

```cds
namespace db;
entity Books @(restrict: [
  { grant: 'READ', to: 'Buyer' },
]) {/*...*/}
```

Services `BuyerService` and `AdminService` on a service level:

```cds
service BuyerService @(requires: 'authenticated-user'){
  entity Books as projection on db.Books; /* inherits */
}

service AdminService @(requires: 'authenticated-user'){
  entity Books @(restrict: [
    { grant: '*', to: 'Admin'} /* overrides */
  ]) as projection on db.Books;
}
```

| Events                        | `Buyer` | `Admin` | `authenticated-user` |
|-------------------------------|:-------:|:-------:|:--------------------:|
| `BuyerService.Books` (`READ`) |  <Y/>   |  <X/>   |         <X/>         |
| `AdminService.Books` (`*`)    |  <X/>   |  <Y/>   |         <X/>         |

::: tip
We recommend defining restrictions on a database entity level only in exceptional cases. Inheritance and override mechanisms can lead to an unclear situation.
:::

::: warning _Warning_ <!--  -->
A service level entity can't inherit a restriction with a `where` condition that doesn't match the projected entity. The restriction has to be overridden in this case.
:::


### Draft Mode {#restrictions-and-draft-mode}

Basically, the access control for entities in draft mode differs from the [general restriction rules](#restrict-annotation) that apply to (active) entities. A user, who has created a draft, should also be able to edit (`UPDATE`) or cancel the draft (`DELETE`). The following rules apply:

- If a user has the privilege to create an entity (`CREATE`), he or she also has the privilege to create a **new** draft entity and update, delete, and activate it.
- If a user has the privilege to update an entity (`UPDATE`), he or she also has the privilege to **put it into draft mode** and update, delete, and activate it.
- Draft entities can only be edited by the creator user.
  + In the Node.js runtime, this includes calling bound actions/functions on the draft entity.

::: tip
As a result of the derived authorization rules for draft entities, you don't need to take care of draft events when designing the CDS authorization model.
:::

### Auto-Exposed and Generated Entities { #autoexposed-restrictions}

In general, **a service actually exposes more than the explicitly modeled entities from the CDS service model**. This stems from the fact that the compiler auto-exposes entities for the sake of completeness, for example, by adding composition entities. Another reason is generated entities for localization or draft support that need to appear in the service. Typically, such entities don't have restrictions. The emerging question is, how can requests to these entities be authorized?

For illustration, let's extend the service `IssuesService` from [Events to Auto-Exposed Entities](#events-and-auto-expose) by adding a restriction to `Components`:

```cds
annotate IssuesService.Components with @(restrict: [
  { grant: '*', to: 'Supporter' },
  { grant: 'READ', to: 'authenticated-user' } ]);
```
Basically, users with the `Supporter` role aren't restricted, whereas authenticated users can only read the `Components`. But what about the auto-exposed entities such as `IssuesService.Issues` and `IssuesService.Categories`? They could be a target of an (indirect) request as outlined in [Events to Auto-Exposed Entities](#events-and-auto-expose), but none of them are annotated with a concrete restriction. In general, the same also holds for service entities that are generated by the compiler, for example, for localization or draft support.

To close the gap with auto-exposed and generated entities, the authorization of such entities is delegated to a so-called **authorization entity**, which is the last entity in the request path, that bears authorization information, that means, that fulfills at least one of the following properties:
- Explicitly exposed in the service
- Annotated with a concrete restriction
- Annotated with `@cds.autoexpose`

So, the authorization for the requests in the example is delegated as follows:

| Request Target                                         |          Authorization Entity          |
|--------------------------------------------------------|:--------------------------------------:|
| `IssuesService.Components`                             | `IssuesService.Components`<sup>3</sup> |
| `IssuesService.Issues`                                 |           <Na/><sup>1</sup>            |
| `IssuesService.Categories`                             | `IssuesService.Categories`<sup>2</sup> |
| `IssuesService.Components[<id>].issues`                | `IssuesService.Components`<sup>3</sup> |
| `IssuesService.Components[<id>].issues[<id>].category` | `IssuesService.Categories`<sup>2</sup> |

> <sup>1</sup> Request is rejected.<br>
> <sup>2</sup> `@readonly` due to `@cds.autoexpose`<br>
> <sup>3</sup> According to the restriction. `<id>` is relevant for instance-based filters.



## Instance-Based Access Control { #instance-based-auth }

The [restrict annotation](#restrict-annotation) for an entity allows you to enforce authorization checks that statically depend on the event type and user roles. 
In addition, you can define a `where`-condition that further limits the set of accessible instances. 
This condition, that acts like a filter, establishes *instance-based authorization*.

### Filter Conditions

For instance, a user is allowed to read or edit `Orders` (defined with the `managed` aspect) that they have created:

```cds
annotate Orders with @(restrict: [
  { grant: ['READ', 'UPDATE', 'DELETE'], where: (CreatedBy = $user) } ]);
```

Or a `Vendor` can only edit articles on stock (that means `Articles.stock` positive):

```cds
annotate Articles with @(restrict: [
  { grant: ['UPDATE'], to: 'Vendor',  where: (stock > 0) } ]);
```

::: tip
Filter conditions declared as **compiler expressions** ensure validity at compile time and therefore strengthen security.
:::

The condition defined in the `where` clause typically associates domain data with static [user claims](cap-users#claims). 
Basically, it *either filters the result set in queries or accepts only write operations on instances that meet the condition*. 
This means that, the condition applies to following standard CDS events only:
- `READ` (as result filter)
- `UPDATE` (as reject condition)
- `DELETE` (as reject condition)

<div class="impl java">

In addition, the runtime [checks the filter condition of the input data](#input-data-auth) for following standard CDS events:
- `CREATE` (input filter)
- `UPDATE` (input filer)

</div>

You can define filter conditions in the `where`-clause of restrictions based on [CQL](/cds/cql)-predicates, declared as [compiler expressions](../../cds/cdl#expressions-as-annotation-values):

* Predicates with arithmetic operators.
* Combining predicates to expressions with `and` and `or` logical operators.
* Value references to constants, [user attributes](#user-attrs), and entity data (elements including [association paths](#association-paths))
* [Exists predicate](#exists-predicate) based on subselects.

<div class="impl java">

* [Exists with a subquery](#exists-subquery) for access to ACL like entities.

</div>


At runtime you'll find filter predicates attached to the appropriate CQN queries matching the instance-based condition.

:::warning Modification of Statements
Be careful when you modify or extend the statements in custom handlers.
Make sure you keep the filters for authorization.
:::



#### User Attributes { #user-attrs}

To refer to attribute values from the user claim, prefix the attribute name with '`$user.`' as outlined in [static user claims](cap-users#claims). For instance, `$user.country` refers to the attribute with the name `country`.

In general, `$user.<attribute>` contains a **list of attribute values** that are assigned to the user. The following rules apply:
* A predicate in the `where` clause evaluates to `true` if one of the attribute values from the list matches the condition.
* An empty (or not defined) list means that the user is fully restricted with regard to this attribute (that is, the predicate evaluates to `false`).

For example, the condition `where: $user.country = countryCode` will grant a user with attribute values `country = ['DE', 'FR']` access to entity instances that have `countryCode = DE` _or_ `countryCode = FR`. In contrast, the user has no access to any entity instances if the value list of country is empty or the attribute is not available at all.

##### Unrestricted XSUAA Attributes

By default, all attributes defined in [XSUAA instances](./cap-users#xsuaa-roles) require a value (`valueRequired:true`), which is well-aligned with the CAP runtime that enforces restrictions on empty attributes.
If you explicitly want to offer unrestricted attributes to customers, you need to do the following:

1. Switch your XSUAA configuration to `valueRequired:false`
2. Adjust the filter-condition accordingly, for example: `where: $user.country = countryCode or $user.country is null`.
  > If `$user.country` is undefined or empty, the overall expression evaluates to `true`, reflecting the unrestricted attribute.

::: warning
Refrain from unrestricted XSUAA attributes as they need to be designed very carefully as shown in the following example.
:::

Consider this bad example with *unrestricted* attribute `country` (assuming `valueRequired:false` in XSUAA configuration):

```cds
service SalesService @(requires: ['SalesAdmin', 'SalesManager']) {
  entity SalesOrgs @(restrict: [
     { grant: '*',
       to: ['SalesAdmin', 'SalesManager'],
       where: ($user.country = countryCode or $user.country is null) } ]) {
     countryCode: String; /*...*/
  }
}
```

Let's assume a customer creates XSUAA roles `SalesManagerEMEA` with dedicated values (`['DE', 'FR', ...]`) and `SalesAdmin` with *unrestricted* values.
As expected, a user assigned only to `SalesAdmin` has access to all `SalesOrgs`. But when role `SalesManagerEMEA` is added, *only* EMEA organizations are accessible suddenly!

The preferred way is to model with restricted attribute `country` (`valueRequired:true`) and an additional grant:
```cds
service SalesService @(requires: ['SalesAdmin', 'SalesManager']) {
  entity SalesOrgs @(restrict: [
     { grant: '*',
       to: 'SalesManager',
       where: ($user.country = countryCode) },
     { grant: '*',
       to: 'SalesAdmin' } ]) {
     countryCode: String; /*...*/
  }
}
```

#### Exists Predicate { #exists-predicate }

In many cases, the authorization of an entity needs to be derived from entities reachable via association path. See [domain-driven authorization](#domain-driven-authorization) for more details.
You can leverage the `exists` predicate in `where` conditions to define filters that directly apply to associated entities defined by an association path:

```cds
service ProjectService @(requires: 'authenticated-user') {
  entity Projects @(restrict: [
     { grant: ['READ', 'WRITE'],
       where: (exists members[userId = $user and role = 'Editor']) } ]) {
    members: Association to many Members; /*...*/
  }
  @readonly entity Members {
    key userId  : User;
    key role: String enum { Viewer; Editor; }; /*...*/
  }
}
```

In the `ProjectService` example, only projects for which the current user is a member with role `Editor` are readable and editable. Note that with exception of the user ID (`$user`) **all authorization information originates from the business data**.

Supported features of `exists` predicate:
* Combine with other predicates in the `where` condition (`where: 'exists a1[...] or exists a2[...]`).
* Define recursively (`where: 'exists a1[exists b1[...]]`).
* Use target paths (`where: 'exists a1.b1[...]`).
* Usage of [user attributes](#user-attrs).
::: warning
Paths *inside* the filter (`where: (exists a1[b1.c = ...])`) are not yet supported.
:::

<!--  * Note that in the Node.js stack, variant `a1[b1.c = ...]` only works on SAP HANA (as `b1.c` is a path expression).  -->


The following example demonstrates the last two features:


```cds
service ProductsService @(requires: 'authenticated-user') {
 entity Products @(restrict: [
   { grant: '*',
     where: (exists producers.division[$user.division = name])}]): cuid {
    producers : Association to many ProducingDivisions
                on producers.product = $self;
  }
  @readonly entity ProducingDivisions {
    key product : Association to Products;
    key division : Association to Divisions;
  }
  @readonly entity Divisions : cuid {
    name : String;
    producedProducts : Association to many ProducingDivisions
                       on producedProducts.division = $self;
  }
}
```

Here, the authorization of `Products` is derived from `Divisions` by leveraging the *n:m relationship* via entity `ProducingDivisions`. Note that the path `producers.division` in the `exists` predicate points to target entity `Divisions`, where the filter with the user-dependent attribute `$user.division` is applied.

::: warning Consider Access Control Lists
Be aware that deep paths might introduce a performance bottleneck. Access Control List (ACL) tables, managed by the application, allow efficient queries and might be the better option in this case.
:::


### Association Paths { #association-paths}

The `where`-condition in a restriction can also contain [CQL path expressions](../../cds/cql#path-expressions) that navigate to elements of associated entities:

```cds
service SalesOrderService @(requires: 'authenticated-user') {
  entity SalesOrders @(restrict: [
     { grant: 'READ',
       where: (product.productType = $user.productType) } ]) {
    product: Association to one Products;
  }
  entity Products {
    productType: String(32); /*...*/
  }
}
```

Paths on 1:n associations (`Association to many`) evaluate to `true`, _if the condition selects at most one associated instance_ (`exists` semantic).


<div class="impl java">

<div id="exists-subquery" />

</div>


### Checking Input Data { #input-data-auth .java}

Input data of `CREATE` and `UPDATE` events is also validated with regards to instance-based authorization conditions.
Invalid input that does not meet the condition is rejected with response code `400`.

Let's assume an entity `Orders` that restricts access to users classified by assigned accounting areas:

```cds
annotate Orders with @(restrict: [
  { grant: '*', where: 'accountingArea = $user.accountingAreas' } ]);
```

A user with accounting areas `[Development, Research]` is not able to send an `UPDATE` request, that changes `accountingArea` from `Research` or `Development` to `CarFleet`, for example.
Note that the `UPDATE` on instances _not matching the request user's accounting areas_ (for example, `CarFleet`) are rejected by standard instance-based authorization checks.

Starting with CAP Java `4.0`, deep authorization is active by default.
It can be disabled by setting <Config java>cds.security.authorization.instanceBased.checkInputData: false</Config>.


### Rejected Entity Selection { #reject-403 .java}

Entities that have an instance-based authorization condition, that is [`@restrict.where`](/guides/security/authorization#restrict-annotation),
are guarded by the CAP Java runtime by adding a filter condition to the DB query **excluding not matching instances from the result**.
Hence, if the user isn't authorized to query an entity, requests targeting a *single* entity return *404 - Not Found* response and not *403 - Forbidden*.

To allow the UI to distinguish between *not found* and *forbidden*, CAP Java can detect this situation and rejects `UPDATE` and `DELETE` requests to single entities with forbidden accordingly.
The additional authorization check might affect performance.

::: warning Avoid enumerable keys
To avoid disclosure of the existence of such entities to unauthorized users, make sure that the key is not efficiently enumerable or add custom code to overrule the default behavior otherwise.
:::

Starting with CAP Java `4.0`, the reject behaviour is active by default.
It can be disabled by setting <Config java>cds.security.authorization.instance-based.reject-selected-unauthorized-entity.enabled: false</Config>.



## Limitations {.node}

Currently, the security annotations **are only evaluated on the target entity of the request**. 
Restrictions on associated entities touched by the operation are not regarded. 
This has the following implications:
- Restrictions of (recursively) expanded or inlined entities of a `READ` request aren't checked.
- Deep inserts and updates are checked on the root entity only.

See [solution sketches](#limitation-deep-authorization) for information about how to deal with that.


## Deep Authorizations { #deep-auth .java}

### Associations

Queries to Application Services are not only authorized by the target entity that has a `@restrict` or `@requires` annotation, but also for all __associated entities__ that are used in the statement.
For instance, consider the following model:

```cds
@(restrict: [{ grant: 'READ', to: 'Manager' }])
entity Books {...}

@(restrict: [{ grant: 'READ', to: 'Manager' }])
entity Orders {
  key ID: String;
  items: Composition of many {
    key book: Association to Books;
    quantity: Integer;
  }
}
```

For the following OData request `GET Orders(ID='1')/items?$expand=book`, authorizations for `Orders` and for `Books` are checked.
If the entity `Books` has a `where` clause for instance-based authorization, it will be added as a filter to the sub-request with the expand.

Custom CQL statements submitted to the [Application Service](../../java/cqn-services/application-services) instances are also authorized by the same rules including the path expressions and subqueries used in them.

For example, the following statement checks role-based authorizations for both `Orders` and `Books`,
because the association to `Books` is used in the select list.

```java
Select.from(Orders_.class,
    f -> f.filter(o -> o.ID().eq("1")).items())
  .columns(c -> c.book().title());
```

For modification statements with associated entities used in infix filters or where clauses,
role-based authorizations are checked as well. 
Associated entities require `READ` authorization, in contrast to the target of the statement itself.

The following statement requires `UPDATE` authorization on `Orders` and `READ` authorization on `Books`
because an association from `Orders.items` to the book is used in the where condition.

```java
Update.entity(Orders_.class, f -> f.filter(o -> o.ID().eq("1")).items())
  .data("quantity", 2)
  .where(t -> t.book().ID().eq(1));
```
Starting with CAP Java `4.0`, deep authorization is active by default.
It can be disabled by setting <Config java>cds.security.authorization.deep.enabled: false</Config>.


### Compositions

Restrictions on associated composition entities touched by the request are **not** regarded by the runtime.
The rational behind that is that authorization rules are [implicitly defined by the root entity of the document](#autoexposed-restrictions) and therefore security annotations **of the composition root entity are evaluated**.

This has the following implications:
- Restrictions of (recursively) expanded or inlined entities of a `READ` request aren't checked.
- Deep `INSERT`s and `UPDATE`s are checked on the root entity only.

::: warning
**Restrictions on compositions are not checked by the runtime**.
If you model dedicated restriction rules on child entity level, you need to add custom authorization handlers accordingly.
:::




## Best Practices

CAP authorization allows you to control access to your business data on a fine granular level. But keep in mind that the high flexibility can end up in security vulnerabilities if not applied appropriately. In this perspective, lean and straightforward models are preferred. When modeling your access rules, the following recommendations can support you to design such models.

### Choose Conceptual Roles

When defining user roles, one of the first options could be to align roles to the available *operations* on entities, which results in roles such as `SalesOrders.Read`, `SalesOrders.Create`, `SalesOrders.Update`, and `SalesOrders.Delete`.

What is the problem with this approach? Think about the resulting number of roles that the user administrator has to handle when assigning them to business users. The administrator would also have to know the domain model precisely and understand the result of combining the roles. Similarly, assigning roles to operations only (`Read`, `Create`, `Update`, ...) typically doesn't fit your business needs.<br>
We strongly recommend defining roles that describe **how a business user interacts with the system**. Roles like `Vendor`, `Customer`, or `Accountant` can be appropriate. With this approach, you as the application developer define the set of accessible resources in the CDS model for each role - and not the user administrator.

### Prefer Single-Purposed, Use-Case Specific Services { #dedicated-services}

Have a closer look at this example:

```cds
service CatalogService @(requires: 'authenticated-user') {
   entity Books @(restrict: [
    { grant: 'READ' },
    { grant: 'WRITE', to: 'Vendor', where: ($user.publishers = publisher) },
    { grant: 'WRITE', to: 'Admin' } ])
  as projection on db.Books;
  action doAccounting @(requires: ['Accountant', 'Admin']) ();
}
```

Four different roles (`authenticated-user`, `Vendor`, `Accountant`, `Admin`) *share* the same service - `CatalogService`. As a result, it's confusing how a user can use `Books` or `doAccounting`. Considering the complexity of this small example (4 roles, 1 service, 2 resources), this approach can introduce a security risk, especially if the model is larger and subject to adaptation. Moreover, UIs defined for this service will likely appear unclear as well.<br>
The fundamental purpose of services is to expose business data in a specific way. Hence, the more straightforward way is to **use a service for each role**:

```cds
@path:'browse'
service CatalogService @(requires: 'authenticated-user') {
  @readonly entity Books
  as select from db.Books { title, publisher, price };
}

@path:'internal'
service VendorService @(requires: 'Vendor') {
  entity Books @(restrict: [
    { grant: 'READ' },
    { grant: 'WRITE', to: 'vendor', where: ($user.publishers = publisher) } ])
  as projection on db.Books;
}

@path:'internal'
service AccountantService @(requires: 'Accountant') {
  @readonly entity Books as projection on db.Books;
  action doAccounting();
}
/*...*/
```
::: tip
You can tailor the exposed data according to the corresponding role, even on the level of entity elements like in `CatalogService.Books`.
:::

### Prefer Dedicated Actions for Specific Use-Cases { #dedicated-actions}

In some cases it can be helpful to restrict entity access as much as possible and create actions with dedicated restrictions for specific use cases, like in the following example:

```cds
service GitHubRepositoryService @(requires: 'authenticated-user') {
  @readonly entity Organizations as projection on GitHub.Organizations actions {
    @(requires: 'Admin') action rename(newName : String);
    @(requires: 'Admin') action delete();
  };
}
```

This service allows querying organizations for all authenticated users. In addition, `Admin` users are allowed to rename or delete.

Granting `UPDATE` to `Admin` would allow administrators to change organization attributes that are not meant to change.

### Think About Domain-Driven Authorization { #domain-driven-authorization}

Static roles often don't fit into an intuitive authorization model. Instead of making authorization dependent on static properties of the user, it's often more appropriate to derive access rules from the business domain. For instance, all users assigned to a department (in the domain) are allowed to access the data of the organization comprising the department. Relationships in the entity model (for example, a department assignment to organization) influence authorization rules at runtime. In contrast to static user roles, **dynamic roles** are fully domain-driven.

Revisit the [ProjectService example](#exists-predicate), which demonstrates how to leverage instance-based authorization to induce dynamic roles.

Advantages of dynamic roles are:
- The most flexible way to define authorizations
- Authorizations induced according to business domain
- Application-specific authorization model and intuitive UIs
- Decentralized role management for application users (no central user administrator required)

Drawbacks to be considered are:
- Additional effort for modeling and designing application-specific role management (entities, services, UI)
- Potentially higher security risk due to lower use of framework functionality
- Sharing authorization management with other (non-CAP) applications is harder to achieve
- Dynamic role enforcement can introduce a performance penalty


### Control Exposure of Associations and Compositions { #limitation-deep-authorization}

Note that exposed associations (and compositions) can disclose unauthorized data. Consider the following scenario:

```cds
namespace db;
entity Employees : cuid { // autoexposed!
  name: String(128);
  team: Association to Teams;
  contract: Composition of Contracts;
}
entity Contracts @(requires:'Manager') : cuid { // autoexposed!
  salary: Decimal;
}
entity Teams : cuid {
  members: Composition of many Employees on members.team = $self;
}


service ManageTeamsService @(requires:'Manager') {
  entity Teams as projection on db.Teams;
}

service BrowseEmployeesService @(requires:'Employee') {
  @readonly entity Teams as projection on db.Teams; // navigate to Contracts!
}
```

A team (entity `Teams`) contains members of type `Employees`. An employee refers to a single contract (entity `Contracts`) that contains sensitive information that should be visible only to `Manager` users.

`Employee` users should be able to browse the teams and their members but are not allowed to read or even edit their contracts.<br>
As `db.Employees` and `db.Contracts` are auto-exposed, managers can navigate to all instances through the `ManageTeamsService.Teams` service entity (for example, OData request `/ManageTeamsService/Teams?$expand=members($expand=contract)`).<br> It's important to note that this also holds for an `Employee` user, as **only the target entity** `BrowseEmployeesService.Teams` **has to pass the authorization check in the generic handler, and not the associated entities**.<br>

To solve this security issue, introduce a new service entity `BrowseEmployeesService.Employees` that removes the navigation to `Contracts` from the projection:

```cds
service BrowseEmployeesService @(requires:'Employee') {
  @readonly entity Employees
  as projection on db.Employees excluding { contracts }; // hide contracts!

  @readonly entity Teams as projection on db.Teams;
}
```

Now, an `Employee` user cannot expand the contracts as the composition is not reachable anymore from the service.
::: tip
Associations without navigation links (for example, when you don't expose an associated entity) are still critical with regard to security.
:::

### Design Authorization Models from the Start

As shown before, defining an adequate authorization strategy has a deep impact on the service model. Apart from the fundamental decision of whether you want to build your authorizations on [dynamic roles](#domain-driven-authorization), authorization requirements can result in completely rearranging service and entity definitions.

For this reason, it's *strongly* recommended to take security design into consideration at an early stage of your project.

### Keep it as Simple as Possible

* If different authorizations are needed for different operations, it's easier to have them defined at the service level. If you start defining them at the entity level, all possible operations must be specified; otherwise, the operations not mentioned are automatically forbidden.
* If possible, try to define your authorizations either on the service or on the entity level. Mixing both variants increases complexity, and not all combinations are supported either.

### Separation of Concerns

Consider using [CDS Aspects](../../cds/cdl#aspects) to separate the actual service definitions from authorization annotations as follows:

<!--- % include _code sample='services.cds' %} -->
::: code-group
```cds [services.cds]
service ReviewsService {
  /*...*/
}

service CustomerService {
  entity Orders {/*...*/}
  entity Approval {/*...*/}
}
```
:::

<!--- % include _code sample='services-auth.cds' %} -->
::: code-group
```cds [services-auth.cds]
annotate ReviewsService with @(requires: 'authenticated-user');

annotate CustomerService with @(requires: 'authenticated-user');
annotate CustomerService.Orders with @(restrict: [
  { grant: ['READ','WRITE'], to: 'admin' },
  { grant: 'READ', where: 'buyer = $user' },
]);
annotate CustomerService.Approval with @(restrict: [
  { grant: 'WRITE', where: '$user.level > 2' }
]);
```
:::

This keeps your actual service definitions concise and focused on structure only. It also allows you to give authorization models separate ownership and lifecycle.

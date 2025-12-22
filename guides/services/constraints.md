---
synopsis: >
  Declarative constraints allow you to express conditions using CXL expressions that are validated automatically whenever data is written, greatly reducing the need for extensive custom code for input validation.
status: released
---

# Declarative Constraints

Declarative constraints allow you to express conditions using [CDS Expression Language (CXL)](../../cds/cxl.md) that are validated automatically whenever data is written. This greatly reduces the need for extensive custom code for input validation.

> [!note]
> Don't confuse declarative constraints as discussed in here with [database constraints](../databases/index#database-constraints). Declarative constraints are meant for domain-specific input validation with error messages meant to be shown to end users, while database constraints are meant to prevent data corruption due to programming error, with error messages not intended for end users.



[[toc]]



## Introduction

Use annotations like `@assert` and `@mandatory` to declaratively add constraints for the primary purpose of input validation. Add them to the elements of the entities exposed by respective services, which accept input to be validated.

### Constraints Annotations

Following is an excerpt from the [`@capire/xtravels`](https:/github.com/capire/xtravels/tree/main/srv/travel-constraints.cds) sample: 

::: code-group

```cds [srv/travel-constraints.cds]
using { TravelService } from './travel-service';
annotate TravelService.Travels with {

  Description @assert: (case 
    when length(Description) < 3 then 'Description too short' 
  end);

  Agency @mandatory @assert: (case 
    when not exists Agency then 'Agency does not exist' 
  end);

  Customer @assert: (case 
    when Customer is null then 'Customer must be specified' 
    when not exists Customer then 'Customer does not exist' 
  end);

  BeginDate @mandatory @assert: (case 
    when BeginDate > EndDate then 'ASSERT_BEGINDATE_BEFORE_ENDDATE' 
    when exists Bookings [Flight.date < Travel.BeginDate] 
      then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end);

  BookingFee @assert: (case 
    when BookingFee < 0 then 'ASSERT_BOOKING_FEE_NON_NEGATIVE' 
  end);

}
```

:::

> [!tip] 
> **BEST PRACTICES** applied here
>
> **Separation of Concerns** – always put secondary concerns, such as  constraints in this case, into separate files as in the example, instead of polluting your core service definitions.
>
> **Concise and comprehensible** – in contrast to imperative coding, constraints expressed in expression languages as shown here are easy to read and understand. 
>
> **Fueling AI** – Not the least, this also fuels AI-based approaches: AIs can easily generate such constraints, and you as a developer using such AIs can easily validate what was generated.



### Served Out-of-the-Box



The constraints are enforced automatically by the CAP runtimes on any input, and if failures occur, the request is ultimately rejected and the transaction rolled back. 

Some of the checks, e.g. the static `@mandatory` checks, are validated directly on the input data, while the ones specified with `@assert:(\<constraint\>)` are collected into a query and **pushed down to the database** for execution. This in turn means, that first the respective `INSERT`s and `UPDATE`s are sent to the database, followed by the validation query.



::: details Behind the scenes...

The automatically compiled and executed validation query would look like that (in [CQL](../../cds/cql)) for the constraints from the sample above: 

```sql
SELECT from TravelService.Travels {

  (case 
    when length(Description) < 3 then 'Description too short' 
  end) as Description,

  (case 
    when not exists Agency then 'Agency does not exist' 
  end) as Agency,

  (case 
    when Customer is null then 'Customer must be specified' 
    when not exists Customer then 'Customer does not exist' 
  end) as Customer,

  (case 
    when BeginDate > EndDate then 'ASSERT_BEGINDATE_BEFORE_ENDDATE' 
    when exists Bookings [Flight.date < Travel.BeginDate] 
      then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD'
  end) as BeginDate,

  (case 
    when BookingFee < 0 then 'ASSERT_BOOKING_FEE_NON_NEGATIVE' 
  end) as BookingFee,

}
```

:::



> [!tip] 
> **BEST PRACTICES** applied here
>
> **Push down to the database** is a general principle applied in CAP. Applied to input validation with declarative constraints it means that instead of reading a lot of related data into the service layer to do the checks there, we push down the respective checks to where the data is (in the database). 
>
> **What, not how!** – This in turn boils down to the even more general principle that we share with functional programming: tell us *what* to do (= *intentional*), not how (= *imperative*), because then generic runtimes can apply advanced optimized ways to execute things, which is impossible with imperative code. 





### Served to Fiori UIs

For Fiori UIs as clients the error messages will be automatically be equiped with relevant `target` properties to attach them to the respective fields on the UIs. For example a Fiori UI for the sample above, would display returned errors like that:

![image-20251219115646302](./fiori-errors.png)

::: details Behind the scenes ...

A sample response for such errors displayed in Fiori UIs would look like that:

```json
{
  "@odata.context": "$metadata#Travels/$entity",
  "ID": 4132,
  "DraftMessages": [
    {
      "target": "/Travels(ID=4132,IsActiveEntity=false)/EndDate", // [!code focus]
      "numericSeverity": 4,
      "@Common.numericSeverity": 4,
      "message": "Alle Buchungen müssen innerhalb des Reisezeitraums liegen",
      "code": "ASSERT_BOOKINGS_IN_TRAVEL_PERIOD"
    },
    {
      "target": "/Travels(ID=4132,IsActiveEntity=false)/Customer_ID", // [!code focus]
      "numericSeverity": 4,
      "@Common.numericSeverity": 4,
      "message": "Customer does not exist",
      "code": "400"
    },
    {
      "target": "/Travels(ID=4132,IsActiveEntity=false)/Bookings(Travel_ID=4132,Pos=1,IsActiveEntity=false)/Flight_date", // [!code focus]
      "numericSeverity": 4,
      "@Common.numericSeverity": 4,
      "message": "Das Flugdatum dieser Buchung liegt nicht innerhalb des Reisezeitraums",
      "code": "ASSERT_BOOKING_IN_TRAVEL_PERIOD"
    }
  ],
  "IsActiveEntity": false
}
```

:::





## Input Validation



Use annotations like `@assert` and `@mandatory` to declaratively add constraints for the primary purpose of input validation. Add them to the elements of the entities exposed by respective services, which accept input to be validated.



### `@assert:` *(constraint)* <Gamma/>

Annotate an element with `@assert: (<constraints>)` to specify checks to be applied on respective input and errors to be raised if they fail. The `<constraints>` are standard SQL `case` expressions with one or more `when` branches, as shown in this example:

```cds
annotate TravelService.Travels with {

  Description @assert: (case                                          // [!code focus]
    when Description then 'Description must be specified'             // [!code focus]
    when trim(Description) = '' then 'Description must not be empty'  // [!code focus]
    when length(Description) < 3 then 'Description too short'         // [!code focus]
  end);                                                               // [!code focus]

}
```

[Refer to _Expressions as Annotation Values_ for details on syntax.](../../cds/cdl.md#expressions-as-annotation-values) {.learn-more}


Conditions can also **refer to other data elements** in the same entity as shown in this example which validated input for `BeginDate` with the related `EndDate`:

```cds
annotate TravelService.Travels with {

  BeginDate @assert: (case                                               // [!code focus]
    when BeginDate > EndDate then 'Begin date must be before end date'   // [!code focus]
  end);                                                                  // [!code focus]
  
}
```

We can also use **path expressions** to compare with data from **associated** entities. For example, this one is from anoter annotation on `TravelService.Bookings` in the [`@capire/xtravels`](https:/github.com/capire/xtravels/tree/main/srv/travel-constraints.cds) sample, that checks if all currencies specified in the list of bookings match the currency chosen in the travel header, refered to by the `Travel` association: 

```cds
annotate TravelService.Bookings with {

  Currency @assert: (case                                           // [!code focus]
    when Currency != Travel.Currency then 'Currencies must match'   // [!code focus]
  end);                                                             // [!code focus]

}

```

We can also do checks with sets of related data using path expressions which navigate along **to-many associations** or compositions, combined with SQL's `exists` quantifier, and optional [infix filters](../../cds/cql#with-infix-filters), as shown in this example:

```cds
annotate TravelService.Travels with {

  BeginDate @assert: (case                                              // [!code focus]
    when exists Bookings [Flight.date < Travel.BeginDate]               // [!code focus]
      then 'All bookings must be within travel period'                  // [!code focus]
  end);                                                                 // [!code focus]
  
}
```






### `@assert.format`

Allows you to specify a regular expression string (in ECMA 262 format in CAP Node.js and java.util.regex.Pattern format in CAP Java) that all string input must match.

```cds
entity Foo {
  bar : String @assert.format: '[a-z]ear';
}
```


### `@assert.range`

Allows you to specify `[ min, max ]` ranges for elements with ordinal types &mdash; that is, numeric or date/time types. For `enum` elements, `true` can be specified to restrict all input to the defined enum values.

```cds
entity Foo {
  bar : Integer  @assert.range: [ 0, 3 ];
  boo : Decimal  @assert.range: [ 2.1, 10.25 ];
  car : DateTime @assert.range: ['2018-10-31', '2019-01-15'];
  zoo : String   @assert.range enum { high; medium; low; };
}
```

By default, specified `[min,max]` ranges are interpreted as closed intervals, that means, the performed checks are `min ≤ input ≤ max`. You can also specify open intervals by wrapping the *min* and/or *max* values into parentheses like that:

<!-- cds-mode: ignore; duplicate annotations -->
```cds
@assert.range: [(0),100]    // 0 < input ≤ 100
@assert.range: [0,(100)]    // 0 ≤ input < 100
@assert.range: [(0),(100)]  // 0 < input < 100
```
In addition, you can use an underscore `_` to represent *Infinity* like that:
<!-- cds-mode: ignore; duplicate annotations -->
```cds
@assert.range: [(0),_]  // positive numbers only, _ means +Infinity here
@assert.range: [_,(0)]  // negative number only, _ means -Infinity here
```
>  Basically values wrapped in parentheses _`(x)`_ can be read as _excluding `x`_ for *min* or *max*. Note that the underscore `_` doesn't have to be wrapped into parentheses, as by definition no number can be equal to *Infinity* .

Support for open intervals and infinity is available for CAP Node.js since `@sap/cds` version **8.5** and in CAP Java since version **3.5.0**.



### `@assert.target`

Annotate a [managed to-one association](../../cds/cdl#managed-associations) with `@assert.target` to check whether the target entity referenced by the association (the reference's target) exists for a given input.

```cds
entity Books {
  key ID : UUID;
  title  : String;
  author : Association to Authors @assert.target;
}

entity Authors {
  key ID : UUID;
  name   : String;
  books  : Association to many Books on books.author = $self;
}
```

You can check whether multiple targets exist in the same transaction. For example, in the `Books` entity, you could
annotate one or more managed to-one associations with the `@assert.target` annotation. However, it is assumed that
dependent values were inserted before the current transaction. For example, in a deep create scenario, when creating a book, checking whether an associated author exists that was created as part of the same deep create transaction isn't supported, in this case, you will get an error.

The `@assert.target` check constraint is meant to **validate user input** and not to ensure referential integrity.
Therefore only `CREATE`, and `UPDATE` events are supported (`DELETE` events are not supported). To ensure that every
non-null foreign key in a table has a corresponding primary key in the associated/referenced target table
(ensure referential integrity), the [`@assert.integrity`](../databases/index#database-constraints) constraint must be used instead.

If the reference's target doesn't exist, an HTTP response
(error message) is provided to HTTP client applications and logged to stdout in debug mode. The HTTP response body's
content adheres to the standard OData specification for an error
[response body](https://docs.oasis-open.org/odata/odata-json-format/v4.01/cs01/odata-json-format-v4.01-cs01.html#sec_ErrorResponse).

```http
POST Books HTTP/1.1
Accept: application/json;odata.metadata=minimal
Prefer: return=minimal
Content-Type: application/json;charset=UTF-8

{"author_ID": "796e274a-c3de-4584-9de2-3ffd7d42d646"}
```

**HTTP Response**

```http
HTTP/1.1 400 Bad Request
odata-version: 4.0
content-type: application/json;odata.metadata=minimal

{"error": {
  "@Common.numericSeverity": 4,
  "code": "400",
  "message": "Value doesn't exist",
  "target": "author_ID"
}}
```
::: tip
In contrast to the `@assert.integrity` constraint, whose check is performed on the underlying database layer,
the `@assert.target` check constraint is performed on the application service layer before the custom application handlers are called.
:::
::: warning
Cross-service checks are not supported. It is expected that the associated entities are defined in the same service.
:::
::: warning
The `@assert.target` check constraint relies on database locks to ensure accurate results in concurrent scenarios. However, locking is a database-specific feature, and some databases don't permit to lock certain kinds of objects. On SAP HANA, for example, views with joins or unions can't be locked. Do not use `@assert.target` on such artifacts/entities.
:::




### `@mandatory`

Elements marked with `@mandatory` are checked for missing and empty input and respective requests are rejected.

```cds
service Sue {
  entity Books {
    key ID : UUID;
    title  : String @mandatory;
  }
}
```

In addition to server-side input validation as introduced above, this adds a corresponding `@FieldControl` annotation to the EDMX so that OData / Fiori clients would enforce a valid entry, thereby avoiding unnecessary request roundtrips:

```xml
<Annotations Target="Sue.Books/title">
  <Annotation Term="Common.FieldControl" EnumMember="Common.FieldControlType/Mandatory"/>
</Annotations>
```

<div id="mandatorywithexpressions"/>



### `@readonly`

Elements annotated with `@readonly`, as well as [_calculated elements_](../../cds/cdl#calculated-elements), are protected against write operations. That is, if a CREATE or UPDATE operation specifies values for such fields, these values are **silently ignored**.

By default [`virtual` elements](../../cds/cdl#virtual-elements) are also _calculated_.
::: tip
The same applies for fields with the [OData Annotations](../advanced/odata#annotations) `@FieldControl.ReadOnly` (static), `@Core.Computed`, or `@Core.Immutable` (the latter only on UPDATEs).
:::

::: warning Not allowed on keys
Do not use the `@readonly` annotation on keys in all variants.
:::

<div id="readonlywithexpressions"/>


## Error Messages

### Custom Messages

For `@assert: (<constraints>)` annotations you always specify custom error messages, specific to the individual checks:

```cds 
annotate TravelService.Travels with {

  Description @assert: (case                                          // [!code focus]
    when Description then 'Description must be specified'             // [!code focus]
    when trim(Description) = '' then 'Description must not be empty'  // [!code focus]
    when length(Description) < 3 then 'Description too short'         // [!code focus]
  end);                                                               // [!code focus]

}
```



The annotations `@assert.range`, `@assert.format`, and `@mandatory` also support custom error messages, just not as elegant, as the above: Use the annotation `@<anno>.message` to specify a custom error message:

```cds
entity Person : cuid {
  name : String;

  @assert.format: '/^\S+@\S+\.\S+$/'
  @assert.format.message: 'Provide a valid email address'
  email : String;

  @assert.range: [(0),_]
  @assert.range.message: '{i18n>person-age}'
  age : Int16;
}
```

Note: The above can also be written like that:

```cds
entity Person : cuid {
  name : String;

  @assert.format: {
    $value: '/^\S+@\S+\.\S+$/', message: 'Provide a valid email address'
  }
  email : String;

  @assert.range: {
    $value: [(0),_], message: '{i18n>person-age}'
  }
  age : Int16;
}
```



### Localized Messages

Whenever you specify an error message with the annotations above, i.e., in the `then` part of an `@assert: (<constraints>)` or in `@mandatory.message`,  `@assert.format.message`, or  `@assert.range.message`, you can either specify a plain text, or a [I18n text bundle key](../uis/i18n#externalizing-texts-bundles).

Actually, we saw this already in the [sample in the introduction](#introduction):

::: code-group

```cds [srv/travel-constraints.cds]
using { TravelService } from './travel-service';
annotate TravelService.Travels with {

  Description @assert: (case 
    when length(Description) < 3 
      then 'Description too short' // [!code focus]
  end);

  Agency @mandatory @assert: (case 
    when not exists Agency 
      then 'Agency does not exist' // [!code focus]
  end);

  BeginDate @mandatory @assert: (case 
    when BeginDate > EndDate 
      then 'ASSERT_BEGINDATE_BEFORE_ENDDATE' // [!code focus]
    when exists Bookings [Flight.date < Travel.BeginDate] 
      then 'ASSERT_BOOKINGS_IN_TRAVEL_PERIOD' // [!code focus]
  end);

  BookingFee @assert: (case 
    when BookingFee < 0 
      then 'ASSERT_BOOKING_FEE_NON_NEGATIVE' // [!code focus]
  end);

}
```

:::

If you use a message key, the message is automatically looked up in the message bundle of the service with the current user's preferred locale.

[Learn more about localized messages.](../uis/i18n){.learn-more}



## Field Control

Declarative constraints can also be used to do field control in Fiori UIs, i.e. to add visual indicators to mandatory or readonly fields, or to hide fields. In particular, CAP automatically adds respective OData annotations to generated EDMX $metadata documents for the CDS listed below.


### `@mandatory`

Currently only static `@mandatory` annotations are supported for field control in Fiori UIs. They result in the addition of the following OData annotation to the EDMX $metadata:

```xml
<Annotations Target=".../EntitySet/EntityType/Property">
  <Annotation Term="Common.FieldControl" EnumMember="Common.FieldControlType/Mandatory"/>
</Annotations>
```



### `@readonly`

Currently only static `@readonly` annotations are supported for field control in Fiori UIs. They result in the addition of the following OData annotation to the EDMX $metadata:

```xml
<Annotations Target=".../EntitySet/EntityType/Property">
  <Annotation Term="Common.FieldControl" EnumMember="Common.FieldControlType/ReadOnly"/>
</Annotations>
```


### `@UI.Hidden`

Use the `@UI.Hidden` annotation to hide fields in Fiori UIs. You can also use it with expressions as values, for example like that:

```cds
@UI.Hidden: (status <> 'visible')
```

[Learn more about that in the *OData guide*](../advanced/odata#expression-annotations) {.learn-more}



## Invariant Constraints



Annotations in general are propagated from underlying entities to views on top. This also applies to the annotations like `@assert` and `@mandatory` introduced in here, which can be used to declare invariant constraints on base entities, which are then inherited to and hence enforced on all interface views on top. 

Picking up the [sample from the introduction](#introduction) again, we could extract some of the constraints and add them to the `sap.capire.travels.Travels` entity from the domain model, with is the underlying entity of  `TravelService.Travels`: 

::: code-group

```cds [srv/travel-invariants.cds]
using { sap.capire.travels.Travels } from '../db/schema';
annotate Travels with {

  Description @assert: (case 
    when length(Description) < 3 then 'Description too short' 
  end);

  Customer @assert: (case 
    when Customer is null then 'Customer must be specified' 
    when not exists Customer then 'Customer does not exist' 
  end);

}
```

:::

And this works fine for these constraints in this example. However, it may be dangerous if you do that for constraints which refer to other fields, as views on top might not expose these fields. This would immediately lead to compiler errors. Note also, that even though you might think you know all your views, and ensure all related fields are included in all views, somebody that you never meet, builds a new view on top of one of your entity. Hence always **adhere to this strict rule**:  

> [!danger]
>
> Only add invariant constraints to underlying entities that **do not refer to other elements**!

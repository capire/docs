---
synopsis: >
  Declarative constraints allow you to express conditions using CXL expressions that are validated automatically whenever data is written, greatly reducing the need for extensive custom code for input validation.
status: released
---

# Declarative Constraints

Declarative constraints allow you to express conditions using CXL expressions that are validated automatically whenever data is written, greatly reducing the need for extensive custom code for input validation.

[[toc]]


## `@mandatory`

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



## `@readonly`

Elements annotated with `@readonly`, as well as [_calculated elements_](../../cds/cdl#calculated-elements), are protected against write operations. That is, if a CREATE or UPDATE operation specifies values for such fields, these values are **silently ignored**.

By default [`virtual` elements](../../cds/cdl#virtual-elements) are also _calculated_.
::: tip
The same applies for fields with the [OData Annotations](../../advanced/odata#annotations) `@FieldControl.ReadOnly` (static), `@Core.Computed`, or `@Core.Immutable` (the latter only on UPDATEs).
:::

::: warning Not allowed on keys
Do not use the `@readonly` annotation on keys in all variants.
:::

<div id="readonlywithexpressions"/>



## `@assert` <Beta/>

Annotate an element with `@assert` to define CXL expressions that are validated _after_ the data has been written to the database but _before_ it is committed it. If validation fails, the expression returns a `String` that indicates an error to the runtime. If validation passes, the expression returns `null`. 

```cds
entity OrderItems : cuid {
        
  @assert: (case 
    when quantity <= 0 then 'Quantity must be greater than zero' 
  end)
  quantity : Integer;       
}
```

You can simplify the same condition by using the [ternary conditional operator](../../releases/archive/2023/march23#ternary-conditional-operator):

```cds
entity OrderItems : cuid {
  
  @assert: (quantity <= 0 ? 'Quantity must be greater than zero' : null)
  quantity  : Integer;
}
```

### Error Messages and Message Targets

In general, if validation fails, the transaction is rolled back with an exception. But, if you use [Fiori draft state messages](../../advanced/fiori#validating-drafts), the error is persisted. The error targets the annotated element, which is then highlighted on the Fiori UI.

::: info Error Messages
The CXL expression in the annotation can return either a static error message or a message key to support i18n. If you use a message key, the message is looked up in the message bundle of the service.
[Learn more about localized messages.](../i18n){.learn-more}
:::


### Complex Asserts

::: warning Use complex asserts on service layer
Like other annotations, `@assert` is propagated to projections. If you annotate an element with `@assert` and the condition uses other elements from the same or an associated entity, you must ensure that these elements are available in all projections to which the annotated element is propagated. Otherwise the CDS model won't compile.

It is therefore recommended to use complex asserts on the highest projection, that is on the service layer.
:::

For the examples given in this section, consider the following _domain_ and _service_ model:

```cds
context db {
  entity Books : cuid { 
    title : String; 
    stock : Integer; 
    deliveryDate : Date;   
    orderDate : Date;
  }
  
  entity Orders : cuid {
    items : Composition of many OrderItems on items.order = $self;
  }
  
  entity OrderItems : cuid {
    order : Association to Orders;
    book : Association to Books;
    quantity : Integer;
  }
}

service OrderService {
  entity Orders as projection on db.Orders;
  entity OrderItems as projection on db.OrderItems;
}
```

An `@assert` annotation can use other elements from the same entity. This annotation checks that the delivery date of an order is after the order date:

```cds
annotate OrderService.Orders with {
  deliveryDate @assert: (deliveryDate < orderDate ? 'DELIVERY_BEFORE_ORDER' : null); // [!code highlight]
}
```

In an `@assert` condition, you can also refer to elements of associated entities. The following example validates the `quantity` of the ordered book against the actual `stock`. If the stock level is insufficient, a static error message is returned:

```cds
annotate OrderService.OrderItems with {
  quantity @assert: (case // [!code highlight]
    when book.stock <= quantity then 'Stock exceeded' // [!code highlight]
  end); // [!code highlight]
}
```

You can also perform validations based on entities associated via a to-many association. Use an [exists predicate](../../cds/cql#exists-predicate) in this case:

```cds
annotate OrderService.Orders with {
  items @assert: ( exists items[book.isNotReleased = true] // [!code highlight]
            ? 'Some ordered book is not yet released' : null) // [!code highlight]
}
```

Refer to [Expressions as Annotation Values](../../cds/cdl.md#expressions-as-annotation-values) for detailed rules on expression syntax.

### Multiple Conditions

Use multiple `when` clauses to check multiple conditions with a single `@assert` annotation. Each condition returns its own error message to precisely describe the error:

```cds
annotate OrderService.OrderItems with {
  quantity @assert: (case
    when book.stock = 0 then 'Stock is zero'
    when book.stock <= quantity then 'Stock exceeded'
  end)
}
```

### Background

The system evaluates expressions after it applies the request to the underlying datastore. This affects the entities in the request's payload. The runtime executes check statements with the provided expressions and the primary key values for the given entities.

::: warning Limitations
- All primary key fields need to be contained in the CQN statement for validations to be enforced (including deep insert and deep update).
- Only elements with simple types (like `String`, `Integer`, `Boolean`) can be annotated with `@assert`. Elements typed with structured or arrayed types are not supported.
:::


## `@assert .format`

Allows you to specify a regular expression string (in ECMA 262 format in CAP Node.js and java.util.regex.Pattern format in CAP Java) that all string input must match.

```cds
entity Foo {
  bar : String @assert.format: '[a-z]ear';
}
```


## `@assert .range`

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



## `@assert .target`

Annotate a [managed to-one association](../../cds/cdl#managed-associations) of a CDS model entity definition with the
`@assert.target` annotation to check whether the target entity referenced by the association (the reference's target)
exists. In other words, use this annotation to check whether a non-null foreign key input in a table has a corresponding
primary key in the associated/referenced target table.

You can check whether multiple targets exist in the same transaction. For example, in the `Books` entity, you could
annotate one or more managed to-one associations with the `@assert.target` annotation. However, it is assumed that
dependent values were inserted before the current transaction. For example, in a deep create scenario, when creating a
book, checking whether an associated author exists that was created as part of the same deep create transaction isn't
supported, in this case, you will get an error.

The `@assert.target` check constraint is meant to **validate user input** and not to ensure referential integrity.
Therefore only `CREATE`, and `UPDATE` events are supported (`DELETE` events are not supported). To ensure that every
non-null foreign key in a table has a corresponding primary key in the associated/referenced target table
(ensure referential integrity), the [`@assert.integrity`](../databases#database-constraints) constraint must be used instead.

If the reference's target doesn't exist, an HTTP response
(error message) is provided to HTTP client applications and logged to stdout in debug mode. The HTTP response body's
content adheres to the standard OData specification for an error
[response body](https://docs.oasis-open.org/odata/odata-json-format/v4.01/cs01/odata-json-format-v4.01-cs01.html#sec_ErrorResponse).

#### Example

Add `@assert.target` annotation to the service definition as previously mentioned:

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

**HTTP Request** — *assume that an author with the ID `"796e274a-c3de-4584-9de2-3ffd7d42d646"` doesn't exist in the database*

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


## Custom Error Messages

The annotations `@assert.range`, `@assert.format`, and `@mandatory` also support custom error messages. Use the annotation `@<anno>.message` with an error text or [text bundle key](../i18n#externalizing-texts-bundles) to specify a custom error message:

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


## Database Constraints

Next to input validation, you can add [database constraints](../databases#database-constraints) to prevent invalid data from being persisted.

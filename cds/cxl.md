---
synopsis: >
  Specification of the CDS Expression Language (CXL) used to capture expressions in CDS.
---

# CDS Expression Language (CXL)

[[toc]]

## Preliminaries

The CDS Expression Language (`CXL`) is a language to express calculations, conditions,
and other expressions in the context of CDS models and queries.
**`CXL` is based on the SQL expression language**, so many syntax elements from SQL are also available in `CXL`.

`CXL` can be used in various places:

- In [CQL queries](./cql#path-expressions) created at runtime via respective language bindings, such as the [`cds.ql`](../node.js/cds-ql) template tag API in JavaScript, or the fluent API variants.

- In [CDL views and projections](./cdl#views), as well as in on-conditions of [unmanaged associations](./cdl#associations), in [calculated elements](./cdl#calculated-elements), and in [annotations](./cdl.md#expressions-as-annotation-values)

::: tip Expressions in CAP are materialized in the context of queries
No matter where `CXL` is used, it always manifests in queries.
For example, [a calculated element](./cdl#calculated-elements) defined in an entity will be resolved
to the respective calculation in the generated query when the entity is queried.
:::


### Live Code

The language syntax is described using [syntax diagrams](https://en.wikipedia.org/wiki/Syntax_diagram).
Most of the accompanying samples are runnable directly in the browser.
Press the play button to see the result and the corresponding sql:

```cds live
SELECT from Books { title }
```

You can also edit the query, making this your personal playground.

:::info Application Context
The cds model initialized on this page is a slightly modified version of the [capire/bookshop](https://github.com/capire/bookshop).

All samples run on a single browser-local `cds` instance, you can access it via the dev tools
or run statements in the following code block:

```js live
await INSERT.into('Books').entries(
  { ID: 2, author_ID: 150, title: 'Eldorado' }
)
```
:::


### Trying it with `cds repl`

To try the samples by yourself, create a simple CAP app:

```sh
cds init bookshop --nodejs --add sample && cd bookshop
```

We encourage you to play around with the snippets.
Just create the sample app as described above and start a repl session within the newly created app by running:

```sh
cds repl --run .
```

Simply use `cds.ql` to run CXL as part of a CQL query:

```js
> await cds.ql`SELECT from Books { title }` // [!code focus]
[
  { title: 'Wuthering Heights' },
  { title: 'Jane Eyre' },
  { title: 'The Raven' },
  { title: 'Eleonora' },
  { title: 'Catweazle' }
]
```

<Since version="9.8.0" package="@sap/cds-dk" /> There's also a CQL mode:

```js
> .ql // [!code focus]
cql> select from Books { title } // [!code focus]
[
  { title: 'Wuthering Heights' },
  { title: 'Jane Eyre' },
  { title: 'The Raven' },
  { title: 'Eleonora' },
  { title: 'Catweazle' }
]
```


## Expressions (`expr`)
###### expr

An expression can hold various elements, such as references, literals, function calls, operators, and more. A few examples, in the context of a select list:
```cds
select from Books {
  42                     as answer,         // literal
  title,                                    // element reference
  price * quantity       as totalPrice,     // binary operator
  substring(title, 1, 3) as shortTitle,     // function call
  author.name            as authorName,     // path expression
  chapters[number < 3]   as earlyChapters,  // ref with infix filter
  exists chapters        as hasChapters,    // exists
  count(chapters)        as chapterCount,   // aggregate function
}
```

This syntax diagram describes the possible expressions:

![](assets/cxl/expr.drawio.svg?raw)

> Using:
> [Path Expressions](#ref),
> [Operators](#xpr),
> [Literals](#val),
> [Functions](#func),
> 
> Used in:
> [Calculated Elements](#in-calculated-elements),
> [Annotations](#in-annotations),
> [Queries](#in-queries),

  ::: tip
  An expression can be used in various places, in the following sections we will give a brief overview of _some_ use cases.
  :::

### In Calculated Elements

  Expressions can be used to define calculated elements.
  Typically, this is done on the select list of a query. CAP
  also allows to define calculated elements directly in the model:

  ```cds
  extend Books with {
    total = price * stock;
  }
  ```

  In this example, we define a calculated element `total` in the `Books` entity
  that calculates the total value of all books in stock by multiplying the `price` with the `stock`.


  ```cds live
  SELECT title, total from Books
  ```

  [Learn more about calculated elements](./cdl.md#calculated-elements){ .learn-more }

  ### In Annotations

  Annotations can [contain expressions](./cdl.md#expressions-as-annotation-values) as their value.
  The meaning and effect of the expression depend on the specific annotation being used.

  For example, the [`@assert` annotation](../guides/services/constraints.md#assert-constraint) lets us declaratively define input validation constraints.
  In this example, we want to make sure that no Books with negative stocks are created:


  ```cds
  annotate AdminService.Books:stock with @assert: (case
    when stock < 0 then 'Enter a positive number'
  end);
  ```

  Upon insert, the expression is evaluated against the updated data:

  :::code-group
  ```js [cds repl]
  > const { Books } = AdminService.entities
  > const insert = INSERT.into(Books).entries({  // [!code focus]
      ID: 277,
      author_ID: 101,
      title: 'Lord of the Rings',
      stock: -2,  // [!code focus]
    })
  > await AdminService.run(insert)

  Uncaught:
  {
    status: 400,  // [!code focus]
    code: 'ASSERT',  // [!code focus]
    target: 'stock',  // [!code focus]
    numericSeverity: 4,
    '@Common.numericSeverity': 4,
    message: 'Enter a positive number'  // [!code focus]
  }
  ```

  ```sql [sql log]
  BEGIN

  -- sql statement for the insert:
  INSERT INTO sap_capire_bookshop_Books (createdAt,createdBy,modifiedAt,modifiedBy,ID,author_ID,title,descr,genre_ID,stock,price,currency_code) SELECT (CASE WHEN json_type(value,'$."createdAt"') IS NULL THEN ISO(session_context('$now')) ELSE ISO(value->>'$."createdAt"') END),(CASE WHEN json_type(value,'$."createdBy"') IS NULL THEN session_context('$user.id') ELSE value->>'$."createdBy"' END),(CASE WHEN json_type(value,'$."modifiedAt"') IS NULL THEN ISO(session_context('$now')) ELSE ISO(value->>'$."modifiedAt"') END),(CASE WHEN json_type(value,'$."modifiedBy"') IS NULL THEN session_context('$user.id') ELSE value->>'$."modifiedBy"' END),value->>'$."ID"',value->>'$."author_ID"',value->>'$."title"',value->>'$."descr"',value->>'$."genre_ID"',value->>'$."stock"',value->>'$."price"',value->>'$."currency_code"' FROM json_each(?) [
    [
      [
        {
          ID: 277,
          author_ID: 101,
          title: 'Lord of the Rings',
          stock: -2
        }
      ]
    ]
  ]

  -- assert expressions are evaluated:
  SELECT json_insert('{}','$."ID"',ID,'$."@assert:stock"',"@assert:stock") as _json_
  FROM (
    SELECT
      Books.ID,
      case when Books.stock < ? then ? end as "@assert:stock"
    FROM AdminService_Books as Books
    WHERE (Books.ID) in ((?))
  ) [ 0, 'Enter a positive number', 277 ]

  -- result of evaluation contains violated constraints,
  -- which leads to a rollback:
  ROLLBACK
  ```
  :::


  ::: tip What-not-how!
  The `@assert` annotation lets you capture the intent via an expression, without having to deal with the technical details.
  This conforms to the core principle [what-not-how](../guides/domain/index#capture-intent-—-what-not-how) of CAP.
  :::


  ### In Queries

  Expressions can be used in various parts of a query, e.g., on the select list, in the where clause, in order by clauses, and more:

  ```cds live
  SELECT from Books {
    title,
    stock,
    price,
    price * stock as total
  } where price > 10
  ```

Compared to the previous example, we now use the expression directly in the query
to calculate the total value of all books in stock.


## Path Expressions (`ref`) 
###### ref 

A `ref` (short for reference) is used to refer to an element within the model.
It can be used to navigate along path segments. Such a navigation is often
referred to as a **path expression**.

![](assets/cxl/ref.drawio.svg?raw)

> Using:
> [Infix Filters](#infix-filters)
> 
> Used in:
> [Expressions](#expr)


Examples:

```zsh
element
struct.element
assoc.element
assoc[filter].element
assoc[filter].struct.assoc.element
```

::: info Leaf elements
Leaf elements as opposed to associations and structured elements represent scalar values, such as strings, numbers, dates, as well as the array and map types.
They typically manifest as columns in database tables.
:::

### Simple Element Reference

The simplest form of a `ref` references a single element:

```cds live
SELECT from Books { title }
```

In this example, we select the `title` element from the `Books` entity.


### Path Navigation

A path expression navigates to elements of an association's target:

```cds live
SELECT from Books { title,
  author.name as author
}
```

In this example, we select all books together with the name of their author.
The association `author` defined in the `Books` entity relates a book to its author.

::: warning Flattening of to-many associations
When navigating along a to-many association to a leaf element, the result is flattened:

:::code-group
```js [CQL]
> await cds.ql `SELECT from Authors { books.title as title, name as author }` // [!code focus]
[
  { title: 'Wuthering Heights', author: 'Emily Brontë' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { title: 'Eleonora', author: 'Edgar Allen Poe' }, // [!code focus]
  { title: 'The Raven', author: 'Edgar Allen Poe' }, // [!code focus]
  { title: 'Catweazle', author: 'Richard Carpenter' }
]
```

```sql [SQL]
SELECT
  books.title as title,
  name as author
FROM sap_capire_bookshop_Authors as Authors
  LEFT JOIN sap_capire_bookshop_Books as books
  ON books.author_ID = Authors.ID
```

In this example, we select the book titles together with each author.
Since books is a to-many association, we get a _joined_ result that repeats every author (name) for every associated book.
:::

Use expand to read to-many associations as structured result:

::: code-group
```js [CQL]
> await cds.ql`SELECT from Authors {
  name as author,
  books { title }  }` // [!code focus]

[
  { author: 'Emily Brontë', books: [ { title: 'Wuthering Heights' } ] },
  { author: 'Charlotte Brontë', books: [ { title: 'Jane Eyre' } ] },
  { // [!code focus]
    author: 'Edgar Allen Poe', // [!code focus]
    books: [ { title: 'The Raven' }, { title: 'Eleonora' } ] // [!code focus]
  }, // [!code focus]
  { author: 'Richard Carpenter', books: [ { title: 'Catweazle' } ] }
]
```
```sql [SQL]
SELECT Authors.name as author,
(
  SELECT jsonb_group_array(
    jsonb_insert('{}', '$."title"', title, '$."genre"', genre->'$')
  ) as _json_
  FROM (
    SELECT books.title, (
      SELECT json_insert('{}', '$."name"', name) as _json_
      FROM (
          SELECT genre.name
          FROM sap_capire_bookshop_Genres as genre
          WHERE books.genre_ID = genre.ID
          LIMIT ?
        )
      ) as genre
    FROM sap_capire_bookshop_Books as books
    WHERE Authors.ID = books.author_ID
  )) as books
FROM sap_capire_bookshop_Authors as Authors

```
:::

::: warning Annotation expressions expect single-valued results
When writing annotation expressions, it's often important to ensure that the result yields a single value for each entry in the annotated entity.
To achieve this, use the [exists](#in-exists-predicates) predicate.
:::

### In `exists` Predicates

Path expressions can also be used after the `exists` keyword to check whether the set referenced by the path is empty.
This is especially useful for to-many relations.

For example, to select all authors that have written **at least** one book:

```cds live
SELECT from Authors { name } where exists books
```

[Learn more about the `exists` predicate.](./cql.md#exists-predicate){.learn-more}

The `exists` predicate can be further enhanced by [combining it with infix filters](#exists-infix-filter).
This allows you to specify conditions on subsets of associated entities, enabling more precise and expressive queries.


## Infix Filters

An infix in linguistics refers to a letter or group of letters that are added in the middle of a word to make a new word.

If we apply this terminology to path expressions, an infix filter condition is an expression 
that is applied to a path segment of a path expression.
This allows you to filter the target of an association based on certain criteria.

![](assets/cxl/infix-filter.drawio.svg?raw)

> Using:
> [Expressions](#expr)
> 
> Used in:
> [Path Expressions](#ref)




### Applied to `exists` Predicate { #exists-infix-filter }

In this example, we want to select all authors with books that have a certain stock amount.
To achieve this, we can apply an infix filter to the path segment `books` in the exists predicate:

```cds live
SELECT from Authors { name }
  where exists books[stock > 100]
```


Exist predicates with infix filters can also be nested.
Here we select all authors that have written at least one book in the `Fantasy` genre:

```cds live
SELECT from Authors { name }
  where exists books[exists genre[name = 'Fantasy']]
```


### Applied to `from` Clause

Infix filters can also be applied to [path expressions in the `from` clause](./cql#path-expressions-in-from-clauses).

For example, we want to get the author names of books with a price greater than 19.99.
Intuitively, we can formulate a query using a condition in the `where` clause:

```cds live
SELECT from Books { author.name as name } where price > 19.99
```


But we can also move this condition to an infix filter:

```cds live
SELECT from Books[price > 19.99] { author.name as name }
```

Now we can further use path navigation to navigate from the filtered books to their authors:

```cds live
SELECT from Books[price > 19.99]:author { name }
```


::: info
Note that the generated SQL is equivalent to querying authors with an [exists predicate](#exists-infix-filter):

```cds live
SELECT from Authors { name } where exists books[price > 19.99]
```
:::

### In Calculated Elements

You can also use the infix filter notation to derive
another more specific association from an existing one.

In the `Authors` entity in the `Books.cds` file add a new element `cheapBooks`:

```cds
entity Authors {
  books        : Association to many Books on books.author = $self;
  cheapBooks   = books[price < 19.99]; // based on `books` association
}
```

Now we can use `cheapBooks` just like any other association.
For example, to select the set of authors which have no cheap books:

```cds live
SELECT from Authors { name } where not exists cheapBooks
```


[Learn more about association-like calculated elements.](./cdl.md#association-like-calculated-elements){ .learn-more }

We can also use `cheapBooks` in nested expands to get all cheap books of each author:

```cds live
SELECT from Authors { name, cheapBooks { title, price } }
```


### Between Path Segments

Assuming you have the [calculated element](#in-calculated-elements) `age` in place on the Authors entity:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, date( $now )));
}
```

In this case we want to select all books but the author is only included in the result if their age is below 40:

```cds live
SELECT from Books { title, author[age < 40].name as author }
```


The path expression `author[ age < 40 ].name`
navigates along the `author` association of the `Books` entity only if the author's age is below 40.

<style>

.badge-inline {
  margin-bottom: 1em
}

.diagram {
  padding-top: 1em;
  padding-bottom: 1em;
  max-width: 100%;
}

.diagram > div > svg {
  max-width: 100%;
  height: auto;
}

.diagram > svg {
  max-width: 100%;
  height: auto;
}

</style>



## Operators (`xpr`)
###### xpr

As depicted in below excerpt of the syntax diagram for `expr`, CXL supports all the standard SQL operators as well as a few additional ones, such as the `?` operator to check for the existence of a path.

![](assets/cxl/operators.drawio.svg?raw)

> Using:
> [Expressions](#expr)
> 
> Used in:
> [Expressions](#expr)


Following table gives an overview of the guaranteed supported operators in CXL:

| Operator | Description | Example |
| -------- | ----------- | ------- |
| `\|\|` | String concatenation. | `'Hello ' \|\| world` |
| `*`, `/`, `%` | Multiplication, division, and modulo. | `price * quantity` |
| `+`, `-` | Addition and subtraction. | `price + tax` |
| `<`, `>`, `<=`, `>=` | Comparison. | `price < 100` |
| `=`, `==`, `!=`, `<>` | Equality. | `price == 100` |
| `is null`, `is not null` | Null checks (postfix). | `price is null` |
| `like`, `not like` | Pattern matching. | `name like 'A%'` |
| `between`-`and` | Range checking. | `x between 1 and 10` |
| `case`-`when`-`then` | Case checking. | `case when 1 then 2 end` |
| `exists`, `not exists` | Existence checking (prefix). | `name like 'A%'` |
| `and`, `or` | Logical operators. | `x>1 or y<2` |

> [!tip] Bivalent `==` and `!=` Operators
> In addition to standard SQL's `=` and `<>` operators, CXL also supports `==` and `!=` as bivalent variants as opposed to the trivalent semantics of `=` and `<>` when it comes to null handling. Learn more about this in the [_Bivalent `==` and `!=` Operators_](../guides/databases/cap-level-dbs#bivalent-and-operators) section of the databases documentation.

> [!tip] Ternary `?:` Operator 
> In addition to the standard SQL `case when then` expression, CXL also supports the ternary `?:` operator as a more concise syntax for simple case expressions. Learn more about this in the [_Ternary `?:` Operator_](../guides/databases/cap-level-dbs#ternary-operator) section of the databases documentation.



## Functions (`func`)
###### func

![](assets/cxl/function.drawio.svg?raw)

> Using:
> [Expressions](#expr)
> 
> Used in:
> [Expressions](#expr)

CAP supports a set of [portable functions](../guides/databases/cap-level-dbs#portable-functions) that can be used in all expressions. The CAP compiler, and the CAP runtimes, automatically translate these functions to database-specific native equivalents, allowing you to use the same functions across different databases, which greatly enhances portability.


## Literals (`val`)
###### val

Literal values represent constant data embedded directly in an expression.
They are independent of model elements and evaluate to the same value.

:::code-group
```js [cds repl]
> cds.parse.expr ` 42 `
{ val: 42 }
> cds.parse.expr ` 'Hello World' `
{ val: 'Hello World' }
> cds.parse.expr ` null `
{ val: null }
> cds.parse.expr ` true `
{ val: true }
> cds.parse.expr ` false `
{ val: false }
> cds.parse.expr ` Date'2026-01-01' `
{ val: '2026-01-01', literal: 'date' }
> cds.parse.expr ` Time'08:42:15.000' `
{ val: '08:42:15.000', literal: 'time' }
> cds.parse.expr ` TimeStamp'2026-01-14T10:30:00Z' `
{ val: '2026-01-14T10:30:00Z', literal: 'timestamp' }
```
:::

> Using:
> [Expressions](#expr)

[Learn more about literals.](./csn.md#literals){ .learn-more }

---
# layout: cds-ref
shorty: Expressions
synopsis: >
  Specification of the CDS Expression Language (CXL) used to capture expressions in CDS.
status: released
---

<script setup>
import expr from './assets/cxl/expr.drawio.svg?raw'
import ref from './assets/cxl/ref.drawio.svg?raw'
import infixFilter from './assets/cxl/infix-filter.drawio.svg?raw'
import unaryOperator from './assets/cxl/unary-operator.drawio.svg?raw'
import binaryOperator from './assets/cxl/binary-operator.drawio.svg?raw'
import literalValue from './assets/cxl/literal-value.drawio.svg?raw'
import functionDef from './assets/cxl/function-def.drawio.svg?raw'
import orderingTerm from './assets/cxl/ordering-term.drawio.svg?raw'
import intro from './assets/cxl/intro.drawio.svg?raw'
</script>


# CDS Expression Language (CXL) { #expressions }
The CDS Expression Language (`CXL`) is a language to express calculations, conditions,
and other expressions in the context of CDS models and queries.
**`CXL` is based on the SQL expression language**, so many syntax elements from SQL are also available in `CXL`.

`CXL` can be used in various places:
- In [CQL](./cql#path-expressions) (select list, where clause, …)
- In [CDL](./cdl)
  + In [calculated elements](./cdl#calculated-elements)
  + In [annotations](./cdl.md#expressions-as-annotation-values)

::: tip Expressions in CAP are materialized in the context of queries
No matter where `CXL` is used, it always manifests in queries.
For example, [a calculated element](./cdl#calculated-elements) defined in an entity will be resolved
to the respective calculation in the generated query when the entity is queried.
:::


## How to read this guide { #how-to }


In the following chapters we illustrate the `CXL` syntax based on simple and more complex examples.
For a complete reference of the syntax, there are clickable [syntax diagrams](https://en.wikipedia.org/wiki/Syntax_diagram) (aka railroad diagrams) for each language construct.

### samples

To try the samples by yourself, create a simple CAP app:

```sh
cds init bookshop --add sample && cd bookshop
```

We encourage you to play around with the snippets.
Just create the sample app as described above and start a repl session within the newly created app by running:

```sh
cds repl --run .
```

:::info All of the example expressions follow the same pattern:
1. A **`CXL`** is shown in the context of a query.
2. The resulting **`SQL`** is shown.

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { title }` // [!code focus]
[
  { title: 'Wuthering Heights' },
  { title: 'Jane Eyre' },
  { title: 'The Raven' },
  { title: 'Eleonora' },
  { title: 'Catweazle' }
]
```

```sql [SQL]
SELECT title FROM sap_capire_bookshop_Books as Books
```
:::

### syntax diagrams

Each language construct is illustrated by a clickable [syntax diagram](https://en.wikipedia.org/wiki/Syntax_diagram).

They show the syntax of CAPs expression language as a sequence of building blocks.
By clicking on the individual blocks, you can get more information about the respective building block.

The following diagram illustrates how to read the diagrams:

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />
<div  v-html="intro"></div>
</div>


## expr { #expr }

An expression can hold various elements, such as references, literals, function calls, operators, and more. A few examples, in the context of a select list:
```cds
select from Books {
  42                     as answer,         // literal
  title,                                    // reference ("ref")
  price * quantity       as totalPrice,     // binary operator
  substring(title, 1, 3) as shortTitle,     // function call
  author.name            as authorName,     // ref with path expression
  chapters[number < 3]   as earlyChapters,  // ref with infix filter
  exists chapters        as hasChapters,    // exists
  count(chapters)        as chapterCount,   // aggregate function
}
```


<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />
<div  v-html="expr"></div>
</div>

Expressions can be used in various places, for example in annotations:

```cds
annotate AdminService.Authors:dateOfDeath with @assert: (case
  when dateOfDeath > date( $now ) then 'Cannot be in the future'
  when dateOfDeath < dateOfBirth then 'Enter a date after date of birth'
end);
```

Or in entity defintions for adding calculated elements:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, date( $now )));
}
```

Or as part of a query:

```cds
SELECT from Books { title } where genre.name = 'Fantasy'
```

### in model definitions

Expressions can be used to define calculated elements.
Typically, this is done in a column of a query. CAP
also allows to define calculated elements directly in the model:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, date( $now )));
}
```

In this example, we define a calculated element `age` on the `Authors` entity
which is no persisted but calculated on-read.


:::code-group
```js [CQL]
> await cds.ql`SELECT from Authors { name, age }` // [!code focus]
[
  { name: 'Emily Brontë', age: 30 },
  { name: 'Charlotte Brontë', age: 36 },
  { name: 'Edgar Allen Poe', age: 40 },
  { name: 'Richard Carpenter', age: 82 }
]
```

```sql [SQL]
SELECT
Authors.name,
floor(
  (
    (
      (cast(strftime('%Y', coalesce(Authors.dateOfDeath,date(session_context('$now')))) as Integer) - cast(strftime('%Y', Authors.dateOfBirth) as Integer)) * 12
    ) + (
      cast(strftime('%m', coalesce(Authors.dateOfDeath,date(session_context('$now')))) as Integer) - cast(strftime('%m', Authors.dateOfBirth) as Integer)
    ) + (
      (
        case
          when (cast(strftime('%Y%m', coalesce(Authors.dateOfDeath,date(session_context('$now')))) as Integer) < cast(strftime('%Y%m', Authors.dateOfBirth) as Integer)) then
            (cast(strftime('%d%H%M%S%f0000', coalesce(Authors.dateOfDeath,date(session_context('$now')))) as Integer) > cast(strftime('%d%H%M%S%f0000', Authors.dateOfBirth) as Integer))
          else
            (cast(strftime('%d%H%M%S%f0000', coalesce(Authors.dateOfDeath,date(session_context('$now')))) as Integer) < cast(strftime('%d%H%M%S%f0000', Authors.dateOfBirth) as Integer)) * -1
        end
      )
    )
  ) / 12
) as age -- here the calculated element is resolved, in this case for sqlite
FROM sap_capire_bookshop_Authors as Authors
```
:::

the `years_between` function is one of CAPs portable functions that calculates the number of years between two dates.


[Learn more about calculated elements](./cdl.md#calculated-elements){ .learn-more }
[Learn more about CAPs portable functions](../guides/databases/cql-to-sql.md#portable-functions){ .learn-more }

### in queries

Expressions can be used in various parts of a query, e.g., in the select list, in the where clause, in order by clauses, and more:

:::code-group
```js [CQL]
> await cds.ql`
  SELECT from Books {
    title,
    stock,
    price,
    price * stock as total } where price > 10` // [!code focus]
[
  { title: 'Wuthering Heights', stock: 12, price: 11.11, total: 133.32},
  { title: 'Jane Eyre', stock: 11, price: 12.34, total: 135.74 },
  { title: 'The Raven', stock: 333, price: 13.13, total: 4372.29 },
  { title: 'Eleonora', stock: 555, price: 14, total: 7770 },
  { title: 'Catweazle', stock: 22, price: 150, total: 3300 }
]
```

```sql [SQL]
SELECT
  Books.title,
  Books.stock,
  Books.price,
  Books.price * Books.stock as total
FROM sap_capire_bookshop_Books as Books
WHERE Books.price > 10
```
:::


### in annotations

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
    "$B".ID,
    case when "$B".stock < ? then ? end as "@assert:stock"
  FROM AdminService_Books as "$B"
  WHERE ("$B".ID) in ((?))
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

## ref (path expression) { #ref }

A `ref` (short for reference) is used to refer to an element within the model.
It can be used to navigate along path segments. Such a navigation is often
referred to as a **path expression**.

<div class="diagram">
  <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
  <div v-html="ref"></div>
</div>

::: info Leaf elements
Leaf elements as opposed to associations and structured elements represent scalar values, such as strings, numbers, dates, as well as the array and map types.
They typically manifest as columns in database tables.
:::

### simple element reference

In its simplest form, a `ref` can be used to reference an element:

:::code-group
```js [CQL] {1}
> await cds.ql`SELECT from Books { title }` // [!code focus]
[
  { title: 'Wuthering Heights' },
  { title: 'Jane Eyre' },
  { title: 'The Raven' },
  { title: 'Eleonora' },
  { title: 'Catweazle' }
]
```

```sql [SQL]
SELECT title FROM sap_capire_bookshop_Books as Books
```
:::

In this example, we select the `title` element from the `Books` entity.

### path navigation {#path-navigation}

A path expression can be used to navigate to any element of the associations target:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { title, author.name as author }` // [!code focus]
[
  { title: 'Wuthering Heights', author: 'Emily Brontë' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { title: 'The Raven', author: 'Edgar Allen Poe' },
  { title: 'Eleonora', author: 'Edgar Allen Poe' },
  { title: 'Catweazle', author: 'Richard Carpenter' }
]
```

```sql [SQL]
SELECT
    title,
    author.name AS author
FROM
    sap_capire_bookshop_Books AS Books
    LEFT JOIN sap_capire_bookshop_Authors AS author -- The table alias for association 'author'
        ON author.ID = Books.author_ID;
```
:::

In this example, we select all books together with the name of their author.
The association `author` defined in the `Books` entity relates a book to it's author.

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
:::

In this example, we select the book titles together with each author.
Since books is a to-many association, we get a _joined_ result that repeats every author (name) for every associated book.

::: info Use expand to read to-many associations as structured result
To avoid that the author data is duplicated rather use an expand:

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

When writing annotation expressions, it's often important to ensure that the result yields a single value for each entry in the annotated entity.
To achieve this, use the [exists](#in-exists-predicate) predicate.


::: tip Associations are **forward-declared joins**
They provide a convenient way to navigate between related entities without having to explicitly specify the join condition during query execution.

The join condition is defined **ahead of time** as part of the association.
Typically, this is a foreign key relationship between two entities, but other conditions are also possible.


```cds
entity Books {
  key ID : Integer;
  title  : String;
  author : Association to Authors;
                      // implicit: on author.ID = author_ID
}

entity Authors {
  key ID : Integer;
  name   : String;
  books  : Association to many Books on books.author = $self;
                             // for: on books.author_ID = $self.ID
}
```


It is applied whenever the association is used in a path expression.

```cds
SELECT from Books { title, author.name as author }
```

```sql
SELECT
  title,
  author.name AS author
FROM
  sap_capire_bookshop_Books
LEFT JOIN
  sap_capire_bookshop_Authors AS author -- Table alias for association 'author'
  ON author.ID = author_ID;             -- Join condition from association
```


The condition can manifest in multiple ways:
- In the on condition of a join
- In the condition that correlates a subquery to a main query
- To select related entities with an additional query
:::

### in `exists` predicate

Path expressions can also be used after the `exists` keyword to check whether the set referenced by the path is empty.
This is especially useful for to-many relations.

E.g., to select all authors that have written **at least** one book:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Authors { name } where exists books` // [!code focus]

[
  { name: 'Emily Brontë' },
  { name: 'Charlotte Brontë' },
  { name: 'Edgar Allen Poe' },
  { name: 'Richard Carpenter' }
]
```

```sql [SQL] {3-7}
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
    SELECT 1
    FROM sap_capire_bookshop_Books as books
    WHERE books.author_ID = Authors.ID
  )
```
:::

[Learn more about the `exists` predicate.](./cql.md#exists-predicate){.learn-more}

## infix filter { #infix-filter }

An infix in linguistics refer to a letter or group of letters that are added in the middle of a word to make a new word.

If we apply this terminology to [path-expressions](#ref), an infix filter condition is an expression 
that is applied to a path-segment of a [path-expression](#ref).
This allows to filter the target of an association based on certain criteria.

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="infixFilter"></div>
</div>



### applied to `exists` predicate

In this example, we want to select all authors with books that have a certain stock amount.
To achieve this, we can apply an infix filter to the path segment `books` in the exists predicate:

:::code-group
```js [CQL]
await cds.ql`SELECT from Authors { name }
  where exists books[stock > 100]` // [!code focus]
[ { name: 'Edgar Allen Poe' } ]
```
```sql [SQL]
SELECT
  name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
  SELECT 1
  FROM sap_capire_bookshop_Books as books
  WHERE books.author_ID = Authors.ID
    and books.stock > 100
)
```
:::


Exist predicates with infix filters can also be nested.
Here we select all authors that have written at least one book in the `Fantasy` genre:

:::code-group
```js [CQL]
> await cds.ql`
    SELECT from Authors { name }
    where exists books[exists genre[name = 'Fantasy']]` // [!code focus]

[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT
  name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
  SELECT 1
  FROM sap_capire_bookshop_Books as books
  WHERE books.author_ID = Authors.ID
  and exists (
    SELECT 1
    FROM sap_capire_bookshop_Genres as genre
    WHERE genre.ID = books.genre_ID
      and genre.name = 'Fantasy'
  )
)
```
:::

> Note how the infix filter condition `genre.name = 'Fantasy'` is applied to the
the `exists`-subquery for the `books` association in SQL.

### applied to `from` clause

Infix filters can also be applied to [path expressions in the `from` clause](./cql#path-expressions-in-from-clauses).

For example, we want to get the author names of books with a price greater than 19.99.
Intuitively, we can formulate a query using a condition in the `where` clause:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { author.name as name } where price > 19.99` // [!code focus]
[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT author.name as name
FROM sap_capire_bookshop_Books as Books
LEFT JOIN sap_capire_bookshop_Authors as author
    ON author.ID = Books.author_ID
WHERE Books.price > ?
```
:::

But we can also move this condition to an infix filter:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books[price > 19.99] { author.name as name }` // [!code focus]
[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
```
:::

Now we can further use path navigation to navigate from the filtered books to their authors:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books[price > 19.99]:author { name }` // [!code focus]
[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
  SELECT 1
  FROM sap_capire_bookshop_Books as Books
  WHERE Books.author_ID = Authors.ID
    and Books.price > ?
)
```
:::


::: info
Note that the generated SQL is equivalent to querying authors with an [exists predicate](#applied-to-exists-predicate):

:::code-group
```js [CQL]
> await cds.ql`SELECT from Authors { name } where exists books[price > 19.99]` // [!code focus]
[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
  SELECT 1
  FROM sap_capire_bookshop_Books as Books
  WHERE Books.author_ID = Authors.ID
    and Books.price > ?
)
```
:::

### in calculated element

You can also use the infix filter notation to derive
another more specific association from an existing one.

In the `Authors` entity in the `Books.cds` file add a new element `cheapBooks`:

```cds {2}
  books        : Association to many Books on books.author = $self;
  cheapBooks   = books[price < 19.99]; // based on `books` association
```

Now we can use `cheapBooks` just like any other association.
E.g. to select the set of authors which have no cheap books:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Authors { name } where not exists cheapBooks` // [!code focus]
[
  { name: 'Richard Carpenter' }
]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE not exists (
    SELECT 1
    FROM sap_capire_bookshop_Books as cheapBooks
    WHERE (cheapBooks.author_ID = Authors.ID)
      and (cheapBooks.price < 19.99) -- here the infix filter condition is applied
  )
```
:::


[Learn more about association-like calculated elements.](./cdl.md#association-like-calculated-elements){ .learn-more }

We can also use `cheapBooks` in nested expands to get all cheap books of each author:

::: code-group
```js [CQL]
> await cds.ql`SELECT from Authors { name, cheapBooks { title, price } }` // [!code focus]
[
  {
    name: 'Emily Brontë',
    cheapBooks: [ { title: 'Wuthering Heights', price: 11.11 } ]
  },
  {
    name: 'Charlotte Brontë',
    cheapBooks: [ { title: 'Jane Eyre', price: 12.34 } ]
  },
  {
    name: 'Edgar Allen Poe',
    cheapBooks: [
      { title: 'The Raven', price: 13.13 },
      { title: 'Eleonora', price: 14 }
    ]
  },
  { name: 'Richard Carpenter', cheapBooks: [] }
]
```

```sql [SQL]
SELECT Authors.name,
(
  SELECT jsonb_group_array(
    jsonb_insert('{}', '$."title"', title, '$."price"', price)
  ) as _json_
  FROM (
    SELECT
      Books.title,
      Books.price
    FROM sap_capire_bookshop_Books as Books
    WHERE (Authors.ID = Books.author_ID)
      and (Books.price < ?)
  )
) as cheapBooks
FROM sap_capire_bookshop_Authors as Authors
```
:::


### between path segments

Assuming you have the [calculated element](#in-calculated-element) `age` in place on the Authors entity:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, date( $now )));
}
```

In this case we want to select all books but the author is only included in the result if their age is below 40:

:::code-group
```js [CQL]
> await cds.ql `SELECT from Books { title, author[age < 40].name as author }` // [!code focus]

[
  { title: 'Wuthering Heights', author: 'Emily Brontë' },
  { title: 'Jane Eyre', author: 'Charlotte Brontë' },
  { title: 'The Raven', author: null },
  { title: 'Eleonora', author: null },
  { title: 'Catweazle', author: null }
]
```

```sql [SQL]
SELECT
  title,
  author.name as author
FROM
  sap_capire_bookshop_Books as Books
LEFT JOIN
  sap_capire_bookshop_Authors as author
ON
  author.ID = Books.author_ID AND floor(
  (
    (
      (cast(strftime('%Y', coalesce(author.dateOfDeath,session_context('$now'))) as Integer) - cast(strftime('%Y', author.dateOfBirth) as Integer)) * 12
    ) + (
      cast(strftime('%m', coalesce(author.dateOfDeath,session_context('$now'))) as Integer) - cast(strftime('%m', author.dateOfBirth) as Integer)
    ) + (
      (
        case
          when (cast(strftime('%Y%m', coalesce(author.dateOfDeath,session_context('$now'))) as Integer) < cast(strftime('%Y%m', author.dateOfBirth) as Integer)) then
            (cast(strftime('%d%H%M%S%f0000', coalesce(author.dateOfDeath,session_context('$now'))) as Integer) > cast(strftime('%d%H%M%S%f0000', author.dateOfBirth) as Integer))
          else
            (cast(strftime('%d%H%M%S%f0000', coalesce(author.dateOfDeath,session_context('$now'))) as Integer) < cast(strftime('%d%H%M%S%f0000', author.dateOfBirth) as Integer)) * -1
        end
      )
    )
  ) / 12) < ?
  ```
:::

The path expression `author[ age < 40 ].name`
navigates along the `author` association of the `Books` entity only if the author's age is below 40.


## operators

### unary operator { #unary-operator }

<div class="diagram">
<div v-html="unaryOperator"></div>
</div>


::: info A unary operator is an operator that operates on exactly one operand.

E.g. in the expression `-price`, the `-` operator is a unary operator
that operates on the single operand `price`. It negates the value of `price`.
:::

### binary operator { #binary-operator }

<div class="diagram">
<div v-html="binaryOperator"></div>
</div>


::: info A binary operator is an operator that operates on two operands.
E.g. in the expression `price * quantity`, the `*` operator is a binary operator
that multiplies the two factors `price` and `quantity`.
:::

## literal value { #literal-value }

<div class="diagram" >
<div v-html="literalValue"></div>
</div>

[Learn more about literals.](./csn.md#literals){ .learn-more }

## function { #function }


<div class="diagram" >
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />
<div class="diagram" v-html="functionDef"></div>
</div>


CAP supports a set of [portable functions](../guides/databases/cql-to-sql.md#portable-functions) that can be used in all expressions. Those functions are passed through to the underlying database, allowing you to leverage the same functions for different databases, which greatly enhances portability.


## ordering term { #ordering-term }

<div class="diagram" >
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />
<div class="diagram" v-html="orderingTerm"></div>
</div>

### ordered list of book titles by price

:::code-group
```js [CQL]
> await cds.ql`
  SELECT from Books { title, price }
  order by price desc nulls last` // [!code focus]
[
  { title: 'Catweazle', price: 150 },
  { title: 'Eleonora', price: 14 },
  { title: 'The Raven', price: 13.13 },
  { title: 'Jane Eyre', price: 12.34 },
  { title: 'Wuthering Heights', price: 11.11 },
  { title: 'Untitled', price: null }
]
```

```sql [SQL]
SELECT
  title,
  price
FROM
  sap_capire_bookshop_Books AS Books
ORDER BY price DESC NULLS LAST -- [!code focus]
```
:::

In this example, the ordering term sorts books by price in descending order and places rows with `null` prices at the end.


## type-ref { #type-ref }

[Learn more about type references in CDL.](./cdl#type-references){ .learn-more }


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


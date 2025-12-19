---
# layout: cds-ref
shorty: Expressions
synopsis: >
  Specification of the CDS Expression Language (CXL) used to capture expressions in CDS.
status: draft
---

<script setup>
import expr from '../assets/cxl/expr.drawio.svg?raw'
import ref from '../assets/cxl/ref.drawio.svg?raw'
import infixFilter from '../assets/cxl/infix-filter.drawio.svg?raw'
import infixFilterFull from '../assets/cxl/infix-filter-full.drawio.svg?raw'
import unaryOperator from '../assets/cxl/unary-operator.drawio.svg?raw'
import binaryOperator from '../assets/cxl/binary-operator.drawio.svg?raw'
import literalValue from '../assets/cxl/literal-value.drawio.svg?raw'
import bindingParameter from '../assets/cxl/binding-parameter.drawio.svg?raw'
import functionDef from '../assets/cxl/function-def.drawio.svg?raw'
import functionArgs from '../assets/cxl/function-args.drawio.svg?raw'
import orderingTerm from '../assets/cxl/ordering-term.drawio.svg?raw'
import overClause from '../assets/cxl/over-clause.drawio.svg?raw'
import intro from '../assets/cxl/intro.drawio.svg?raw'
import setsIntersection from '../assets/cxl/sets-intersection.drawio.svg?raw'
import setsLeftjoin from '../assets/cxl/sets-leftjoin.drawio.svg?raw'
import setsExpand from '../assets/cxl/sets-expand.drawio.svg?raw'
import sets from '../assets/cxl/sets.drawio.svg?raw'
</script>


::: danger This documentation is a work in progress and will change over time.
:::

# CDS Expression Language (CXL) { #expressions }
The CDS Expression Language (`CXL`) is a language to express calculations, conditions,
and other expressions in the context of CDS models and queries.
**`CXL` is based on the SQL expression language**, so many syntax elements from SQL are also available in `CXL`.

`CXL` can be used in various places:
- In [CQL](./cql#path-expressions) (select list, where clause, …)
- In [CDL](./cdl)
  + In [calculated elements](./cdl/#calculated-elements)
  + In [annotations](./cdl.md#expressions-as-annotation-values)

::: info 💡 expressions in CAP are materialized in the context of queries
No matter where `CXL` is used, it always manifests in queries.
For example, [a calculated element](./cdl/#calculated-elements) defined in an entity will be resolved
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

:::info 💡 All of the example expressions follow the same pattern:
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
SELECT Books.title FROM sap_capire_bookshop_Books as Books
```
:::

### syntax diagrams <Badge class="badge-inline" type="tip" text="💡 clickable diagram" />

Each language construct is illustrated by a clickable [syntax diagram](https://en.wikipedia.org/wiki/Syntax_diagram).

They show the syntax of CAPs expression language as a sequence of building blocks.
By clicking on the individual blocks, you can get more information about the respective building block.

The following diagram illustrates how to read the diagrams:

<div class="diagram" v-html="intro"></div>

### theoretical background

CAP did not re-invent when it comes to expressions.
It rather builds upon well-known concepts from relational databases and SQL.

In the [final chapter](#foundation) of this guide, we provide some theoretical background.

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

TODO: Some samples --> Where can we use expressions?

- annotation expression
- calculated element
- one in select

## ref (path expression) { #ref }

A `ref` (short for reference) is used to refer to an element within the model.
It can be used to navigate along path segments. Such a navigation is often
referred to as a **path expression**.

<div class="diagram">
  <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
  <div v-html="ref"></div>
</div>

::: info 💡 Leaf elements
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
SELECT Books.title FROM sap_capire_bookshop_Books as Books
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
    Books.title,
    author.name AS author
FROM
    sap_capire_bookshop_Books AS Books
    LEFT JOIN sap_capire_bookshop_Authors AS author -- The table alias for association 'author'
        ON author.ID = Books.author_ID;
```
:::

In this example, we select all books together with the name of their author.
`author` is an association in the `Books` entity.

::: info 💡 Associations are **forward-declared joins**
They provide a convenient way to navigate between related entities without having to define the join conditions manually.

The join condition is defined **ahead of time** as part of the association.
Typically, this is a foreign key relationship between two entities, but other conditions are also possible.

It then manifests whenever the association is used in a path expression as part of a query.

The condition can manifest in multiple ways:
- In the on condition of a join
- In the condition that correlates a subquery to a main query
- To select related entities with an additional query
:::

### in the from clause {#in-from-clause}

A path expression can also be used in the `from` clause of a query to navigate to a related entity:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books:author { name }` // [!code focus]
[
  { name: 'Emily Brontë' },
  { name: 'Charlotte Brontë' },
  { name: 'Edgar Allen Poe' },
  { name: 'Richard Carpenter' }
]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
  SELECT 1
  FROM sap_capire_bookshop_Books as Books
  WHERE Books.author_ID = Authors.ID
)
```
:::

TODO explanation

This is equivalent to writing `SELECT from Authors where exists books`. When combining this with [infix filters](#infix-filter), it allows for quite concise queries.

### in the where clause {#in-where-clause}

A path expression can also be used as part of the where clause to filter based on elements of related entities:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { title } where genre.name = 'Fantasy'` // [!code focus]
[ { title: 'Catweazle' } ]
```

```sql [SQL]
SELECT
  Books.title
FROM
  sap_capire_bookshop_Books AS Books
  LEFT JOIN sap_capire_bookshop_Genres AS genre
    ON genre.ID = Books.genre_ID
WHERE
  genre.name = ?
```
:::

In this example, we select all books that belong to the `Fantasy` genre.
The table alias for the `genre` association is used in the where clause of the SQL query.

### in order by

A path expression can also be used in the `order by` clause to sort based on elements of related entities:

:::code-group
```js [CQL] {4}
> await cds.ql`
  SELECT from Books
  { title, author.dateOfBirth as birthDate }
  order by author.dateOfBirth`
[
  { title: 'The Raven', birthDate: '1809-01-19' },
  { title: 'Eleonora', birthDate: '1809-01-19' },
  { title: 'Jane Eyre', birthDate: '1818-04-21' },
  { title: 'Wuthering Heights', birthDate: '1818-07-30' },
  { title: 'Catweazle', birthDate: '1929-08-14' }
]
```

```sql [SQL]
SELECT
  Books.title,
  author.dateOfBirth AS birthDate
FROM
  sap_capire_bookshop_Books AS Books
  LEFT JOIN sap_capire_bookshop_Authors AS author
    ON author.ID = Books.author_ID
ORDER BY
  author.dateOfBirth ASC
```
:::

In this example, we select all books and order them by the date of birth of their authors.
The table alias for the `author` association is used in the order by clause of the SQL query.

### after `exists` predicate

path expressions can also be used after the `exists` predicate to check for the existence.
This is especially useful for to-many relations.

E.g., to select all authors that have written **at least**  one book:

:::code-group
```js [CQL] {1}
> await cds.ql`SELECT from Authors { name } where exists books`

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

::: info 💡 Learn more about the `exists` predicate [here](./cql.md#exists-predicate)
:::

## infix filter { #infix-filter }

An infix in linguistics refer to a letter or group of letters that are added in the middle of a word to make a new word.

If we apply this terminology to [path-expressions](#ref), an infix filter condition is an expression 
that is applied to a path-segment of a [path-expression](#ref).
This allows to filter the target of an association based on certain criteria.

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="infixFilter"></div>
</div>


::: info 💡 infix notation as a way to influence auto-generated subqueries
Within an infix, more than than just a simple `WHERE` condition can be specified.
It is also possible to use other query modifiers, such as `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, and `OFFSET`.

::: details see the full syntax diagram

TODO: make diagram more readable (use vertical dimension)

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="infixFilterFull"></div>
</div>

  ::: warning
  Query modifiers other than `WHERE` may only be used in the context of nested projections
  and `exists` predicates. They are ignored for regular path expressions.


:::

### applied to `exists` predicate

In this example, we want to select all authors that have written at least one book in the `Fantasy` genre:

> REVISIT: this does work in the node runtime, but the compiler does not yet support it. How about java?

:::code-group
```js [CQL]
> await cds.ql`
    SELECT from Authors { name }
    where exists books[genre.name = 'Fantasy']` // [!code focus]

[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors as Authors
WHERE exists (
    SELECT 1
    FROM sap_capire_bookshop_Books as books
      inner JOIN sap_capire_bookshop_Genres as genre
        ON genre.ID = books.genre_ID
    WHERE books.author_ID = Authors.ID
      and genre.name = 'Fantasy'
  )
```
:::

> Note how the infix filter condition `genre.name = 'Fantasy'` is applied to the
subquery following the `exists` predicate for the `books` association.

### applied to `expand`

Further narrow down the result set of a path expression by applying an infix filter condition to
[nested-expands](./cql#nested-expands):

::: code-group
```js [CQL] {3}
> await cds.ql`
    SELECT from Authors { name,
      books[ price < 19.99 ] as cheapBooks {
        title,
        price
      } 
    }`

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
    SELECT jsonb_group_array(jsonb_insert('{}', '$."title"', title)) as _json_
    FROM (
        SELECT cheapBooks.title
        FROM sap_capire_bookshop_Books as cheapBooks
        WHERE Authors.ID = cheapBooks.author_ID
          and cheapBooks.price < 19.99
      )
  ) as cheapBooks
FROM sap_capire_bookshop_Authors as Authors
```
:::

<div class="node">

::: info 💡 JSON functions

In this example, the runtime makes use of JSON functions to aggregate the related `books` into a JSON array.
This is because SQL databases do not have a native concept of nested result sets.

> TODO: Link to guide about JSON functions, What about java?
:::

</div>


### with query modifiers

It is also possible to influence the generated subquery,
by adding other query modifiers, such as `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, and `OFFSET`:

::: code-group
```js [CQL] {3}
> await cds.ql`
    SELECT from Authors { name,
      books[ price < 19.99 order by title desc ] as cheapBooks {
        title,
        price
      } 
    }`

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
    SELECT jsonb_group_array(jsonb_insert('{}', '$."title"', title)) as _json_
    FROM (
        SELECT cheapBooks.title
        FROM sap_capire_bookshop_Books as cheapBooks
        WHERE Authors.ID = cheapBooks.author_ID
          and cheapBooks.price < 19.99
        ORDER BY title DESC -- ORDER BY added to subquery
      )
  ) as cheapBooks
FROM sap_capire_bookshop_Authors as Authors
```
:::


TODO: add some short explanation and the limitations

### applied to `from` clause



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

TODO: explanation and intro to the next sample with [query modifiers](#with-query-modifiers)


:::code-group

```js [CQL] {3,4,5}
await cds.ql`
  SELECT from Books[
    where stock > 0
    group by genre
    order by genre asc
  ]
  {
    avg(price) as avgPrice,
    genre.name
  }
`
[
  { avgPrice: 11.725, genre_name: 'Drama' },
  { avgPrice: 150, genre_name: 'Fantasy' },
  { avgPrice: 14, genre_name: 'Romance' },
  { avgPrice: 13.13, genre_name: 'Mystery' }
]

```

```sql [SQL] {6,7,8}
SELECT
  avg(Books.price) as avgPrice,
  genre.name as genre_name
FROM sap_capire_bookshop_Books as Books
  left JOIN sap_capire_bookshop_Genres as genre ON genre.ID = Books.genre_ID
WHERE Books.stock > 0
GROUP BY Books.genre_ID
ORDER BY Books.genre_ID ASC
```
:::

::: details The above is equivalent to…

Using the infix notation to specify the query modifiers is just
syntactic sugar:

```js
await cds.ql`
  SELECT from Books
  {
    avg(price) as avgPrice,
    genre.name
  }
  where stock > 0
  group by genre
  order by genre asc`
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
```js [CQL] {1}
> await cds.ql`SELECT from Authors { name } where not exists cheapBooks`
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


::: info 💡 Learn more about association-like calculated elements [here](./cdl.md#association-like-calculated-elements).
:::

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


> TODO: explanation about json functions again? Learn more link? Specific additions?


### between path segments

TODO: simpler example a la `SELECT from Books { title, author[age < 40].name }`

In this case we want to select all books where the author's name starts with `Emily`
and the author is younger than 40 years.

:::code-group
```js [CQL] {4}
> await cds.ql`
  SELECT from Books { title }
  where startswith(
    author[ years_between(dateOfBirth, dateOfDeath) < 40 ].name,
    'Emily'
  )`

[ { title: 'Wuthering Heights' } ]
```

```sql [SQL]
SELECT
  title
FROM
  sap_capire_bookshop_Books AS B
  LEFT JOIN sap_capire_bookshop_Authors AS author
    ON B.author_ID = author.ID
    AND FLOOR(
      (
        (
          (CAST(STRFTIME('%Y', author.dateOfDeath) AS INTEGER) - CAST(STRFTIME('%Y', author.dateOfBirth) AS INTEGER)) * 12
        ) + (
          CAST(STRFTIME('%m', author.dateOfDeath) AS INTEGER) - CAST(STRFTIME('%m', author.dateOfBirth) AS INTEGER)
        ) + (
          CASE
            WHEN (CAST(STRFTIME('%Y%m', author.dateOfDeath) AS INTEGER) < CAST(STRFTIME('%Y%m', author.dateOfBirth) AS INTEGER)) THEN
              (CAST(STRFTIME('%d%H%M%S%f0000', author.dateOfDeath) AS INTEGER) > CAST(STRFTIME('%d%H%M%S%f0000', author.dateOfBirth) AS INTEGER))
            ELSE
              (CAST(STRFTIME('%d%H%M%S%f0000', author.dateOfDeath) AS INTEGER) < CAST(STRFTIME('%d%H%M%S%f0000', author.dateOfBirth) AS INTEGER)) * -1
          END
        )
      ) / 12
    ) < ?
WHERE
  COALESCE(INSTR(author.name, ?) = 1, FALSE);
```
:::

The path expression `author[ years_between(dateOfBirth, dateOfDeath) < 40 ].name`
navigates along the `author` association of the `Books` entity.

The join for this path expression is generated as usual and enhanced with the infix filter condition `years_between(dateOfBirth, dateOfDeath) < 40`.


::: info 💡 Standard functions
the `years_between` and `startswith` functions are in the [set of CAPs standard functions](../guides/databases.md#standard-database-functions) and are translated to the respective SQL to get the desired result.
:::



## operators

### unary operator { #unary-operator }

<div class="diagram">
<div v-html="unaryOperator"></div>
</div>


::: info 💡 A unary operator is an operator that operates on exactly one operand.

E.g. in the expression `-price`, the `-` operator is a unary operator
that operates on the single operand `price`. It negates the value of `price`.
:::

### binary operator { #binary-operator }

<div class="diagram">
<div v-html="binaryOperator"></div>
</div>


::: info 💡 A binary operator is an operator that operates on two operands.
E.g. in the expression `price * quantity`, the `*` operator is a binary operator
that multiplies the two factors `price` and `quantity`.
:::

## literal value { #literal-value }

<div class="diagram" >
<div v-html="literalValue"></div>
</div>

::: info 💡 Learn more about literals [here](./csn.md#literals)
:::

## binding parameter { #binding-parameter }

<div class="diagram" v-html="bindingParameter"></div>

TODO: Remove for first version?

💡 string and numeric literal as well as `?` are parsed as `ref`

## function { #function }


<div class="diagram" >
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />
<div class="diagram" v-html="functionDef"></div>
</div>



CAP supports a set of [standard functions](../guides/databases.md#standard-database-functions) that can be used in expressions. In addition, functions are passed through to the underlying database, allowing you to leverage database-specific functions as needed.

CAP standard functions:
| Name                              | Description                                                                                                                                             |
|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| **String Functions**              |                                                                                                                                                         |
| `concat(x, y, ...)`               | Concatenates the given strings or numbers `x`, `y`, ...                                                                                                 |
| `trim(x)`                         | Removes leading and trailing whitespaces from `x`.                                                                                                      |
| `contains(x, y)`                  | Checks whether `x` contains `y` (case-sensitive).                                                                                                       |
| `startswith(x, y)`                | Checks whether `x` starts with `y` (case-sensitive).                                                                                                    |
| `endswith(x, y)`                  | Checks whether `x` ends with `y` (case-sensitive).                                                                                                      |
| `matchespattern(x, y)`            | Checks whether `x` matches the regular expression `y`.                                                                                                  |
| `indexof(x, y)`<sup>1</sup>       | Returns the index of the first occurrence of `y` in `x` (case-sensitive).                                                                               |
| `substring(x, i, n?)`<sup>1</sup> | Extracts a substring from `x` starting at index `i` (0-based) with an optional length `n`.                                                              |
| `length(x)`                       | Returns the length of the string `x`.                                                                                                                   |
| `tolower(x)`                      | Converts all characters in `x` to lowercase.                                                                                                            |
| `toupper(x)`                      | Converts all characters in `x` to uppercase.                                                                                                            |
| **Numeric Functions**             |                                                                                                                                                         |
| `ceiling(x)`                      | Rounds the numeric parameter up to the nearest integer.                                                                                                 |
| `floor(x)`                        | Rounds the numeric parameter down to the nearest integer.                                                                                               |
| `round(x)`                        | Rounds the numeric parameter to the nearest integer. The midpoint between two integers is rounded away from zero (e.g., `0.5` → `1` and `-0.5` → `-1`). |
| **Aggregate Functions**           |                                                                                                                                                         |
| `min(x)`                          | Returns the minimum value of `x`.                                                                                                                       |
| `max(x)`                          | Returns the maximum value of `x`.                                                                                                                       |
| `sum(x)`                          | Returns the sum of all values of `x`.                                                                                                                   |
| `average(x)`                      | Returns the average (mean) value of `x`.                                                                                                                |
| `count(x)`                        | Returns the count of non-null values of `x`.                                                                                                            |
| `countdistinct(x)`                | Returns the count of distinct non-null values of `x`.                                                                                                   |



## ordering term <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #ordering-term }

<div class="diagram" v-html="orderingTerm"></div>

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
  Books.title,
  Books.price
FROM
  sap_capire_bookshop_Books AS Books
ORDER BY price DESC NULLS LAST -- [!code focus]
```
:::

In this example, the ordering term sorts books by price in descending order and places rows with `null` prices at the end.


## type-ref <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #type-ref }

::: info 💡 learn more about type references [here](./cdl.md#type-references)
:::

## Scientific Background {#foundation}

Every entity defines a set of all possible instances:
$${ b \in \text{Books} }$$

A simple select query on Books returns the complete set → all books.
Filters progressively narrow down the set:

$$\text{highstock} = \{ b \in \text{Books} \mid b.\text{stock} > 100 \}$$

With the infix filter notation, we write it as `Books[stock > 100]`.
An association defines a relationship between two sets:

$$\text{books} = \{ (a,b) \in \text{Books} \times \text{Authors} \mid b.\text{author\_id} = a.\text{id} \}$$

We can select this set using the path expression `Authors:books` in the [from clause](#in-from-clause).
The same can be applied to navigate via a path expression in the [select list](#path-navigation) or [where clause](#in-where-clause) using `books`.
Filtering authors by `Authors where exists books[stock > 100]` can be expressed as:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{Books}( b.\text{author\_id} = a.\text{id} \land b.\text{stock} > 100 ) \}$$

Using the previously defined $\text{books}$, we can simplify it to:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{books}( b.\text{stock} > 100 ) \}$$

Using the $\text{highstock}$ set, we can further simplify it to:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{books} \cap \text{highstock} \}$$

So in conclusion, the expression filters for the intersection of the two sets $\text{books}$ (via association) and $\text{highstock}$ (via infix filter).





<div class="diagram">
<div v-html="setsIntersection"></div>
</div>





<div class="diagram">
<div v-html="setsLeftjoin"></div>
</div>


<div class="diagram">
<div v-html="setsExpand"></div>
</div>


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


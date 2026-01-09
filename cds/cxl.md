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
  when dateOfDeath > $now then 'Cannot be in the future'
  when dateOfDeath < dateOfBirth then 'Enter a date after date of birth'
end);
```

Or in entity defintions for adding calculated elements:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, $now));
}
```

Or as part of a query:

```cds
SELECT from Books { title } where genre.name = 'Fantasy'
```


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
  { title: 'Eleonora', author: 'Edgar Allen Poe' },
  { title: 'The Raven', author: 'Edgar Allen Poe' },
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
Since books is a to-many association, we get a flattened result: one entry per author and book title.

In annotation expressions, the result should often only contain one entry per entry in the annotated entity.
This can be achieved using the [exists](#in-exists-predicate) predicate.


::: tip Associations are **forward-declared joins**
They provide a convenient way to navigate between related entities without having to define the join conditions manually.

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
await cds.ql`SELECT from Authors { name } where exists books[stock > 100]`
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

Assuming you have the [calculated element](#in-calculated-element) age in place on the Authors entity:

```cds
extend Authors with {
  age = years_between(dateOfBirth, coalesce(dateOfDeath, $now));
}
```

In this case we want to select all books where the author's name starts with `Emily`
and the author is younger than 40 years.

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
navigates along the `author` association of the `Books` entity.

The join for this path expression is generated as usual and enhanced with the infix filter condition `age < 40`.


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



CAP supports a set of [standard functions](../guides/databases/index#standard-database-functions) that can be used in expressions. In addition, functions are passed through to the underlying database, allowing you to leverage database-specific functions as needed.

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


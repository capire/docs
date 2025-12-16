---
# layout: cds-ref
shorty: Expressions
synopsis: >
  Specification of the Core Expression Language (CXL) used to capture expressions in CDS.
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
</script>

# Core Expression Language (CXL) { #expressions }
The Core Expression Language (`CXL`) is a language to express calculations, conditions,
and other expressions in the context of CDS models and queries.
**`CXL` is based on the SQL expression language**, so many syntax elements from SQL are also available in `CXL`.

`CXL` can be used in various places (TODO: Links):
- In queries (select list, where clause, …)
- In calculated elements
- In annotations

::: info 💡 expressions in CAP are materialized in the context of queries
No matter where `CXL` is used, it always manifests in queries.
For example, [a calculated element](./cdl/#calculated-elements) defined in an entity will be resolved
to the respective calculation in the generated query when the entity is queried.
:::


## How to read this guide { #how-to }


In the following chapters we illustrate the `CXL` syntax based on simple and more complex examples.
For a complete reference of the syntax, there are clickable syntax diagrams for each language construct.

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

### diagrams <Badge class="badge-inline" type="tip" text="💡 clickable diagram" />

Each language construct is illustrated by a clickable syntax diagram.
They show the syntax of CAPs expression language as a sequence of building blocks.
By clicking on the individual blocks, you can get more information about the respective building block.

The following diagram illustrates how to read the diagrams:

<div class="diagram" v-html="intro"></div>


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

### syntax <Badge class="badge-inline" type="tip" text="💡 clickable diagram" />

<div class="diagram" v-html="expr"></div>



TODO: some text and more examples

## ref (path expression) { #ref }

A `ref` (short for reference) is used to refer to an element within the model.
It can be used to navigate along path segments. Such a navigation is often
referred to as a **path expression**.

<div class="diagram">
  <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
  <div v-html="ref"></div>
</div>


### simple element reference

In its simplest form, a `ref` can be used to reference an element:

:::code-group
```js [CQL] {1}
> await cds.ql`SELECT from Books { title }`
[
  { title: 'Wuthering Heights' },
  { title: 'Jane Eyre' },
  { title: 'The Raven' },
  { title: 'The Tell-Tale Heart' },
  { title: 'The Hobbit' }
]
```

```sql [SQL]
SELECT Books.title FROM sap_capire_bookshop_Books as Books
```
:::


### path expression in the select list

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

### path expression in the where clause

A path expression can also be used as part of the where clause to filter based on elements of related entities:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { title } where genre.name = 'Fantasy'` // [!code focus]
[ { title: 'Catweazle' } ]
```

```sql
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

### path expression in order by

A path expression can also be used in the `order by` clause to sort based on elements of related entities:

:::code-group
```js [CQL]
> await cds.ql`SELECT from Books { title, author.dateOfBirth as birthDate } order by author.dateOfBirth`
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

### path expression after `exists` predicate

path-expressions can also be used after the `exists` predicate to check for the existence.
This is especially useful for to-many relations.

In the example a path expression combined with an [infix-filter](#infix-filter),
allows to select all authors that have written at least one book in the `Fantasy` genre.

:::code-group
```js [CQL]
> await cds.ql`
  SELECT from ${Authors} { name }
  where exists books.genre[name = 'Fantasy']` // [!code focus]

[ { name: 'Richard Carpenter' } ]
```

```sql [SQL]
SELECT Authors.name
FROM sap_capire_bookshop_Authors AS Authors
WHERE EXISTS (
  SELECT 1
  FROM sap_capire_bookshop_Books AS Books
  WHERE Books.author_ID = Authors.ID
    AND EXISTS (
      SELECT 1
      FROM sap_capire_bookshop_Genres AS Genres
      WHERE Genres.ID = Books.genre_ID
        AND Genres.name = 'Fantasy'
    )
);
```
:::

::: info 💡 TODO
???
:::

### conclusion

A `ref` can be used to reference an element.
It is possible to navigate along [path segments](#path-segment) to reference elements within the model.
This is not limited to an entities own elements, but can also be used to navigate associations to elements of related entities.

A path expression can be much more complex. For example, the individual [path segments](#path-segment)
themselves can contain expressions by applying [infix-filters](#infix-filter).
More samples are shown in the upcoming sections.

::: info 💡 Set theory of path expressions
Path expressions point to a **set** of data that can be further filtered and used.

A query with a filter (typically: where-clause) results in an entity set which is a subset of the complete entity. In terms of set theory: The set of elements for which the following holds true ...

An infix filter further narrows down this set by applying additional conditions on the elements of the set.

The resulting set can then be used in various ways, e.g., to select elements, to check for existence, to perform aggregations... or to further navigate along associations to related entities.
:::

## infix filter { #infix-filter }

An infix in linguistics refer to a letter or group of letters that are added in the middle of a word to make a new word.

If we apply this terminology to [path-expressions](#ref), an infix filter condition is an expression 
that is applied to a [path-segment](#path-segment) of a [path-expression](#ref).
This allows to filter the target of an association based on certain criteria.

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="infixFilter"></div>
</div>


::: info 💡 infix notation as a way to influence auto-generated subqueries
Within an infix, more than than just a simple `WHERE` condition can be specified.
It is also possible to use other query modifiers, such as `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`, and `OFFSET`.
:::

::: details see the full syntax diagram

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="infixFilterFull"></div>
</div>

  ::: warning
  Query modifiers other than `WHERE` may only be used in the context of nested projections
  and `exists` predicates. They are ignored for regular path expressions.


:::

### enhancing path expression with filter conditions

In this case we want to select all books where the author's name starts with `Emily`
and the author is younger than 40 years.

:::code-group
```js [CQL] {4}
> await cds.ql`
  SELECT from ${Books} { title }
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


### Infix notation as convenience to specify query modifiers

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

```sql [SQL]
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

> TODO: continue


## operators

### unary operator { #unary-operator }

<div class="diagram">
<div v-html="unaryOperator"></div>
</div>


A unary operator is an operator that operates on only one operand.
E.g. in the expression `-price`, the `-` operator is a unary operator
that operates on the single operand `price`. It negates the value of `price`.

### binary operator { #binary-operator }

<div class="diagram">
<div v-html="binaryOperator"></div>
</div>
A binary operator is an operator that operates on two operands.

E.g. in the expression `price * quantity`, the `*` operator is a binary operator
that operates on the two operands `price` and `quantity`.

## literal value { #literal-value }

<div class="diagram" >
<div v-html="literalValue"></div>
</div>

TODO

## binding parameter { #binding-parameter }

<div class="diagram" v-html="bindingParameter"></div>

TODO: some text

💡 string and numeric literal as well as `?` are parsed as `ref`

## function <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #function }

<div class="diagram" v-html="functionDef"></div>

TODO: some text

## function args { #function-args }

<div class="diagram">
<Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
<div v-html="functionArgs"></div>
</div>

### aggregate function with ordering term

::: code-group
```js [CAP Style] {4}
> await cds.ql`
  SELECT from Authors {
    name,
    string_agg(books.title, ', ' ORDER BY books.title DESC) as titles
  }
  GROUP BY books.author.ID`

[
  { name: 'Emily Brontë', titles: 'Wuthering Heights' },
  { name: 'Charlotte Brontë', titles: 'Jane Eyre' },
  { name: 'Edgar Allen Poe', titles: 'The Raven, Eleonora' },
  { name: 'Richard Carpenter', titles: 'Catweazle' }
]
```

```js [SQL Style]
await cds.ql`
  SELECT
    name,
    string_agg(books.title, ', ' ORDER BY books.title DESC) as titles
  from ${Authors} as A
    left join ${Books} as books on books.author_ID = A.ID
  GROUP BY books.author_ID
```

```sql [SQL output]
SELECT
  "$A".name,
  string_agg(books.title, ? ORDER BY books.title DESC) AS titles
FROM sap_capire_bookshop_Authors AS "$A"
LEFT JOIN sap_capire_bookshop_Books AS books
  ON books.author_ID = "$A".ID
GROUP BY books.author_ID;
```
:::

## ordering term <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #ordering-term }

<div class="diagram" v-html="orderingTerm"></div>

TODO: some text

## over-clause <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #over-clause }

<div class="diagram" v-html="overClause"></div>

## type-ref <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #type-ref }

TODO

## select-statement <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #select-statement }

TODO

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


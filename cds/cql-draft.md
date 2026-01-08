---
# layout: cds-ref
shorty: Query Language
synopsis: >
  Specification of the CDS Query Language (CXL) used to capture expressions in CDS.
status: draft
---

<script setup>
import functionArgs from '../assets/cxl/function-args.drawio.svg?raw'
</script>

# CDS Query Language (CQL) { #ql }

::: info this is a draft and contains some samples which were taken from the CXL docs
:::

# Sample Collection

## path navigation

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
  title
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
  title,
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


## infix filter


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

TODO: This is database specific

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
  from Authors as A
    left join Books as books on books.author_ID = A.ID
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


---
# layout: cds-ref
shorty: Query Language
synopsis: >
  Specification of the CDS Query Language (aka CQL) which is an extension of the standard SQL SELECT statement.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/855e00bd559742a3b8276fbed4af1008.html
---


# Query Language (CQL)

[[toc]]

## Preliminaries

The CDS Query Language (CQL) is based on standard SQL and extends it with CDS-specific capabilities.

### Trying it with `cds repl`

> TODO: Change this once live CQL is available.

To try the samples by yourself, create a simple CAP app:

```sh
cds init bookshop --nodejs --add sample && cd bookshop
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

## SELECT

> TODO do we want to capitalize the `SELECT` (and other keywords) also in the samples?, if yes, we should do it in all the samples.

The CQL `SELECT` clause extends the well-known SQL `SELECT` with CDS-specific capabilities like [postfix projections](#postfix-projections), structured results, and [path expressions](./cxl#path-expressions-ref). It supports expanded navigation across associations, inline projections for concise field lists, and smart `*` handling with `excluding`.

![](./assets/cql/select.drawio.svg?raw)

> Using: [Query Source](#query-source), [Postfix Projections](#postfix-projections), [Select Items](#select-item), [Excluding](#excluding-clause), [Expressions](./cxl#expr), Ordering Term

For example we can select the _available_ `Books` while
excluding the `stock` and some technical details from the result:

```cds live
select from Books { * }
excluding {
  stock,
  createdAt,  createdBy,
  modifiedAt, modifiedBy
} where stock > 0
```

Or we can calculate the average price of books per author:

```cds live
select from Authors {
  avg(books.price),
  name as author
} group by ID
```

Or we can select all `Authors` that have written a `Fantasy` book:

```cds live
select from Authors where exists books[genre.name = 'Fantasy']
```


## Query Source

The query source defines the data set a `SELECT` reads from. It can be a single entity or a path expression that navigates associations.

![](./assets/cql/query-source.drawio.svg?raw)

> Using: [Infix Filter](./cxl#infix-filters), [Path Expressions](./cxl#path-expressions-ref)
>
> Used in: [Select](#select)

### Using Entity Names

We can select from the `Books` entity by refering to it's fully qualified name (namespace + entity name):

```cds
select from sap.capire.bookshop.Books
```

runtimes alternatively allow to refer to the entity by its short name:

> TODO: java way of doing this

```cds
select from Books
```

### Using Infix Filters

We can apply infix filters to the query source to narrow down the set of entries read from the source. For example, the following query selects all books of the genre `Fantasy`:

> TODO: enable this in db-service
```cds live
select from Books[genre.name = 'Fantasy'] { title }
```

::: tip the above is equivalent to:
```cds live
SELECT from Books { title } where genre.name = 'Fantasy'
```
:::

### Using Path Expressions

By using a path expressions after the `:`, we can navigate from one entity to associated entities.
The entity at the end of the path expression is the actual query source.

We navigate from existing books to their authors:

```cds live
SELECT from Books:author { name }
```

::: tip the above is equivalent to: 
Selecting from `Authors` and checking for the existence of associated books:

```cds live
SELECT from Authors { name } where exists books
```
:::

In the following example, we start with a filtered set of `Authors`.
By using a path expressions after the `:`, we navigate from the authors to _their_ `books` and further to the books' `genre`.

For example with the following we can get a list of genres of books written by `Edgar Allen Poe`:

```cds live
SELECT from Authors[name='Edgar Allen Poe']:books.genre { name }
```

::: tip the above is equivalent to:
```cds live
SELECT from Genres as G { name }
where exists (
  SELECT from sap.capire.bookshop.Books
  where exists author[name='Edgar Allen Poe'] and genre_ID = G.ID
)
```
:::

## Select Item

![](./assets/cql/select-item.drawio.svg?raw)

> Using: [Expressions](./cxl#expr), [Path Expressions](./cxl#ref), [Type Casts](#type-casts), [Postfix Projections](#postfix-projections), [Smart `*` Selector](#smart-star-selector)
>
> Used in: [Select](#select), [Postfix Projections](#postfix-projections)

### Using Expressions

A select item can hold all kinds of [expressions](cxl.md#expr), including path expressions, and can be aliased with `as`. For example:

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

It is possible to assign an explicit alias, it is even sometimes required if the alias can't be inferred:

```cds live
select from Books {
  1 + 1 as calculated,  // alias must be provided
  title                 // alias inferred as "title"
}
```

In some situations you may want to assign or change the data type of a column:

```cds live
select from Books {
  $now as time      : Time,      // '2026-02-23T13:44:32.133Z''
  $now as date      : Date       // '2026-02-23'
}
```
> TODO: not the best example, also no real difference on sqlite for this particular sample

### Expand Path Expression

Using the `expand` syntax allows to expand results along associations and hence read deeply structured documents:

```cds live
SELECT from Books {
  title,
  author {
    name,
    age
  }
}
```

Expanding related data is especially useful for to-many relations:

```cds live
SELECT from Authors {
  name,
  books {
    title,
    price
  }
}
```

For more samples and a detailed syntax diagram, refer to the [`expand` chapter](#nested-expands)

### Inline Path Expression

Put a **`"."`** before the opening brace to **inline** the target elements and avoid writing lengthy lists of paths to read several elements from the same target. For example:

```cds live
SELECT from Authors {
  name,
  address.{
    street,
    city.{ name, country }
  }
}
```

Inlining path expressions can help to improve the structure of a query, as the elements in the projection share the same target.

::: tip the above is equivalent to:
```cds live
SELECT from Authors {
  name,
  address.street,
  address.city.name,
  address.city.country
}
```

:::

For more samples and a detailed syntax diagram, refer to the [`inline` chapter](#nested-inlines)

### Smart `*` Selector

###### Smart Star Selector

Within postfix projections, the `*` operator queries are handled slightly different than in plain SQL select clauses:

```cds live
SELECT from Books { *, title || ' (on sale)' as title }
```

Queries like in our example, would result in duplicate element for `title` in SQL.
In `CQL`, explicitly defined columns following an `*` replace equally named columns that have been inferred before.

::: tip Smart `*` Selector in expands and inlines

The `*` selector can not only be used in select lists, but also in expands and inlines.
```cds live
SELECT from Books { title,
  author {
    *, name || ' (' || age || ')' as name
  } excluding { age }
}
```
:::


### Type Casts

> TODO: sql style casts are broken
> TODO: 

```cds live
SELECT from Books {
  stock+1 as bar : String,  // CAP-style
  cast(stock+1 as String) as bar2,  // SQL-style
  substring( cast (stock as String), -1 ) as bar3  // SQL-style nested
};
```
[Learn more about CDL type definitions](./cdl#types){.learn-more}



## Postfix Projections
{#postfix-projections}

![](./assets/cql/postfix-projection.drawio.svg?raw)

> Using: [Select Items](#select-item), [Excluding](#excluding-clause)
>
> Used in: [Select](#select), [Expands](#nested-expands), [Inlines](#nested-inlines), [Select Items](#select-item)

CQL allows to put projections, that means, the `SELECT` clause, behind the `FROM` clause enclosed in curly braces. For example, the following are equivalent:

```cds live
SELECT name, address.street from Authors
```
```cds live
SELECT from Authors { name, address.street }
```

### Nested Expands


![](./assets/cql/nested-expand.drawio.svg?raw)

> Using: [Path Expressions](./cxl#ref), [Postfix Projections](#postfix-projections)
>
> Used in: [Select Items](#select-item)

Postfix projections can be appended to any column referring to a struct element or an association and hence be nested.
This allows **expand** results along associations and hence read deeply structured documents:

```cds live
SELECT from Authors {
   name, address { street, city { name, country }}
};
```

This returns a structured result set.

Expanding to-many associations results in an array being returned for the substructure:
```cds live
SELECT from Authors {
  name,
  books {
    title,
    genre { name }
  }
} where name = 'Edgar Allen Poe'
```

Similar to the select clause, concepts like the [smart `*` selector](#smart-star-selector) and the [excluding clause](#excluding-clause) are also available in a nested expand:
```cds live
SELECT from Books {
  title,
  author { * } excluding { dateOfDeath, placeOfDeath }
}
```

The postfix projection following the expand contains [select-items](#select-item) and can therefore also contain any [expression](./cxl#expr):

```cds live
SELECT from Books {
   title,
   author {
     name,
     dateOfDeath - dateOfBirth as age,
     address.city { concat(name, '/', country) as name }
   }
};
```

[Learn more about expand execution in CAP Node.js](../guides/databases/new-dbs#optimized-expands) {.learn-more}

[Learn more about expand execution in CAP Java](../java/working-with-cql/query-api#expand-optimization) {.learn-more}


#### Alias

Just as any other [select item](#select-item), the base of a nested expand and all of its elements can be aliased:

```cds live
SELECT from Authors {
   name,
   address as residence {
    street as road,
    city as town { name, country }
  }
};
```


### Nested Inlines

![](./assets/cql/nested-inline.drawio.svg?raw)

> Using: [Path Expressions](./cxl#ref), [Postfix Projections](#postfix-projections)
>
> Used in: [Select Items](#select-item)

Put a **`"."`** before the opening brace to **inline** the target elements and avoid writing lengthy lists of paths to read several elements from the same target. For example:

```cds live
SELECT from Authors {
   name, address.{ street, city.{ name, country }}
};
```

::: tip the above is equivalent to:

```cds live
SELECT from Authors {
  name,
  address.street,
  address.city.name,
  address.city.country
};
```
:::

Nested Inlines can contain expressions:

```cds live
SELECT from Books {
   title,
   author.{
     name,
     dateOfDeath - dateOfBirth as author_age,
     address.city.{ concat(name, '/', country) as author_city }
   }
};
```

::: tip the above is equivalent to:

```cds live
SELECT from Books {
   title,
   author.name,
   author.dateOfDeath - author.dateOfBirth as author_age,
   concat(author.address.city.name, '/', author.address.city.country) as author_city
};
```
:::

### Excluding Clause

Use the `excluding` clause in combination with `SELECT *` to select all elements except the ones listed in the exclude list.

```cds live
SELECT from Cities { * } excluding { ID }
```

The effect enables **late materialization** of signatures, keeping them open to late extensions.
Without extensions, the above query would return the same result as:

```cds live
SELECT from Cities { name, country}
```

Now assume a consumer extends `Cities` with a new element:

```cds
extend Cities with { population : Integer };
```

With that, the first query (with the `excluding` clause) would automatically include the new `population` element in its result, while the second query would not:

```cds
// yields { name, country, population }
SELECT from Cities { * } excluding { ID }
```

```cds
// yields { name, country }
SELECT from Cities { name, country}
```

## Where {#where}

The `where` clause filters the result set to only include entries satisfying a given condition. Any [CXL expression](./cxl#expr) evaluating to a boolean can be used as the condition.

### Simple Conditions

For example, to select only books that are currently in stock:

```cds live
SELECT from Books { title, stock, price }
  where stock > 0
```

Multiple conditions can be combined with `and` and `or`:

```cds live
SELECT from Books { title, stock, price }
  where stock > 0 and price < 20
```



### Exists Predicate

The `exists` predicate checks whether an associated set is non-empty. This is especially useful when filtering by to-many associations:

```cds live
SELECT from Authors { name }
  where exists books
```

Combined with [infix filters](./cxl#infix-filters), you can further narrow down the associated entries:

```cds live
SELECT from Authors { name }
  where exists books[genre.name = 'Fantasy']
```

[Learn more about path expressions and infix filters](./cxl#infix-filters){.learn-more}

### Pattern Matching

Use the `like` operator to match string patterns, where `%` matches any sequence of characters:

```cds live
SELECT from Authors { name }
  where name like 'E%'
```

### Range Checks

Use `between` to check whether a value falls within a range:

```cds live
SELECT from Books { title, price }
  where price between 10 and 30
```

### Null Checks

Use `is null` and `is not null` to filter for missing or present values:

```cds live
SELECT from Authors { name, dateOfDeath }
  where dateOfDeath is not null
```

[Learn more about `null` handling](./cxl#operators-xpr){.learn-more}


## Group by and having {#group-by}

`group by` aggregates rows sharing the same values in the specified elements into summary rows. Aggregate functions like `count`, `sum`, `avg`, `min`, and `max` are then applied per group.

### Grouping by a Single Element

For example, to count how many books each author has written:

```cds live
SELECT from Books {
  author.name as author,
  count(*) as numberOfBooks
} group by author.name
```

### Grouping by Multiple Elements

You can group by more than one element. For example, to get the average price per author and genre:

```cds live
SELECT from Books {
  author.name  as author,
  genre.name   as genre,
  avg(price)   as avgPrice
} group by author.name, genre.name
```

### Filtering Groups with `having` {#having}

The `having` clause filters groups after aggregation — analogous to `where` for individual rows.

For example, to find authors with more than one book:

```cds live
SELECT from Books {
  author.name  as author,
  count(*)     as numberOfBooks
} group by author.name
  having count(*) > 1
```

Or to list genres whose average book price exceeds 15:

```cds live
SELECT from Books {
  genre.name  as genre,
  avg(price)  as avgPrice
} group by genre.name
  having avg(price) > 15
```

## Order by {#order-by}

The `order by` clause sorts the result set by one or more [ordering terms](#ordering-term). The default order is ascending (`asc`); use `desc` to reverse it.

### Ordering Term {#ordering-term}

![](./assets/cql/ordering-term.drawio.svg?raw)



For example, to list books ordered by price from lowest to highest:

```cds live
SELECT from Books { title, price }
  order by price asc
```

Or from highest to lowest:

```cds live
SELECT from Books { title, price }
  order by price desc
```

You can specify several ordering terms, separated by commas. The result is sorted by the first term, then by the second for ties, and so on:

```cds live
SELECT from Books { title, author.name as author, price }
  order by author asc, price desc
```

:::info `null` handling

By default, the position of `null` values in the sort order is database-specific. Use `nulls first` or `nulls last` to make this explicit:

```cds live
SELECT from Authors { name, dateOfDeath }
  order by dateOfDeath nulls last
```

:::


### Name Resolution — Using Select List Aliases

In `order by`, identifiers are resolved against the **select list first**, then against the query source. This means you can order by an alias defined in the projection:

```cds live
SELECT from Books {
  title,
  price * stock as totalValue
} order by totalValue desc
```

::: tip
This differs from `where` and `having`, where aliases from the select list are **not** in scope — those clauses only see the query source elements.
:::

### Ordering by Path Expressions

You can also order by elements reached via path expressions:

```cds live
SELECT from Books { title, price }
  order by author.name asc, title asc
```

## Limit and Offset

`limit` restricts the number of rows returned. `offset` skips a given number of rows before returning results. Together they enable pagination.

### Limiting Results {#limit}

For example, to return only the three cheapest books:

```cds live
SELECT from Books { title, price }
  order by price asc
  limit 2
```

### Paginating with Offset {#offset}

Use `offset` together with `limit` to retrieve a specific page of results. For example, to skip the first three books and return the next three:

```cds live
SELECT from Books { title, price }
  order by price asc
  limit 1 offset 3
```

::: tip Always combine `limit`/`offset` with `order by`
Without an explicit `order by`, the order of rows is undefined and pagination results will be unpredictable.
:::

## Use enums

In queries, you can use enum symbols instead of the respective literals in places
where the corresponding type can be deduced:

```cds
type Status : String enum { open; closed; in_progress; };

entity OpenOrder as projection on Order {
  
  case status when #open        then 0
              when #in_progress then 1 end
    as status_int : Integer,

  (status = #in_progress ? 'is in progress' : 'is open')
    as status_txt : String,  
    
} where status = #open or status = #in_progress;
```


## Association Definitions

### Query-Local Mixins

Use the `mixin...into` clause to logically add unmanaged associations to the source of the query, which you can use and propagate in the query's projection. This is only supported in postfix notation.

```sql
SELECT from Books mixin {
  localized : Association to LocalizedBooks on localized.ID = ID;
} into {
  ID, localized.title
};
```

### In the select list {#select-list-associations}

Define an unmanaged association directly in the select list of the query to add the association to the view's signature. This association cannot be used in the query itself.
In contrast to mixins, these association definitions are also possible in projections.

```cds
entity BookReviews as select from Reviews {
  ...,
  subject as bookID,
  book : Association to Books on book.ID = bookID
};
```

In the ON condition you can, besides target elements, only reference elements of the select list. Elements of the query's data sources are not accessible.

This syntax can also be used to add new unmanaged associations to a projection or view via `extend`:

```cds
extend BookReviews with columns {
  subject as bookID,
  book : Association to Books on book.ID = bookID
};
```

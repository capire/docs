---
# layout: cds-ref
shorty: Expressions
synopsis: >
  Specification of the Core Expression Notation (CXN) used to capture expressions as plain JavaScript objects.
status: draft
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/855e00bd559742a3b8276fbed4af1008.html
---

<script setup>
import expr from '../assets/cxl/expr.drawio.svg?raw'
import ref from '../assets/cxl/ref.drawio.svg?raw'
import pathSegment from '../assets/cxl/path-segment.drawio.svg?raw'
import infixFilter from '../assets/cxl/infix-filter.drawio.svg?raw'
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

Expressions are represented using the Core Expression Language (CXL).
It is based on SQL expressions, so many syntax elements from SQL are also available in `CXL`.

CXL can be used in various places (TODO: Links):
- In queries as part of the select list or where clause
- In calculated elements
- In annotations, where supported


## How to read this guide { #how-to }


In the following chapters we illustrate the `CXL` syntax based on simple and more complex examples.
For a complete reference of the syntax, there are additionally clickable syntax diagrams for each language construct.

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
1. A `CXL` snippet is shown as part of a query - either in the columns or in a query modifier.
2. The corresponding **CAP Style `CXL`** is shown.
3. The equivalent **SQL Style `CXL`** is shown.
4. The resulting **SQL output** is shown in SQL syntax.
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
  title,                                    // ref
  price * quantity       as totalPrice,     // binary operator
  substring(title, 1, 3) as shortTitle,     // function call
  author.name            as authorName,     // ref with path segment
  chapters[number < 3]   as earlyChapters,  // infix filter
  exists chapters        as hasChapters,    // exists
  count(chapters)        as chapterCount,   // aggregate function
}
```

### syntax <Badge class="badge-inline" type="tip" text="💡 clickable diagram" />

<div class="diagram" v-html="expr"></div>



TODO: some text and more examples

## ref (path expression) { #ref }

A `ref` (short for reference) is used to refer to an element within the model.
It can be used to navigate along [path-segments](#path-segment). Such a navigation is often
referred to as a **path expression**.

<div class="diagram">
  <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
  <div v-html="ref"></div>
  <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> 
  <div v-html="pathSegment"></div>
</div>

### scalar element with and without table alias

In it's most simple form, a `ref` just contains the name of the element being referenced:

:::code-group
```cds
using {sap.capire.bookshop.Books} from './db/schema';

entity Ref as select from Books as B {
  title,    // [!code focus]
  B.price   // [!code focus]
}
```
```js [repl]
> q = cds.ql`SELECT from Books as B { title, B.price }`// [!code focus]
cds.ql {
  SELECT: {
    from: { ref: [ 'Books' ], as: 'B' },
    columns: [ { ref: [ 'title' ] }, { ref: [ 'B', 'price' ] } ]
  }
}
> await q
[
  { title: 'Wuthering Heights', price: 11.11 },
  { title: 'Jane Eyre', price: 12.34 },
  { title: 'The Raven', price: 13.13 },
  { title: 'Eleonora', price: 14 },
  { title: 'Catweazle', price: 150 }
]
```
:::

In this case, the CAP Style and SQL Style `CXL` representations are almost identical:

:::code-group
```json5 [CAP Style expression]
cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
    columns: [ { ref: [ 'title' ] }, { ref: [ 'B', 'price' ] } ]
  }
}
```

```json5 [SQL Style expression]
cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
    columns: [ { ref: [ 'B', 'title' ] }, { ref: [ 'B', 'price' ] } ]
  }
}
```

```sql [SQL output]
SELECT B.title, B.price FROM sap_capire_bookshop_Books as B
```
:::

The CAP runtime only prefixes the `ref` of the `title` element with the table alias `B` when generating the SQL output.

### navigation to foreign key with multiple path-segments

A `ref` can also contain multiple [path-segments](#path-segment), e.g. to navigate associations:

:::code-group
```js
> await cds.ql`SELECT from Books as B { author.ID, genre }` // [!code focus]
[
  { author_ID: 101, genre_ID: '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { author_ID: 107, genre_ID: '11aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { author_ID: 150, genre_ID: '16aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { author_ID: 150, genre_ID: '15aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
  { author_ID: 170, genre_ID: '13aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
]
```
:::

In this case, we navigate along the association `author` and select the `ID`.
As `ID` is the implicit foreign key field of the `author` association, the resulting SQL Style `CXL` representation
contains the foreign key field `author_ID`.
For `genre` the path ends on the association, in such a case the foreign key field `genre_ID` is selected.

Both formats only deviate slightly:

:::code-group
```json5 [CAP Style expression]
cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
    columns: [ { ref: [ 'author', 'ID' ] }, { ref: [ 'genre' ] } ]
  }
}
```

```json5 [SQL Style expression]
cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
    columns: [ { ref: [ 'B', 'author_ID' ] }, { ref: [ 'B', 'genre_ID' ] } ]
  }
}
```

```sql [SQL output]
SELECT B.author_ID, B.genre_ID FROM sap_capire_bookshop_Books as B
```
:::



### navigation to non foreign key with multiple path-segments

A `ref` can also end on a non-foreign key element after navigating associations

:::code-group
```js
> q = cds.ql`SELECT from Books as B { author.name, genre.name }` // [!code focus]
cds.ql {
  SELECT: {
    from: { ref: [ 'Books' ], as: 'B' },
    columns: [ { ref: [ 'author', 'name' ] }, { ref: [ 'genre', 'name' ] } ]
  }
}
> await q
[
  { author_name: 'Emily Brontë', genre_name: 'Drama' },
  { author_name: 'Charlotte Brontë', genre_name: 'Drama' },
  { author_name: 'Edgar Allen Poe', genre_name: 'Mystery' },
  { author_name: 'Edgar Allen Poe', genre_name: 'Mystery' },
  { author_name: 'Richard Carpenter', genre_name: 'Fantasy' }
]
```
:::


In this case, a little more happens under the hood. As the `ref` ends on non-foreign key elements (`name` of `author` and `genre`),
the CAP runtime automatically adds the necessary joins to the SQL Style `CXL` representation and the resulting SQL output.

:::code-group
```json5 [CAP Style expression]
cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
    columns: [ { ref: [ 'author', 'name' ] }, { ref: [ 'genre', 'name' ] } ]
  }
}
```

```json5 [SQL Style expression]
cds.ql {
  SELECT: {
    from: {
      join: 'left',
      args: [
        {
          join: 'left',
          args: [
            { ref: [ 'sap.capire.bookshop.Books' ], as: 'B' },
            { ref: [ 'sap.capire.bookshop.Authors' ], as: 'author' }
          ],
          on: [
            { ref: [ 'author', 'ID' ] },
            '=',
            { ref: [ 'B', 'author_ID' ] }
          ]
        },
        { ref: [ 'sap.capire.bookshop.Genres' ], as: 'genre' }
      ],
      on: [ { ref: [ 'genre', 'ID' ] }, '=', { ref: [ 'B', 'genre_ID' ] } ]
    },
    columns: [
      { ref: [ 'author', 'name' ], as: 'author_name' },
      { ref: [ 'genre', 'name' ], as: 'genre_name' }
    ]
  }
}
```


```sql [SQL output]
SELECT
  author.name as author_name,
  genre.name as genre_name
FROM
  sap_capire_bookshop_Books as B
  left JOIN sap_capire_bookshop_Authors as author ON author.ID = B.author_ID
  left JOIN sap_capire_bookshop_Genres as genre ON genre.ID = B.genre_ID
```
:::

### TODO: maybe one or two more examples with structure navigation

…

### conclusion

A `ref` can be used to reference an element.
It is possible to navigate along [path-segments](#path-segment) to reference elements within the model.
This is not limited to an entities own elements, but can also be used to navigate associations to elements of related entities.

This is only the tip of the iceberg.
A path expression can be much more complex. For example, the individual [path-segments](#path-segment)
themselves can contain expressions by applying [infix-filters](#infix-filter).
More samples are shown in the upcoming sections.


## path segment <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #path-segment }

<div class="diagram" v-html="pathSegment"></div>

TODO: some text

### Structured element

```cds
extend Author with {
  address: {
    street: String;
    city: String;
  }
}
```


:::code-group
```cds
entity Structured select from Authors {
  address.street,   // [!code focus]
  address.city     // [!code focus]
}
```
```js
> q = cds.ql`SELECT from Books as B { author.name, genre.name }` // [!code focus]
```
:::

### Path segment with parameterized navigation




### Path segment with infix filter



Note: Some examples of infix-filters:

```cds
entity InfixFilter select from Authors {
  books[price > 20], as expensiveBooks            // [!code focus]
  exists books[price > 20] as hasDramaBooks   // [!code focus]
}
```

```js
await cds.ql `select from Authors { books[exists genre[name = 'Mystery']] { title, genre.name } }`
await cds.ql `select from Authors { books[exists genre[exists parent [name = 'Fiction']]] { title, genre.name } }
```

## infix filter <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #infix-filter }

<div class="diagram" v-html="infixFilter"></div>

TODO: some text

## unary operator { #unary-operator }

<div class="diagram" v-html="unaryOperator"></div>

TODO: some text

## binary operator { #binary-operator }

<div class="diagram" v-html="binaryOperator"></div>

TODO: some text

## literal value { #literal-value }

<div class="diagram" v-html="literalValue"></div>

TODO

## binding parameter { #binding-parameter }

<div class="diagram" v-html="bindingParameter"></div>

TODO: some text

💡 string and numeric literal as well as `?` are parsed as `ref`

## function <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #function }

<div class="diagram" v-html="functionDef"></div>

TODO: some text

## function args <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #function-args }

<div class="diagram" v-html="functionArgs"></div>

TODO: some text

❓ REVISIT: I dont get the `ordering term` logic - it can only be applied to exactly one parameter.
I would have expected that it can only be provided for the last parameter.

## ordering term <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #ordering-term }

<div class="diagram" v-html="orderingTerm"></div>

TODO: some text

## over-clause <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #over-clause }

<div class="diagram" v-html="overClause"></div>

## type-name <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #type-name }

TODO

## select-statement <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #select-statement }

TODO

<style>
.vp-doc :is(h2,h3):has(> .badge-inline) {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem;
}



.diagram {
  margin-top: 2em;
}

</style>


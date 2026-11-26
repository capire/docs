---
description: HCQL examples for bounded reads, search, translations, writes and custom actions.
search: false
---

# HCQL Query and Operation Examples

Part of the [HCQL guide](../hcql.md). Paths are relative to the discovered HCQL service endpoint. Examples use the [Books/Authors service](./serving.md); see [request envelopes](../hcql.md#choose-a-request-form) for sending CQL. Read/update examples assume existing rows.

<!-- #region reference -->
### Bounded Expands and Aggregation

To filter parents and expanded children independently:

```sql :cql
SELECT from Authors {
  ID, name,
  books[stock > 0 order by title limit 5] { ID, title, stock }
}
where exists books[stock > 0]
order by name
limit 10
```

The expand filter narrows returned books; `exists` selects eligible authors. Both levels are bounded. To compute summaries server-side:

```sql :cql
SELECT from Books { author.name, sum(stock) as total_stock }
group by author.name
having sum(stock) > 0
order by author.name
limit 10
```

### Search Example

```http
GET /Books?$select=ID&$search=Wuthering&$orderby=ID&$top=20
```

Corresponding CQL:

```sql :cql
SELECT from Books { ID } where $search like 'Wuthering' order by ID limit 20
```

### Localized Data

For fields tagged as `localized`, request the user's language with `Accept-Language`:

```http
GET /Books/201?$select=ID,title
Accept-Language: de
```

Corresponding CQL, with the language still supplied as an HTTP header:

```sql :cql
SELECT from Books[201] { ID, title }
```

To address translations directly, use `Foo:texts`. Generated `Foo.texts` entities are omitted from discovery; derive their logical signature from `Foo`'s metadata: all of `Foo`'s keys, `locale: Locale`, and all of `Foo`'s localized elements. Supply positional translation keys in `Foo`'s discovered key order, followed by `locale`. For example, parent keys `code, region` yield translation keys `code, region, locale`.

These examples require a localized title on `Books` and its discovered key `ID`, yielding translation keys `ID, locale`. Use a language-only locale such as `de`, not `de-DE`:

```sql :cql
SELECT from Books:texts[201,'de'] { title }
UPDATE Books:texts[201,'de'] with { title: 'Sturmhöhe' }
```

### Update One Existing Record

For a partial edit of Books row `201`:

```http
PATCH /Books/201
Content-Type: application/json

{ "stock": 23 }
```

```sql :cql
UPDATE Books[201] with { stock: 23 }
```

The [default keyed-write and SET restrictions](../hcql.md#default-public-query-restrictions) apply.

### Create, Upsert and Delete

Create multiple rows in one request:

```http
POST /Books
Content-Type: application/json

[
  { "ID": 500, "title": "New book", "stock": 10 },
  { "ID": 501, "title": "Another book", "stock": 12 }
]
```

```sql :cql
INSERT into Books { ID: 500, title: 'New book', stock: 10 },
                  { ID: 501, title: 'Another book', stock: 12 }
```

PUT updates supplied fields or creates the row:

```http
PUT /Books/500
Content-Type: application/json

{ "ID": 500, "title": "Revised book", "stock": 12 }
```

```sql :cql
UPSERT into Books { ID: 500, title: 'Revised book', stock: 12 }
```

Delete one row by its complete key:

```http
DELETE /Books/500
```

```sql :cql
DELETE from Books[500]
```

#### Nested Writes

Association payloads reference existing targets, for example `author: { ID: 101 }`. Deep updates follow compositions and [supplied collections delete unlisted children](../hcql.md#write-semantics). Prefer a targeted composed-child edit when siblings must be preserved:

```sql :cql
UPDATE Authors[101]:books[201] with { title: 'Revised title' }
```

### Custom Actions

Given corresponding unbound or bound custom actions, [discover their signatures](../hcql.md#call-actions-and-functions) first, then call:

```http
POST /submitOrder
Content-Type: application/json

{ "book": 201, "quantity": 1 }
```

```http
POST /Books/201/reserve
Content-Type: application/json

{ "quantity": 1 }
```

<!-- #endregion reference -->

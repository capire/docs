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


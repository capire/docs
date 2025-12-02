---
# layout: cds-ref
shorty: Expressions
synopsis: >
  Specification of the Core Expression Notation (CXN) used to capture expressions as plain JavaScript objects.
status: draft
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/855e00bd559742a3b8276fbed4af1008.html
---

<script setup>
import expr from '/assets/cxl/expr.drawio.svg?raw'
import ref from '/assets/cxl/ref.drawio.svg?raw'
import pathSegment from '/assets/cxl/path-segment.drawio.svg?raw'
import infixFilter from '/assets/cxl/infix-filter.drawio.svg?raw'
import unaryOperator from '/assets/cxl/unary-operator.drawio.svg?raw'
import binaryOperator from '/assets/cxl/binary-operator.drawio.svg?raw'
import literalValue from '/assets/cxl/literal-value.drawio.svg?raw'
import bindingParameter from '/assets/cxl/binding-parameter.drawio.svg?raw'
import functionDef from '/assets/cxl/function-def.drawio.svg?raw'
import functionArgs from '/assets/cxl/function-args.drawio.svg?raw'
import orderingTerm from '/assets/cxl/ordering-term.drawio.svg?raw'
import overClause from '/assets/cxl/over-clause.drawio.svg?raw'
</script>

# Core Expression Language (CXL) { #expressions }

Expressions are represented using the Core Expression Language (CXL). It is based on SQL expressions, so many syntax elements from SQL are also available in CXL.

CXL can be used in various places (TODO: Links):
- In queries as part of the select list or where clause
- In calculated elements
- In annotations, where supported

## expr <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #expr }

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

Syntax:

<div class="diagram" v-html="expr"></div>



TODO: some text and more examples

## ref <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #ref }

<div class="diagram" v-html="ref"></div>

TODO: some text

## path segment <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #path-segment }

<div class="diagram" v-html="pathSegment"></div>

TODO: some text

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
/* put the badge at the right end of the heading line, minimal changes */
.vp-doc :is(h2,h3):has(> .badge-inline) {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: .5rem;
}

/* compact, aligned badge */
.vp-doc :is(h2,h3) > .badge-inline {
  display: inline-flex;
  align-items: center;
  font-size: .75em;
  padding: .1em .4em;
  margin-left: 0; /* no need when using flex */
  vertical-align: baseline;
}
</style>


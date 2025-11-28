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
</script>

# Core Expression Language (CXL) { #expressions }

## expr <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #expr }

<div class="diagram" v-html="expr"></div>

TODO: some text

## ref <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #ref }

<div class="diagram" v-html="ref"></div>

TODO: some text

## path segment <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #path-segment }

<div class="diagram" v-html="pathSegment"></div>

TODO: some text

## infix filter <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #infix-filter }

<div class="diagram" v-html="infixFilter"></div>

TODO: some text

## literal value<Badge class="badge-inline" type="tip" text="💡 clickable diagram" />  { #literal-value }

TODO

## function args <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #function-args }

TODO

## over-clause <Badge class="badge-inline" type="tip" text="💡 clickable diagram" /> { #over-clause }

TODO

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


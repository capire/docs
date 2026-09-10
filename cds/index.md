---
description: >
  Core Data Services (CDS) is CAP's modeling language for declaratively capturing service definitions, data models, queries, and expressions.
---

# Core Data Services (CDS)
Language Reference Documentation
{ .subtitle}

CDS is the backbone of the SAP Cloud Application Programming Model (CAP). It provides the means to declaratively capture service definitions and data models, queries, and expressions. The CDS toolkit allows to parse from a variety of source languages into a uniform format and to compile it into various target languages.

!["The graphic is explained in the accompanying text."](./assets/csn.drawio.svg)

At runtime, CDS models are plain JavaScript objects complying to the _[Core Schema Notation (CSN)](./csn)_, an open specification derived from [JSON Schema](https://json-schema.org/). You can easily create or interpret these models, which foster extensions by 3rd-party contributions. Models are processed dynamically at runtime and can also be created dynamically.

> We use the terms _CDS_ or _CDS models_ as synonym to your models written in CDL.

[See the Nature of Models for more details](models){.learn-more}

<script setup>
import { data as pages } from './index.data.ts'
</script>

<br>
<IndexList :pages='pages' />

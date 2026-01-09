---
index: 77
breadcrumbs:
  - Cookbook
  - Extensibility
synopsis: >
  Learn here about intrinsic capabilities to extend your applications in verticalization
  and customization scenarios.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
---

# Extensibility

{{ $frontmatter.synopsis }}

Extensibility of CAP applications is greatly fueled by **CDS Aspects**, which allow to easily extend existing models with new fields, entities, relationships, or new or overridden annotations [&rarr; Learn more about using CDS Aspects in the Domain Modeling guide](../domain/index#separation-of-concerns).

![This screenshot is explained in the accompanying text.](assets/extensibility.drawio.svg)

As illustrated in the graphic above, different parties can build and deploy CDS Aspects-based extensions:

- **Customizations** – Customers/Subscribers of SaaS solutions need options to tailor these to their needs, again using CDS Aspects to add custom fields and entities.

- **Toggled Features** – SaaS providers can offer pre-built enhancement features, which can be switched on selectively per tenant using Feature Toggles, for example, specialization for selected industries.

- **Composition** – Finally, 3rd parties can provide pre-built extension packages for reuse, which customers can pick and compose into own solutions.

- **Verticalization** – 3rd parties can provide verticalized versions of a given base application, which they can in turn operate as verticalized SaaS apps.

<br>

The following guides give detailed information to each of these options.

<script setup>
import { data as pages } from './index.data.ts'
</script>

<IndexList :pages='pages' />

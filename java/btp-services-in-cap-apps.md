---
synopsis: >
  This section covers how CAP Java applications can integrate with SAP BTP services using CAP plugins.
status: released
---

# Integrate CAP Applications

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

CAP Java offers a [variety of plugins that integrate with SAP BTP services](../plugins/). To use a plugin in your CAP Java application, add the corresponding Maven dependency to your `pom.xml`. Depending on the plugin, you may also need to add or modify your CDS model. Refer to the [plugin documentation](../plugins/#as-plugin-for-cap-java) for plugin-specific setup instructions.

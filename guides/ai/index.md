# Native AI

CAP provides intrinsic support for integrating native AI capabilities, including the use of MCP services, CAP-level Agents, and Vector Embeddings.
{.abstract}

[[toc]]

### [CAP-level MCP Services](./cap-mcp.md)

Easily serve your CAP services via [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

```cds
@mcp service CatalogService {
   entity Books { ... }             // served via `query` tool
   entity Authors { ... }            // served via `query` tool
   action submitOrder (...)          // served via `call` tool
}
```


### [CAP-level Agents](./cap-agents.md)

Easily turn your CAP services into agents, served via [Agent-to-Agent Protocol (A2A)](https://a2a-protocol.org).

```cds
@agent service CatalogService { ... }
```



### [Vector Embeddings](./embeddings.md)

Learn how to leverage vector embeddings, as supported by SAP HANA, to enable advanced AI-driven search and recommendations.

```cds
entity Incidents { //...
  embedding : Vector = vector_embedding(
    'Title: ' || title || ', Summary: ' || summary,
    'DOCUMENT', 'SAP_GXY.20250407'
  ) stored;
}
```


### [The XTravels Sample](./xtravels-sample.md)

Explore a comprehensive example of integrating CAP-level agents, MCP services, and vector embeddings within a travel planning application.

### [Integration with Joule](./joule-integration.md)

Learn how to integrate CAP applications with SAP Joule Work and SAP Joule Studio to enhance AI-driven capabilities and workflows.

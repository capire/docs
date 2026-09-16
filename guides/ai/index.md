# Native AI

CAP provides intrinsic support for integrating native AI capabilities, including the use of MCP services, CAP-level Agents, and Vector Embeddings.
{.abstract}

[[toc]]

### [CAP-native Embeddings](./embeddings.md)

Learn how to leverage vector embeddings, as supported by SAP HANA, to enable advanced AI-driven search and recommendations.

```cds
entity Incidents { //...
  embedding : Vector = vector_embedding( // [!code focus]
    'Title: ' || title || ', Summary: ' || summary,
    'DOCUMENT', 'SAP_GXY.20250407'
  ) stored;
}
```



### [CAP-level MCP Services](./cap-mcp.md)

Easily serve your CAP services via _Model Context Protocol (MCP)_.

```cds
@mcp service CatalogService { // [!code focus]
   entity Books { ... }      //> served via `query` tool
   entity Authors { ... }    //> served via `query` tool
   action submitOrder (...)  //> served via `call` tool
}
```


### [CAP-level Agents](./cap-agents.md)

Easily turn your CAP services into agents, served via _Agent-to-Agent Protocol (A2A)_.

```cds
@agent service TravelAgentService { // [!code focus]
  @readonly entity Travelers { ... }
  @agent.hitl action createItinerary (...)  //> human-in-the-loop action
}
```


### [The XTravels Sample](./xtravels-sample.md)

Explore a comprehensive example of integrating CAP-level agents, MCP services, and vector embeddings within a travel planning application.

![Architecture diagram showing an Agent connected to Travels, Events, Hotels, and Flights services. Travels supports showing travel requests and approve or reject actions; Events supports browsing events and booking tickets; Hotels supports browsing hotels and booking rooms; Flights supports browsing airports and flights and booking seats. The diagram presents a clear, neutral overview of an integrated travel-planning system.](xtravels-agentic.drawio.svg)

### [Integration with Joule](./joule-integration.md)

Learn how to integrate CAP applications with SAP Joule Work and SAP Joule Studio to enhance AI-driven capabilities and workflows.

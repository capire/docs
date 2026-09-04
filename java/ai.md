---
description: >
  This section describes AI integration in CAP Java: building agents on top of your
  CDS services and configuring the LLM chat models they use.
---

# AI Integration { #ai }

<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.description }}

<!--- % include links.md %} -->

## Agents <Alpha /> { #ai-agents }

An agent turns a CDS service into a conversational endpoint. It answers natural-language
requests by using the service's entities, actions, and functions as tools, backed by an
LLM. Agents speak the [A2A protocol](https://a2a-protocol.org/), so any A2A-compatible
client can talk to them.

### Adding the Dependency

Add the agent adapter to your `srv/pom.xml`:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-adapter-agent</artifactId>
</dependency>
```

### Defining an Agent

Annotate a service with `@agent` to expose it as an agent:

```cds
@agent
service CatalogService {
  entity Books as projection on my.Books;
  action orderBook(book: Books:ID, quantity: Integer);
}
```

The agent exposes all entities and actions of the service as tools:

- Entities become query tools, so the LLM can read data via CDS QL.
- Actions and functions become callable tools, invoked by name.

By default the agent is served under `/a2a/<service-path>`, with its
[agent card](https://a2a-protocol.org/latest/topics/agent-discovery/) available at the
corresponding `.../card` endpoint. Change the base path with `cds.agent.endpoint.path`.

During development, a built-in chat UI lets you try out your agents in the browser. It's
enabled by default and can be turned off with `cds.agent.preview.enabled: false`.

### Customizing an Agent

Without further configuration, the agent derives a system prompt and its advertised skills
from the CDS model. To customize both, add resources under `<ServiceName>-agent/` on the
classpath (for example `srv/src/main/resources/CatalogService-agent/`):

```txt
CatalogService-agent/
├── AGENTS.md                     # system prompt + agent card metadata
└── skills/
    ├── browse-books/SKILL.md
    └── order-book/SKILL.md
```

`AGENTS.md` holds the system prompt as its body, with optional YAML frontmatter for the
agent card:

```md
---
name: Bookshop Assistant
version: 2.0.0
description: Helps customers browse and order books
---
You are a helpful bookshop assistant. Help customers find and order books.
Always use the provided tools to answer questions — do not make up data.
```

Each `skills/<id>/SKILL.md` describes one skill advertised in the agent card:

```md
---
name: browse-books
description: Browse and search the book catalog
metadata:
  tags: [books, catalog]
  examples:
    - Show me all available books
    - Find books about Java
---
Use this skill to browse the book catalog.
```

## Chat Model Configuration <Alpha /> { #ai-chat-config }

Agents use a named chat model configuration. Configure models under `cds.ai.chat.models`,
where the key is the configuration name:

```yaml
cds:
  ai.chat.models:
    llm:
      kind: aicore
      model: anthropic--claude-4.6-sonnet
      temperature: 0.0
```

| Property      | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `kind`        | The model provider: `aicore`, `ollama`, or `mocked`.               |
| `model`       | The provider-specific model name.                                  |
| `temperature` | Sampling temperature (`0.0`–`1.0`). Defaults to the provider's.    |
| `options`     | Additional provider-specific parameters.                           |

An agent picks its model configuration via the `@agent.llm` annotation, which defaults to
the configuration named `llm`. If no configuration matches, CAP Java falls back to `aicore`
when an SAP AI Core service binding is present, and to `mocked` otherwise.

To bind a specific configuration to an agent, define it under a name of your choice and
reference it with `@agent.llm`:

```yaml
cds:
  ai.chat.models:
    llm:
      kind: aicore
      model: anthropic--claude-4.6-sonnet
    reasoning:
      kind: aicore
      model: anthropic--claude-4.8-opus
      temperature: 0.2
```

```cds
@agent
@agent.llm: 'reasoning'   // use the 'reasoning' config instead of the default model
service CatalogService { ... }
```

### SAP AI Core

With an `aicore` service binding, requests run through
[SAP AI Core orchestration](https://help.sap.com/docs/sap-ai-core). Set `model` to the
model you want to use; if omitted, a default model is used.

### Running Locally with Ollama

To run an agent against a local model served by [Ollama](https://ollama.com/), pull a model
(for example `ollama pull gemma4:26b`) and point a configuration at it:

```yaml
cds:
  ai.chat.models:
    llm:
      kind: ollama
      model: gemma4:26b               # a model pulled in Ollama
      # options:
      #   url: http://localhost:11434  # Ollama base URL (this is the default)
```

Add the LangChain4j Ollama integration to your `srv/pom.xml`:

```xml
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j-ollama</artifactId>
  <!-- import langchain4j-bom for version management -->
  <!-- and use same version as shipped with CAP Java -->
</dependency>
```

::: tip Testcontainers
Alternatively, Ollama can be started via [Testcontainers](https://testcontainers.com/) for
local tests. Note that reasoning on a containerized model can be slow.
:::

### Mocked

The `mocked` kind returns static responses without calling any model. It's the default when
no other provider is configured or bound, which keeps local runs and tests working out of
the box.

## Vector Embeddings { #vector-embeddings }

In CDS, [vector embeddings](../guides/ai/embeddings) are stored in elements of type `Vector`.

CAP Java supports the `Vector` type on SAP HANA and, for local testing, on H2 and SQLite; PostgreSQL support is beta and requires the [pgvector](https://github.com/pgvector/pgvector) extension. See [Database-Specific Considerations](../guides/ai/embeddings#database-specific-considerations) for per-database behavior.

In CAP Java, vectors are represented by the `CdsVector` type, which allows a unified handling of different vector representations such as `float[]` and `String`:

```Java
// Vector embedding of text via SAP Cloud SDK for AI
float[] embedding = embeddingModel.embedding(
  new OpenAiEmbeddingRequest(List.of(text))).getEmbeddingVectors().get(0);

CdsVector v1 = CdsVector.of(embedding); // float[] format
```

::: info
In CDS QL queries, elements of type `Vector` are excluded from the select list by default.
:::

CAP Java supports multiple [vector functions](./working-with-cql/query-api.md#vector-functions) that allow you to compute vector embeddings, similarity, and distance directly in the database.

---
description: >
  How to store and generate vector embeddings in CDS models to enable semantic search and other generative AI features.
---
# Vector Embeddings

Vector embeddings convert unstructured content (text, images, and so on) into numeric vectors that encode semantics (meaning). Comparing these vectors enables semantic search, recommendations, and enhanced generative AI features in your CAP application. For example retrieving related records, ranking results by relevance, or augmenting prompts for LLMs.

## Choose an Embedding Model

Choose an embedding model that fits your use case and data (for example English or multilingual text). The model determines the number of dimensions of the resulting output vector. Check the documentation of the respective embedding model for details.

Use the [SAP Generative AI Hub](https://www.sap.com/products/artificial-intelligence/generative-ai-hub.html) for unified consumption of embedding models and LLMs across different vendors and open-source models. Check for available models on the [SAP AI Launchpad](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad-user-guide/models-and-scenarios-in-generative-ai-hub-fef463b24bff4f44a33e98bb1e4f3148#models).

## Add Embeddings to Your CDS Model
Use the built-in CDL [Vector type](../../cds/types) to store embeddings. Use `Vector` without specifying a dimension to simplify changing the embedding model. If you specify a vector dimension, make sure it matches the embedding model (for example, 768 for *SAP_GXY.20250407*).

```cds
extend Incidents with {
  embedding : Vector;
}
```

## Generate Embeddings
Use an embedding model to convert your data (for example, incident titles and summaries) into vectors.

:::warning Evolve embeddings with your model
Store embeddings when you create or update your data. Regenerate embeddings if you change your embedding model.
:::

### Generate Embeddings on the Database

To generate vector embeddings on write in SAP HANA, you can use the [vector_embedding](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/vector-embedding-function-vector) function as calculated element [on-write](../../cds/cdl#on-write) with embedding models from [SAP HANA NLP](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide/creating-text-embeddings-with-nlp-51eb170d038d4099a9bbb85c08fda888) or a configured remote source from SAP AI Core:

```cds
extend Incidents with {
  @cds.api.ignore
  embedding : Vector = vector_embedding(
    'Title: ' || title || ', Summary: ' || summary,
    'DOCUMENT', 'SAP_GXY.20250407'
  ) stored;
}
```

:::tip Prefer calculated elements for vector embeddings
If the database calculates vector embeddings on write it automatically regenerates the embedding if the input data changes.
:::

::: info Local Testing with H2 and SQLite
On H2 and SQLite the `CQL.vectorEmbedding` function is emulated to support local testing. Both runtimes support a hash-based mock embedding as well as local [ONNX](https://onnx.ai) embedding models — CAP Java via LangChain4j, CAP Node.js via the [`@cap-js/ai`](https://github.com/cap-js/ai) plugin (experimental, local development only). <Beta/> See [SQLite](#sqlite) below for the CAP Node.js setup.
:::

> [!warning] <Beta/> and not supported on PostgreSQL
> The `vector_embedding` function is currently in beta and not supported on PostgreSQL.

[Learn more about Vector Embeddings in CAP Java](../../java/cds-data#vector-embeddings) {.learn-more}

### Generate Embeddings Programmatically

Alternatively, you can compute vector embeddings in your application layer using the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) to call SAP AI Core services for generating embeddings.

:::details Example using SAP Cloud SDK for AI
```Java
String question = "Are there patterns with overheating solar inverters?";
var request = OrchestrationEmbeddingRequest
                .forModel(TEXT_EMBEDDING_3_SMALL)
                .forInputs(question).asQuery();
OrchestrationEmbeddingResponse response = client.embed(request);
float[] embedding = response.getEmbeddingVectors().get(0);

CdsVector vector = CdsVector.of(embedding);
```
:::

:::tip Use SAP Cloud SDK for AI
Use the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) for unified access to embedding models and large language models (LLMs) from [SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/what-is-sap-ai-core).
:::

Learn more about the [SAP Cloud SDK for AI (Java)](https://sap.github.io/ai-sdk/docs/java/getting-started) or the [SAP Cloud SDK for AI (JavaScript)](https://sap.github.io/ai-sdk/docs/js/getting-started) {.learn-more}

## Query for Similarity
At runtime, use vector functions to search for similar items. In an example Retrieval-Augmented Generation (RAG) scenario, use `CQL.cosineSimilarity` to enhance the context of a user query for the LLM. First, compute the vector embedding of the user query and use it to find related incidents.

::: code-group
```Java [Java]
// Compute embedding for user question
var query = CQL.val(
  "Any incidents with solar inverters this month? How were they resolved?");
var embedding = CQL.vectorEmbedding(query, TextType.QUERY, "SAP_GXY.20250407");

// Compute similarity between user question and incident embeddings
var similarity = CQL.cosineSimilarity(CQL.get(Incidents.EMBEDDING), embedding);

// Find Incidents related to user question ordered by relevance
Select.from(INCIDENTS)
   .columns(i -> similarity.times(100).as("relevance"),
            i -> i.ID(), i -> i.title(), i -> i.summary(), i -> i.date())
   .where(i -> similarity.gt(0.75))
   .orderBy(i -> i.get("relevance").desc());
```

```js [Node.js]
const question =
  'Any incidents with solar inverters this month? How were they resolved?'

// Compute the question's embedding and find related incidents, all in the database
const similarIncidents = await SELECT.from('Incidents').where`
  cosine_similarity(embedding,
    vector_embedding(${question}, 'QUERY', 'SAP_GXY.20250407')) > 0.75`
```
:::

## Vector Functions

CAP provides equivalent implementations of vector functions for all supported databases based on the function signatures as defined in SAP HANA.

[Learn more about Vector Functions in CAP Java](../../java/working-with-cql/query-api#vector-functions) {.learn-more}

### [cosine_similarity](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/cosine-similarity-function-vector)
```
cosine_similarity(vector1, vector2) → number
```

### [l2distance](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/l2distance-function-vector)
```
l2distance(vector1, vector2) → number
```

### [l2normalize](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/normalize-function-vector)
```
l2normalize(vector) → vector
```

### [vector_embedding](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/vector-embedding-function-vector)
```
vector_embedding(text, text_type, model_name) → vector
vector_embedding(text, text_type, model_name, remote_source) → vector
```

## Database-Specific Considerations

### SQLite
- Hash-based, deterministic `vector_embedding` implementation by default, suitable for local testing.
- In CAP Node.js, the [`@cap-js/ai`](https://github.com/cap-js/ai) plugin makes the standard `sqlite` database generate real embeddings locally with an [ONNX](https://onnx.ai) model, without any external service. It is experimental and intended for local development only. <Beta/>

  Install the plugin with its peer dependencies:
  ```sh
  npm add -D @cap-js/ai @cap-js/sqlite@^3.1 @huggingface/hub@^2.15.0 \
    @huggingface/tokenizers@0.1.3 onnxruntime-node@1.20.1
  ```
  No configuration is needed — the plugin redirects the standard `sqlite` (and `sqlite:memory`) database and downloads a default embedding model on first start. The same query runs unchanged on SAP HANA and SQLite: on SQLite the model-name argument to `vector_embedding` is ignored and the locally configured model is used. See the [`@cap-js/ai` README](https://github.com/cap-js/ai#local-vector-embeddings-with-sqlite-experimental) for version requirements, model selection, and configuration.

### PostgreSQL
- Requires that the [pgvector extension](https://github.com/pgvector/pgvector) is installed on your PostgreSQL instance. Then create the extension in your database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Vectors stored in native `vector` type
- CAP provides no built-in `vector_embedding` implementation. Compute embeddings in your application layer (see [Generate Embeddings Programmatically](#generate-embeddings-programmatically)) or define your own `vector_embedding` database function.
- For Node.js, the `pgvector` npm package is required when reading vector columns from query results or when passing vector values as parameters from the client. It is not needed if vectors are generated entirely within the database using functions like `vector_embedding()`: `npm install pgvector`

### SAP HANA
- Native vector engine with built-in support
- Type mapping: `cds.Vector` → [REAL_VECTOR](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide/real-vector-and-half-vector-data-types)
- `vector_embedding` uses embedding models from the [NLP](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-predictive-analysis-library/natural-language-processing-nlp) extension or an [SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/what-is-sap-ai-core) remote source

[Learn more about HANA Vector Engine](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide) {.learn-more}

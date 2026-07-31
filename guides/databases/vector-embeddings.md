---
label: Vector Embeddings
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

::: info Local Testing with SQLite and PostgreSQL
SAP HANA supports all vector functions including the `vector_embedding` function with real AI models. PostgreSQL supports vector functions when the pgvector extension is created, but does not support the `vector_embedding` function natively. A hash-based `vector_embedding` function is provided for both SQLite and PostgreSQL to avoid issues and crashes during development, but it is strongly recommended to override this function with a reasonable custom or third-party implementation for production use.
:::

> [!warning] Java only and <Beta/>
> The `vector_embedding` function is currently in beta and only supported by the CAP Java runtime.

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
const response = await new AzureOpenAiEmbeddingClient(
 'text-embedding-3-small'
).run({
 input: 'Any incidents with solar inverters this month? How were they resolved?'
});

const questionEmbedding = response.getEmbedding();
let similarIncidents = await SELECT.from('Incidents')
  .where`cosine_similarity(embedding, to_real_vector(${questionEmbedding})) > 0.75`;
```
:::

## Vector Functions

CAP provides vector functions for similarity calculations across all supported databases:

### cosine_similarity
```
cosine_similarity(vector1, vector2) → number
```
Measures vector similarity (range: -1 to 1). Returns 1 for identical vectors, 0 for orthogonal vectors, -1 for opposite vectors.

### l2distance
```
l2distance(vector1, vector2) → number
```
Calculates Euclidean distance between two vectors. Returns 0 for identical vectors.

### l2normalize
```
l2normalize(vector) → vector
```
Normalizes a vector to unit length.

### vector_embedding
```
vector_embedding(text, text_type, model_name) → vector
vector_embedding(text, text_type, model_name, remote_source) → vector
```
Generates vector embeddings from text.

**Parameters:**
- `text` - Input text to embed
- `text_type` - `'DOCUMENT'` (for storing content) or `'QUERY'` (for search queries)
- `model_name` - Model identifier (database-specific)
- `remote_source` (optional) - Remote source configuration for external embedding services (SAP HANA only)

**Database Implementation:**
- **HANA:** Uses real AI models (SAP built-in models or external remote sources)
- **SQLite & PostgreSQL:** Hash-based deterministic implementation for testing. Can be overridden by application developers to use external embedding services.

## Database-Specific Considerations

### SQLite
- Vector functions implemented as JavaScript UDFs
- Vectors stored as JSON strings
- No external dependencies required
- `vector_embedding()` uses hash-based algorithm for testing. Override the JavaScript function to use real embedding services in production.

### PostgreSQL
- Requires creating the [pgvector extension](https://github.com/pgvector/pgvector) in the database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Vectors stored in native `vector` type
- `vector_embedding()` SQL function uses hash-based algorithm for testing. Override the SQL function to use real embedding services in production.
- For Node.js, optional `pgvector` npm package for type registration: `npm install pgvector`

### SAP HANA
- Native vector engine with built-in support
- Type mapping: `cds.Vector` → `REAL_VECTOR`
- `vector_embedding()` supports built-in SAP models:
  - `SAP_NEB.20240715` (German, English, Spanish, French, Portuguese - 768 dimensions)
  - `SAP_GXY.20250407` (All above + Italian, Japanese, Chinese - 768 dimensions)
- Can use external remote sources (Azure OpenAI, SAP AI Core) as optional 4th parameter

[Learn more about HANA Vector Engine](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide) {.learn-more}



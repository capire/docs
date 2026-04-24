---
label: Vector Embeddings
---
# Vector Embeddings

Vector embeddings convert unstructured content (text, images, etc.) into numeric vectors that encode semantics (meaning). Comparing these vectors enables semantic search, recommendations, and enhanced generative AI features in your CAP application, for example retrieving related records, ranking results by relevance, or augmenting prompts for LLMs.

## Choose an Embedding Model

Choose an embedding model that fits your use case and data (for example english or multilingual text). The model determines the number of dimensions of the resulting output vector. Check the documentation of the respective embedding model for details.

Use the [SAP Generative AI Hub](https://www.sap.com/products/artificial-intelligence/generative-ai-hub.html) for unified consumption of embedding models and LLMs across different vendors and open source models. Check for available models on the [SAP AI Launchpad](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad-user-guide/models-and-scenarios-in-generative-ai-hub-fef463b24bff4f44a33e98bb1e4f3148#models).

## Add Embeddings to Your CDS Model
Use the built-in CDL [Vector](../cds/types) type in your CDS model to store embeddings. Set the vector dimensions to match the embedding model (for example, 768 for *SAP_GXY.20250407*).

```cds
extend Incidents with {
  embedding : cds.Vector(768);
}
```

## Generate Embeddings
Use an embedding model to convert your data (for example, incident summaries) into vectors.

### Generate Embeddings on the Database

To generate vector embeddings on write in SAP HANA, you can use the [vector_embedding](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/vector-embedding-function-vector) function as calculated element [on-write](../../cds/cdl#on-write) with embedding models from [SAP HANA NLP](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide/creating-text-embeddings-with-nlp-51eb170d038d4099a9bbb85c08fda888) or a configured remote source from SAP AI Core:

```cds
extend Incidents with {
  @cds.api.ignore
  embedding : Vector(768) = vector_embedding( 
    'Title: ' || title || ', Summary: ' || summary, 
    'DOCUMENT', 'SAP_GXY.20250407'
  ) stored; 
}
```

> [!warning] Java only and <Beta/>
> The `vector_embedding` function is currently in beta and only supported by the CAP Java runtime.

::: info Local Testing with H2 and SQLite
On H2 and SQLite the `CQL.vectorEmbedding` function is emulated to support local testing.
:::

### Generate Embeddings Programmatically

Alternatively, you can compute vector embeddings in your application layer using the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) to call SAP AI Core services for generating embeddings.

:::details Example using SAP Cloud SDK for AI
```Java
var aiClient = OpenAiClient.forModel(OpenAiModel.TEXT_EMBEDDING_3_SMALL);
var response = aiClient.embedding(
   new OpenAiEmbeddingRequest(List.of(book.getDescription())));
book.setEmbedding(CdsVector.of(response.getEmbeddingVectors().get(0)));
```
:::

:::tip Use SAP Cloud SDK for AI
Use the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) for unified access to embedding models and large language models (LLMs) from [SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/what-is-sap-ai-core).
:::

Learn more about the [SAP Cloud SDK for AI (Java)](https://sap.github.io/ai-sdk/docs/java/getting-started) or the [SAP Cloud SDK for AI (JavaScript)](https://sap.github.io/ai-sdk/docs/js/getting-started) {.learn-more}

## Query for Similarity
At runtime, use vector functions to search for similar items. For example, find incidents that are relevant to a user question:

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
   .where(i -> similarity.gt(0.75f))
   .orderBy(i -> i.get("relevance").desc());
```
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

:::tip Evolve embeddings with your model
Store embeddings when you create or update your data. Regenerate embeddings if you change your embedding model.
:::


[Learn more about Vector Embeddings in CAP Java](../../java/cds-data#vector-embeddings) {.learn-more}

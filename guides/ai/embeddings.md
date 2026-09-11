---
description: >
  How to store and generate vector embeddings in CDS models to enable semantic search and other generative AI features.
---
# Vector Embeddings

Use vector embeddings to convert unstructured content (text, images, and so on) into numeric vectors, which can then be compared to measure similarity. This enables semantic search, recommendations, and enhanced generative AI features in your CAP application.
{.abstract}

[[toc]]

## Choose an Embedding Model

Choose an embedding model that fits your use case and data (for example English or multilingual text). The model determines the number of dimensions of the resulting output vector. Check the documentation of the respective embedding model for details.

Use the [SAP Generative AI Hub](https://www.sap.com/products/artificial-intelligence/generative-ai-hub.html) for unified consumption of embedding models and LLMs across different vendors and open-source models. Check for available models on the [SAP AI Launchpad](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad-user-guide/models-and-scenarios-in-generative-ai-hub-fef463b24bff4f44a33e98bb1e4f3148#models).


## Adding Embeddings

### Using built-in type `Vector`

Use the built-in [Vector type](../../cds/types) to declare Vector elements in CDS.


```cds
extend Incidents with {
  embedding : Vector;
}
```

Use `Vector` without specifying a dimension to simplify changing the embedding model. If you specify a vector dimension, make sure it matches the embedding model (for example, 768 for *SAP_GXY.20250407*).

### Using Calculated Elements

You can define calculated elements in your CDS model to automatically generate embeddings based on other fields. This ensures that embeddings are always up-to-date with the source data.

For example, you can create a calculated element that generates an embedding from the `title` and `summary` fields of an `Incidents` entity.

```cds
extend Incidents with {
  embedding : Vector = vector_embedding(
    'Title: ' || title || ', Summary: ' || summary,
    'DOCUMENT', 'SAP_GXY.20250407'
  ) stored;
}
```

:::tip Calculated elements for vector embeddings
If the database calculates vector embeddings on-write it automatically regenerates the embedding if the input data changes.
:::

::: warning Embedding localized elements
A stored ([on-write](../../cds/cdl#on-write)) calculated element **cannot** reference [localized](../uis/localized-data) elements. Instead, embed the default language and use a **multilingual embedding model** so that queries in other languages still match.
:::


### Using SAP Cloud SDK for AI

Alternatively, you can compute vector embeddings programmatically using the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) to call SAP AI Core services for generating embeddings. For example:

:::code-group
```java
String question = "Are there patterns with overheating solar inverters?";
var request = OrchestrationEmbeddingRequest
  .forModel(TEXT_EMBEDDING_3_SMALL)
  .forInputs(question).asQuery();
OrchestrationEmbeddingResponse response = client.embed(request);
float[] embedding = response.getEmbeddingVectors().get(0);

CdsVector vector = CdsVector.of(embedding);
```
:::


> [!warning] Evolve embeddings with your model
> Store embeddings when you create or update your data. Regenerate embeddings if you change your embedding model.


## Using Embeddings

Use vector functions documented below in CQL statements to perform similarity searches and other operations on embeddings. Their behavior is based on the implementations from SAP HANA. CAP supports these functions across all supported databases.

In CAP Node.js you can use these vector functions directly in your CQL queries; for CAP Java, [see respective documentation](../../java/working-with-cql/query-api#vector-functions).


### Query for Similarity

Following is an example for a Retrieval-Augmented Generation (RAG) scenario. We use [`cosine_similarity`](#cosine_similarity) to enhance the context of a user query for the LLM. To do this, we first compute the [`vector_embedding`](#vector_embedding) of a user input.

::: code-group
```js [Node.js]
const question = 'Fetch incidents with solar inverters. How were they resolved?'
const incidents = await SELECT.from`Incidents`
  .where`cosine_similarity (embedding,
    vector_embedding (${question}, 'QUERY', 'SAP_GXY.20250407')
  ) > 0.75`
```
```Java [Java]
// Compute embedding for user question
var query = CQL.val("Fetch incidents with solar inverters. How were they resolved?");
var embedding = CQL.vectorEmbedding(query, TextType.QUERY, "SAP_GXY.20250407");

// Compute similarity between user question and incident embeddings
var similarity = CQL.cosineSimilarity(CQL.get(Incidents.EMBEDDING), embedding);

// Find Incidents related to user question
Select.from(INCIDENTS)
   .columns(i -> i.ID(), i -> i.title(), i -> i.summary(), i -> i.date())
   .where(i -> similarity.gt(0.75));
```
:::



### `cosine_similarity` {.method}

Computes the cosine of the angle between `vector1` and `vector2`, comparing the direction of the vectors. Both vectors must have the same dimension.

```tsx
function cosine_similarity (vector1, vector2) => Double in [-1,1]
```

In the context of embeddings, both vectors must be from the same embedding model configuration. With modern embedding models, the result is between 0 (no similarity) and 1 (semantic match).

[Learn more in the SAP HANA documentation](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/cosine-similarity-function-vector) {.learn-more}


  ### `l2distance` {.method}

  Computes the Euclidean distance (L2 norm) between `vector1` and `vector2`. Both vectors must have the same dimension.

```tsx
function l2distance (vector1, vector2) => Double >= 0
```

In the context of embeddings, both vectors must be from the same embedding model configuration. The closer the result to 0, the higher the semantic similarity.

[Learn more in the SAP HANA documentation](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/l2distance-function-vector) {.learn-more}

### `l2normalize` {.method}

Normalizes the length of `vector` to 1 while keeping the direction. This can help to get more robust floating-point precision results.

```tsx
function l2normalize (vector) => Vector
```

[Learn more in the SAP HANA documentation](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/l2normalize-function-vector) {.learn-more}


### `vector_embedding` {.method}

Creates a vector embedding from a given `text`.

```tsx
function vector_embedding (text, text_type, model_name) => Vector
function vector_embedding (text, text_type, model_name, remote_source) => Vector
```

[Learn more in the SAP HANA documentation](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-sql-reference-guide/vector-embedding-function-vector) {.learn-more}

[Learn more about Vector Embeddings in CAP Java](../../java/cds-data#vector-embeddings) {.learn-more}

> [!info] Emulated in SQLite and H2 <Beta/>
> On SQLite and H2 the `vector_embedding` function is emulated for local testing, with optional local [ONNX](https://onnx.ai) models for semantic embeddings. See [SQLite and H2](#sqlite-and-h2) for setup details. It is not supported on PostgreSQL.



## SQLite and H2

On SQLite and H2, the `vector_embedding` function is emulated using lexical character-hash vectors by default. These capture surface (character-n-gram) overlap, not meaning. To compute semantic embeddings, use local [ONNX](https://onnx.ai) models.

In CAP Java, add a [LangChain4j](https://github.com/langchain4j/langchain4j/tree/main/embeddings) dependency with an ONNX model.

In CAP Node.js, the [`@cap-js/ai`](https://github.com/cap-js/ai) plugin makes the standard `sqlite` database generate semantic embeddings locally, without any external service. It requires `@sap/cds` `^10.1` and `@cap-js/sqlite` `^3.1`, and is experimental and intended for local development only. Install the plugin with its peer dependencies:

```sh
npm add -D @cap-js/ai @cap-js/sqlite@^3.1 @huggingface/hub@^2.15.0 \
  @huggingface/tokenizers@0.1.3 onnxruntime-node@1.20.1
```

No configuration is needed — the plugin redirects the standard `sqlite` (and `sqlite:memory`) database and downloads a default embedding model on first start. Both the on-write calculated element from [Generate Embeddings on the Database](#generate-embeddings-on-the-database) and the query-time `vector_embedding` calls then run locally against that model. The same query runs unchanged on SAP HANA and SQLite: on SQLite the model-name argument to `vector_embedding` is ignored and the locally configured model is used. See the [`@cap-js/ai` README](https://github.com/cap-js/ai#local-vector-embeddings-with-sqlite-experimental) for version requirements, model selection, and configuration.

## PostgreSQL

- Requires that the [pgvector extension](https://github.com/pgvector/pgvector) is installed on your PostgreSQL instance. Then create the extension in your database:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- Vectors stored in native `vector` type
- CAP provides no built-in `vector_embedding` implementation. Compute embeddings in your application layer (see [Generate Embeddings Programmatically](#generate-embeddings-programmatically)) or define your own `vector_embedding` database function.
- For Node.js, the `pgvector` npm package is required when reading vector columns from query results or when passing vector values as parameters from the client. It is not needed if vectors are generated entirely within the database using functions like `vector_embedding()`: `npm install pgvector`

## SAP HANA

- Native vector engine with built-in support
- Type mapping: `cds.Vector` → [REAL_VECTOR](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide/real-vector-and-half-vector-data-types)
- `vector_embedding` uses embedding models from the [NLP](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-predictive-analysis-library/natural-language-processing-nlp) extension or an [SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/what-is-sap-ai-core) remote source

[Learn more about HANA Vector Engine](https://help.sap.com/docs/hana-cloud-database/sap-hana-cloud-sap-hana-database-vector-engine-guide) {.learn-more}

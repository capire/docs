---
label: Vector Embeddings
---
# Vector Embeddings

Vector embeddings let you add semantic search, recommendations, and generative AI features to your CAP application. Embeddings are numeric arrays that represent the meaning of unstructured data (text, images, etc.), making it possible to compare and search for items that are semantically related to each other or a user query.

## Choose an Embedding Model

Choose an embedding model that fits your use case and data (for example english or multilingual text). The model determines the number of dimensions of the resulting output vector. Check the documentation of the respective embedding model for details.

Use the [SAP Generative AI Hub](https://community.sap.com/t5/technology-blogs-by-sap/how-sap-s-generative-ai-hub-facilitates-embedded-trustworthy-and-reliable/ba-p/13596153) for unified consumption of embedding models and LLMs across different vendors and open source models. Check for available models on the [SAP AI Launchpad](https://help.sap.com/docs/ai-launchpad/sap-ai-launchpad-user-guide/models-and-scenarios-in-generative-ai-hub-fef463b24bff4f44a33e98bb1e4f3148#models).

## Add Embeddings to Your CDS Model
Use the `cds.Vector` type in your CDS model to store embeddings on SAP HANA Cloud. Set the dimension to match your embedding model (for example, 1536 embedding dimensions for OpenAI *text-embedding-3-small*).

   ```cds
   entity Books : cuid {
     title       : String(111);
     description : LargeString;
     embedding   : Vector(1536); // adjust dimensions to embedding model
   }
   ```

## Generate Embeddings
Use an embedding model to convert your data (for example, book descriptions) into vectors. The [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) makes it easy to call SAP AI Core services to generate these embeddings.

:::details Example using SAP Cloud SDK for AI
```Java
var aiClient = OpenAiClient.forModel(OpenAiModel.TEXT_EMBEDDING_3_SMALL);
var response = aiClient.embedding(
   new OpenAiEmbeddingRequest(List.of(book.getDescription())));
book.setEmbedding(CdsVector.of(response.getEmbeddingVectors().get(0)));
```
:::

## Query for Similarity
At runtime, use SAP HANA's built-in vector functions to search for similar items. For example, find books with embeddings similar to a user question:

::: code-group
```Java [Java]
// Compute embedding for user question
var request = new OpenAiEmbeddingRequest(List.of("How to use vector embeddings in CAP?"));
CdsVector userQuestion = CdsVector.of(
 aiClient.embedding(request).getEmbeddingVectors().get(0));

// Compute similarity between user question and book embeddings
var similarity = CQL.cosineSimilarity( // computed on SAP HANA
  CQL.get(Books.EMBEDDING), userQuestion);

// Find Books related to user question ordered by similarity
hana.run(Select.from(BOOKS).limit(10)
  .columns(b -> b.ID(), b -> b.title(), b -> similarity.as("similarity"))
  .orderBy(b -> b.get("similarity").desc())
);
```

```js [Node.js]
const response = await new AzureOpenAiEmbeddingClient(
 'text-embedding-3-small'
).run({
 input: 'How to use vector embeddings in CAP?'
});

const questionEmbedding = response.getEmbedding();
let similarBooks = await SELECT.from('Books')
  .where`cosine_similarity(embedding, to_real_vector(${questionEmbedding})) > 0.9`;
```
:::

:::tip Evolve embeddings with your model
Store embeddings when you create or update your data. Regenerate embeddings if you change your embedding model.
:::

:::tip Use SAP Cloud SDK for AI
Use the [SAP Cloud SDK for AI](https://sap.github.io/ai-sdk/) for unified access to embedding models and large language models (LLMs) from [SAP AI Core](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/what-is-sap-ai-core).
:::

Learn more about the [SAP Cloud SDK for AI (Java)](https://sap.github.io/ai-sdk/docs/java/getting-started) or the [SAP Cloud SDK for AI (JavaScript)](https://sap.github.io/ai-sdk/docs/js/getting-started) {.learn-more}

[Learn more about Vector Embeddings in CAP Java](../../java/cds-data#vector-embeddings) {.learn-more}

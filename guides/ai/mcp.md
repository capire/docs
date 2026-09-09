---
description: >
  Expose CAP services via the Model Context Protocol for seamless AI agent integration.
---

# Model Context Protocol Adapter

Simply annotate a CAP service with the [`@mcp`](#serving-mcp) annotation to expose it via [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). With that it becomes accessible to AI agents and LLM-powered tools without additional implementation work.
{.abstract}

> [!caution] SAP API Policy Applies!
> The CAP MCP adapter is intended only for exposing _custom_ CAP application services. It is **_NOT_**{.red} an SAP-endorsed architecture or pathway for exposing, proxying, or providing agentic access to _SAP Application APIs_ as referred to in the [_SAP API Policy_](https://help.sap.com/doc/sap-api-policy), section 2.2.2. -> Read section [_SAP API Policy_](#sap-api-policy) below!


[[toc]]


> [!note]
>
> This guide is about the *MCP Adapter* – for example, as provided through the [*@cap-js/mcp*](https://github.com/cap-js/mcp) plugin – which powers domain-specific application use cases, for example, to respond to questions for CAP-based applications like *"List all overstocked books"*.
>
> In parallel, there's also the *MCP Server* plugin ([*@cap-js/mcp-server*](https://github.com/cap-js/mcp-server)), which serves a different purpose, though, that is: AI-assisted *development* of CAP projects.



## Add the MCP Plugin


### In CAP Node.js Projects

Within your project root run this to add the [`@cap-js/mcp`](https://github.com/cap-js/mcp) plugin:

```shell [Node.js]
npm add @cap-js/mcp
```
### In CAP Java Projects

Add the `cds-adapter-mcp` dependency to your `srv/pom.xml`:

::: code-group
```xml [srv/pom.xml]
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-adapter-mcp</artifactId>
  <scope>runtime</scope>
</dependency>
```
:::


## Declare `@mcp` Services

### Annotate services with `@mcp`

Simply add the `@mcp` annotation to a service definition to expose it via MCP.  For example, add the following to `srv/cat-service.cds`:


::: code-group
```cds [srv/cat-service.cds]
// Serve via OData, HCQL and REST
annotate CatalogService with @odata @hcql @rest;
annotate CatalogService with @mcp; // [!code focus]
```
:::

You can also specify an alternative path under which the MCP endpoint should be served as usual with CAP protocol annotations:

```cds
annotate CatalogService with @mcp:'books'
```

> [!tip] Just Another Protocol
> From the perspective of a developer in a CAP-based project, `@mcp` is just another protocol for your services, similar to `@odata`, `@graphql`, `@rest`, or `@hcql`. The adapter takes care of the rest, with all the standard CAP features you know working out of the box also with MCP, including annotations like `@cds.query.limit`, etc.


### Tailored services for MCP use

In case you want to tailor the entities or elements served via MCP you can also create specific services for MCP and annotate only those with `@mcp`. For example, you could create a `BooksService` that only exposes a subset of the entities of the `AdminService` like that:

::: code-group
```cds [srv/books-service.cds]
using { AdminService } from './admin-service';
@mcp service BooksService {
  entity Authors as projection on AdminService.Authors {
    ID, name, books,
  }
  entity Books as projection on AdminService.Books {
    ID, title, stock, price,
    author,
    genre.name as genre,
    currency.name as currency,
  }
}
```
:::


> => See also: [_Use Case-Oriented Services_](../../get-started/bookshop#use-case-specific-services) in the getting started guide.



### Adding Context Information

As LLMs rely heavily on context information to create high-quality output, the adapter evaluates existing doc comments and annotations to provide additional information about the service, entities, elements, actions, and parameters to the LLM. This information is included in the output of the [`describe`](#-describe-service) tool and can be used by agents to better understand the data model and available actions/functions. In particular, the following information is evaluated:

- [Doc comments](../../cds/cdl#doc-comments) -> most recommended (Node.js only)
- `@title`
- `@description`

> [!note]
> Doc comments are only supported in Node.js. In Java, use `@title` and `@description` annotations instead.

For example, you can add doc comments to your entities and their elements like that:

```cds
/**
 * This is the author entity.
 * It contains information about book authors.
 */
entity Authors {
  /** The ID of the author. */
  ID : Integer;
  /** The name of the author. */
  name : String;
  /** The books written by the author. */
  books : Association to many Books;
}
```



## Test-drive Locally

As usual, and following the Calesi principles of "convention over configuration", you can run your CAP server locally and interact with it using the MCP protocol from common clients like OpenCode or Claude Code.


### Run the CAP server

Run your CAP server locally as usual using `cds watch`.

::: code-group
```shell [Node.js]
cds watch
```
```shell [Java]
mvn cds:watch
```
:::


### Using OpenCode, or alike

Assumed you have [Claude Code](https://code.claude.com/docs/en/overview) or [Opencode](https://opencode.ai/) installed, start either one in a secondary terminal, for example:

```shell
opencode
```

::: details Installing Claude Code or OpenCode ...

Install [OpenCode](https://opencode.ai/), for example via npm:
```shell
npm install -global opencode-ai
```

Install [Claude Code](https://code.claude.com/docs/en/overview), for example via Homebrew:
```shell
brew install claude-code
```

Install [Claude Code for VSCode](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code):
```shell
code --install-extension anthropic.claude-code
```

:::


![OpenCode started initially](assets/opencode-start-screen.png){.ignore-dark}



Go ahead and interact with your CAP services using natural language and conversational style via OpenCode, entering prompts like these:

```sh
list books
```
```sh
order wuthering heights
```

And answer the questions that OpenCode asks you back.

![List books and ordering books via OpenCode](assets/opencode-list-and-order-books.png){.ignore-dark}



You can also run `opencode web` to open the OpenCode web interface, which provides a more user-friendly way to interact with your MCP servers, including features like tool inspection and query building. Here's a screenshot of a simple session:

![OpenCode web interface dashboard showing a sidebar with available MCP tools and a main panel displaying query results in a table format with database records and their properties](../protocols/assets/mcp/opencode-web.png){style="width:70%"}


### Autowired MCP Clients

When we initially started OpenCode above, it indicated in the bottom line of the interface that there's (at least) one MCP server connected.

![OpenCode status line showing connected MCP servers](assets/opencode-status-line.png){.ignore-dark}

Enter `/status` in the OpenCode interface to see details, which should display the status of the connected MCP servers like this:

![OpenCode listing connected MCP servers](assets/opencode-status.png){.ignore-dark}

> [!tip] Autowired during development
> Whenever you start your CAP application with `cds watch`, all served MCP endpoints are automatically registered with local MCP clients like [Claude Code](https://code.claude.com/docs) and [OpenCode](https://opencode.ai/), so you can just go ahead and run queries from them without any additional configuration. This makes it super easy to test and interact with your services via MCP during development.


::: details Click to expand the client-specific configuration files
::: code-group
```json [~/.claude.json]
{
  "mcpServers": {
    "cds:AdminService": {
      "type": "http",
      "url": "http://localhost:4004/mcp/admin",
      "headers": {
        "Authorization": "Basic YWxpY2U6"
      }
    },
    "cds:CatalogService": {
      "type": "http",
      "url": "http://localhost:4004/mcp/browse",
      "headers": {
        "Authorization": "Basic YWxpY2U6"
      }
    }
  },
}
```
```json [~/.config/opencode/opencode.json]
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "cds:AdminService": {
      "type": "remote",
      "url": "http://localhost:4004/mcp/admin",
      "headers": {
        "Authorization": "Basic YWxpY2U6"
      },
      "enabled": true
    },
    "cds:CatalogService": {
      "type": "remote",
      "url": "http://localhost:4004/mcp/browse",
      "headers": {
        "Authorization": "Basic YWxpY2U6"
      },
      "enabled": true
    }
  }
}
```
:::




### Inspect Log Output

When you run queries, you can inspect the log output of your CAP server to see the incoming MCP requests and how they are processed. This can be helpful for debugging and understanding the interaction between the MCP client and your CAP services.

For example, for the above query, you should see log output similar to this:

::: code-group
```js [Node.js]
[mcp] - query {
  service: 'CatalogService',
  cql: 'SELECT ID, title, author, genre, stock, price FROM ListOfBooks'
}
```
```js [Java]
INFO com.sap.cds.adapter.mcp.McpServlet : Received MCP query request for entity 'Books' with select fields [ID, title, author.name, genre.name, stock, price] and limit 20
```
:::


## Served out of the box

The adapter creates an MCP server per CAP service, hence each CAP application can expose multiple MCP servers. By default, the adapter creates three generic tools, [`describe`](#-describe-service), [`query`](#-query-entity), and [`call`](#-call-action), for each MCP server, which can be used by LLMs and AI agents to interact with the service.

the following tools for each MCP server, which can be used by LLMs and AI agents to interact with the service.

> [!warning]
> Tools are meant to be used by LLMs and AI agents and do not constitute a stable API.
> They may change in the future based on the needs of LLMs and AI agents. For stable APIs, please use the existing CAP protocols like OData, REST, GraphQL, etc.

### • `describe` service {.tool}

This tool returns information about the entities and their elements exposed by the service. It also returns information about unbound actions and functions. If you do not provide a parameter, the tool describes all exposed entities, actions and functions. The optional parameter `entity` restricts the output to a single entity, the optional parameter `action` restricts the output to a single action/function. The tool provides an enum that lists all available entities, actions and functions.

### • `query` entity {.tool}
This tool is used to read data from the service. The only required parameter is `entity`, an enum that lists all entities exposed by the service. This tool takes all provided parameters and translates them to a [CQN](../../cds/cqn) query, which the service runs via `service.run(query)`. The parameter descriptions explain how to use them.

Parameters of `query` requests:

| Parameter | Description                                                                                                  |
|-----------|--------------------------------------------------------------------------------------------------------------|
| select    | Array of [`expr`](../../cds/cqn#expr) objects or `strings` ; allows path expressions along associations. |
| entity    | The entity to query (enum values from `describe`)                                                            |
| where     | Array of [`xpr`](../../cds/cqn#where) objects used as predicates used for filtering                     |
| limit     | An integer limiting the results to return                                                                    |
| one       | Return a single record instead of an array. Implies `limit:1`; default: `false`                              |
| distinct  | Return only unique rows; default: `false` (Node.js only)                                                     |
| groupBy   | An array of [`ref`](../../cds/cqn#ref) objects or `strings` to group results.                           |
| orderBy   | List of objects to order the results (ref, sort, nulls)                                                      |


### • `call` action {.tool}

This tool is used to call unbound actions or functions. The required parameter `action` is an enum that lists all unbound actions and functions exposed by the service. The parameters of the action or function to call can be provided via the optional parameter `parameters`, that must contain all required parameters of the action or function. The tool takes these parameters and calls the action or function on the service.

### Inspect the Tools

You can start an [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to inspect tools:

```bash
npx @modelcontextprotocol/inspector
```

The inspector should automatically open in your browser.

1. Select _Streamable HTTP_ as Transport Type.
2. Enter the URL of your service - for example, `http://localhost:4004/mcp/browse`.
3. Select `Via Proxy` as connection type and select _Connect_.
4. Go to the _Tools_ tab and select _List Tools_.
5. To get data, select the _query_ tool.
6. Choose an entity.
7. Scroll down and select _Run Tool_.


## The XTravels Sample

The XTravels sample provides a more comprehensive example of how to work with several MCP services. It comprises the following CAP services:

- `EventsService`: to browse and book business or leisure events.
- `HotelsService`: to browse and book hotel accommodations.
- `FlightsService`: to browse airports, airlines and flights.
- `TravelsAgentService`: an MCP service for managing travel agent interactions.

### Workspace Setup

To set up the workspace for the XTravels sample, follow these steps:

1. Create a workspace root directory, e.g. `cap/samples`:

```shell
mkdir -p cap/samples
cd cap/samples
echo '{"workspaces":["*","*/apis/*"]}' > package.json
```

2. Clone the individual sample repositories:

```shell
git clone https://github.com/capire/xtravels
git clone https://github.com/capire/xflights
git clone https://github.com/capire/common
git clone https://github.com/capire/s4
```

3. Install the necessary dependencies:

```shell
npm install
```

This will install all the dependencies for the cloned sample repositories linked locally within the npm workspace.


### Run all-in-one

```shell
cds watch xtravels
```


### Use in OpenCode

```shell
opencode
```

Enter a prompt, such as:

```
Plan a trip to sapphire 27 for Anne Pratt flying from Frankfurt
```

You should see something like this:

![OpenCode displays a proposed trip plan.](assets/mcp-opencode1.png){.ignore-dark}
![OpenCode displays the booked travel.](assets/mcp-opencode2.png){.ignore-dark}


### Run as separate services

If you like you can also start the individual services separately in different terminals as shown below – no code or config changes required for that, and also no change to the usage in AI chat clients.

Run each of the lines below in a separate terminal:

```shell
cds w xtravels/srv/events
cds w xtravels/srv/hotels
cds w s4
cds w xflights
cds w xtravels
opencode
```

![The services running in separate terminals](assets/mcp-run-separately.png){.ignore-dark}

## Configuration

### Tool Name Prefixes

Some MCP clients or harnesses require unique tool names across all MCP servers. You can use the option <Config>cds.mcp.prefix</Config> to specify a prefix for the tool names. For example:

::: code-group
```yaml [.cdsrc.yaml]
cds:
  mcp:
    prefix: {service.name}-
```
```json [package.json]
{
  "cds": {
    "mcp": {
      "prefix": "{service.name}-"
    }
  }
}
```
:::

With this, the tool names generated by the MCP clients will be prefixed with the specified value, with the placeholder `{service.name}` being replaced by the actual service's fully qualified name – e.g., `CatalogService-describe`.


### Opting out of Autowiring

You can opt out of [autowired MCP clients](#autowired-mcp-clients) in development by setting the `cds.mcp.autowire` option to `false`, like so in your `package.json`:

::: code-group
```yaml [.cdsrc.yaml]
cds:
  mcp:
    autowire: false
```
```json [package.json]
{
  "cds": {
    "mcp": {
      "autowire": false
    }
  }
}
```
:::


### Mock Authentication

[Autowired MCP clients](#autowired-mcp-clients) automatically add `Authorization` headers for the mock user `alice` (Node.js) or `privileged` (Java). If your service requires something different, you can customize the credentials via the `cds.mcp.autowire` configuration:

::: code-group
```yaml [.cdsrc.yaml]
cds:
  mcp:
    autowire:
      user: admin
      password: admin
```
```json [package.json]
{
  "cds": {
    "mcp": {
      "autowire": {
        "user": "admin",
        "password": "admin"
      }
    }
  }
}
```
:::

## Current Limitations

### Authorization with XSUAA

> [!important]
> We are currently working on providing out-of-the-box support for authorization with XSUAA, with PKCE, but it is not fully implemented yet.


### Query and Actions Only

The MCP tools created by the adapter are currently focused on reading data and calling [**_unbound_** actions and functions](../../cds/cdl#actions) only. This means that you can use MCP to [`query`](#tool-query-entity) data from your CAP services, while any data changes need to be implemented via unbound actions for now.

For example, action `submitOrder` in the `CatalogService` ultimately creates an Order:

::: code-group
```cds [srv/catalog-service.cds]
service CatalogService {
  ...
  @requires: 'authenticated-user'
  action submitOrder ( book: Books:ID, quantity: Integer ); // [!code focus]
}
```
:::

Future versions of the adapter may add support for data changes using CREATE, UPDATE, and DELETE operations.


### Prompt Injection Attacks

> [!caution]
> The MCP adapter does not perform any input validation or output validation to prevent prompt injection attacks.
> Agents can potentially be manipulated by data returned from the service to execute unintended actions. For any deployment ensure you use infrastructure and practices that mitigate prompt injection risks and connect only to trusted MCP agents (e.g., Joule).


## SAP API Policy

> [!caution]
> The adapter itself does not provide any built-in governance features: there is no automatic rate limiting, no specific audit logging of agent actions, no approval workflows for sensitive operations, and no policy enforcement layer. Before using MCP in a productive environment, put appropriate controls for example by using MCP Gateway of SAP Integration Suite or integrate with SAP Agent Gateway (not GA yet).

> [!caution]
> The CAP MCP adapter must not be used as a gateway or proxy for SAP Application APIs. The adapter is not an SAP-endorsed architecture, data service, or service-specific pathway under section 2.2.2 of the [_SAP API Policy_](https://help.sap.com/docs/business-accelerator-hub/sap-business-accelerator-hub/sap-api-policy) and is not an endorsed mechanism for exposing, proxying, or providing agentic access to SAP Application APIs.
> Any use of SAP Application APIs must be in accordance with the [_SAP API Policy_](https://help.sap.com/docs/business-accelerator-hub/sap-business-accelerator-hub/sap-api-policy). For SAP-endorsed patterns on agentic access to SAP Application APIs, consult the [_SAP Architecture Center_](https://architecture.learning.sap.com/docs/ref-arch/98efa0) reference architectures.

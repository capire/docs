# Model Context Protocol Adapter

The [`@cap-js/mcp`](https://github.com/cap-js/mcp) plugin allows to easily expose given CAP services via the [_Model Context Protocol (MCP)_](https://modelcontextprotocol.io/).
Simply annotate a CAP service with `@mcp` to do so.
With that it becomes accessible to AI agents and LLM-powered tools without additional implementation work.
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



### Using `@mcp` Annotation

Simply add the `@mcp` annotation to a service definition to expose it via MCP.  For example, add the following to `srv/cat-service.cds`:


::: code-group
```cds [srv/cat-service.cds]
// Serve via OData, HCQL and REST
annotate CatalogService with @odata @hcql @rest;
annotate CatalogService with @mcp; // [!code focus]
```
:::

::: details Optionally specify an alternative endpoint path ...
As usual with CAP protocol annotations, you can also choose a custom path under which the MCP endpoint should be served, instead of using the default path `/mcp/<service>`:
```cds
annotate CatalogService with @mcp:'books'
```
:::

> [!tip] Just Another Protocol
> From the perspective of a developer in a CAP-based project, `@mcp` is just another protocol for your services, similar to `@odata`, `@graphql`, `@rest`, or `@hcql`. The adapter takes care of the rest, with all the standard CAP features you know working out of the box also with MCP, including annotations like `@cds.query.limit`, etc.


### Add Comments for LLMs

LLMs rely heavily on context information to produce high-quality output. Use standard CDS [`/**...*/` doc comments](../../cds/cdl#doc-comments) to do so, focusing on relevant hints and information about the service, entities, elements, actions, and parameters to the LLM, which aren't clear already from the given names and types in the model.
In addition, information can be provided through annotations [`@title`](../../cds/annotations#general-purpose) and [`@description`](../../cds/annotations#general-purpose).

For example:

```cds
/**
 * This is the author entity.
 * It contains information about book authors.
 */
annotate BookshopService.Authors with {
  ID    /** The ID of the author. */;
  name  /** The name of the author. */;
  books /** All the books written by the author. */;
}
```
::: details Only for Node.js ...
Doc comments are currently supported for Node.js only. With the Java version of the MCP Adapter, only `@title` and `@description` annotations are supported.
:::

This information is included in the output of the [`describe`](#-describe-service) tool and can be used by agents to better understand the data model and available actions/functions.



### Custom `@mcp.instructions`

The MCP Adapter automatically sends [MCP instructions](https://modelcontextprotocol.io/specification/2026-07-28/schema#discoverresult) to MCP clients to help models understand how to interact with your services effectively. While these generic instructions are mostly fully sufficient, there may be cases where you want to provide additional guidance specific to your service through custom instructions.

Use the `@mcp.instructions` annotation on service level, entity level, or action level to specify such custom instructions. For example:

```cds
annotate CatalogService with @mcp.instructions: 'Specific hints about your servcie in general.';
annotate CatalogService.Books with @mcp.instructions: 'Specific hints about books.';
```

::: note The annotation also supports i18n references, e.g. `{i18n>key}`
:::

### Use Case-Specific Services

Frequently, you might want to create services that are tailored specifically for MCP usage.
Instead of annotating an existing service with `@mcp` and exposing all its entities and actions, simply create a dedicated service specifically for MCP. For example, you could create a `BooksService` that only exposes a subset of the entities of the `AdminService` like that:

::: code-group
```cds [srv/mcp-service.cds]
using { CatalogService } from './cat-service';

@agent service BookshopService {

  @readonly entity Authors as projection on AdminService.Authors excluding {
    createdBy, modifiedBy,
  }

  @readonly entity Books as projection on AdminService.Books {
    ID, title, stock, price,
    author,
    genre.name as genre,
    currency.name as currency,
  }

  @agent.hitl
  action submitOrder ( book: Books:ID, quantity: Integer );
}
```
:::


> => See also: [_Use Case-Oriented Services_](../../get-started/bookshop#use-case-specific-services) in the getting started guide.




## Test-drive Locally

As usual, and following the Calesi principles of "convention over configuration", you can run your CAP server locally and interact with it using the MCP protocol from common clients like OpenCode or Claude Code.


### Run with `cds watch`

Run your CAP server locally as usual using `cds watch`, and note that the `@mcp`-annotated service gets served at an additional endpoint for the MCP protocol:

::: code-group
```shell [Node.js]
cds watch
```
```shell [Java]
mvn cds:watch
```
:::

```shell
[cds] - serving CatalogService {
  at: [ ..., '/mcp/browse' ],
  ...
}
```


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


![OpenCode started initially](opencode-start-screen.png){.ignore-dark}



Go ahead and interact with your CAP services using natural language and conversational style via OpenCode, entering prompts like these:

```sh
list books
```
```sh
order wuthering heights
```

And answer the questions that OpenCode asks you back.

![List books and ordering books via OpenCode](opencode-list-and-order-books.png){.ignore-dark}



You can also run `opencode web` to open the OpenCode web interface, which provides a more user-friendly way to interact with your MCP servers, including features like tool inspection and query building. Here's a screenshot of a simple session:

![OpenCode web interface dashboard showing a sidebar with available MCP tools and a main panel displaying query results in a table format with database records and their properties](../protocols/assets/mcp/opencode-web.png){style="width:70%"}


### Autowired MCP Clients

When we initially started OpenCode above, it indicated in the bottom line of the interface that there's (at least) one MCP server connected.

![OpenCode status line showing connected MCP servers](opencode-status-line.png){.ignore-dark}

Enter `/status` in the OpenCode interface to see details, which should display the status of the connected MCP servers like this:

![OpenCode listing connected MCP servers](opencode-status.png){.ignore-dark}

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

::: info You can opt out of autowiring with [`cds.mcp.autowire: false`](#cdsmcpautowire).
:::



### Inspect Log Output

When you run queries, you can inspect the log output of your CAP server to see the incoming MCP requests and how they are processed. This can be helpful for debugging and understanding the interaction between the MCP client and your CAP services.

For example, for a `list books` prompt, you should see log output similar to this:

::: code-group
```js [Node.js]
[mcp] - CatalogService describe { entities: [ 'Books' ] }
[mcp] - CatalogService query {
  cql: 'SELECT ID, title, author, genre, stock, price, currency_code FROM Books'
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

This tool is used to read data from the service.
It expects a single parameter `cql`, which contains the query in [CQL](../../cds/cql) syntax to be executed.

> [!tip] CQL = SQL++ => well understood by LLMs
> As common LLMs, like Claude Sonnet, are trained for SQL very well, they are quick to understand and generate CQL queries for interacting with the service.

For example, given the `BookshopService` as [declared above](#mcp-specific-services) that exposes `Authors` with its to-many association to `Books` , we can ask OpenCode running Opus something like this:

```sh
list authors with their written books and genres
```

Which it would nicely translate into the following CQL query using nested postfix projection to expand the `books` association, as shown in the screenshot below:

```sql
SELECT from Authors {
  ID, name, books {
    title, genre
  }
}
```

![CQL query result showing authors with their written books and genres](cql-by-claude-opus.png){.ignore-dark}

### • `call` action {.tool}

This tool is used to call unbound actions or functions. The required parameter `action` is an enum that lists all unbound actions and functions exposed by the service. The parameters of the action or function to call can be provided via the optional parameter `parameters`, that must contain all required parameters of the action or function. The tool takes these parameters and calls the action or function on the service.


### Generate Server Card

You can use `cds compile` to generate an [Server Card](https://modelcontextprotocol.io/community/working-groups/server-card) for your MCP server:

```sh
cds compile srv/cat-service.cds --to mcp
```

> [!note]
> A Server Card is not required for your MCP server to function, but it may be used in development and provides a standardized way to describe the server's capabilities and tools.


### Inspect the Tools

You can use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) to inspect the tools served from CAP services:

```bash
npx @modelcontextprotocol/inspector
```

The inspector should automatically open in your browser.

![MCP Inspector start page](mcp-inspector.png){.ignore-dark}

Register your `@mcp`-enabled CAP services to the inspector using the _Add Servers_ \> _+ Add manually_ menu option, and in the dialog that appears, follow these steps:

1. Enter a name for your server, e.g. _bookshop_.
1. Select _streamable-http_ as transport type.
3. Enter MCP endpoint into URL - for example, `http://localhost:4004/mcp/browse`.

A screenshot is shown below:

![MCP Inspector](mcp-inspector-add-server.png){.ignore-dark}

Then connect, and switch to the _Tools_ tab to the top of the inspector's window to inspect and try out the listed tools.


## Configuration


### `cds.mcp.autowire`

#### Opting Out of Autowiring

You can opt out of [autowired MCP clients](#autowired-mcp-clients) in development by setting the <Config>cds.mcp.autowire: false</Config>, like so in your `package.json`:

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


#### Mock Authentication

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

### `cds.mcp.prefix`

Some MCP clients or harnesses might require unique tool names across all MCP servers.
You can use the option <Config>cds.mcp.prefix</Config> to specify a prefix for the tool names. For example:

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


### `cds.mcp.format`

By default, the [`query`](#-query-entity) tool expects queries in [CQL](../../cds/cql) syntax, which is a SQL-like language for querying CAP services, and best suited for most LLMs. You can change this to <Config>cds.mcp.format: cqn</Config> if to prefer to use structured [CQN](../../cds/cqn) input instead of CQL.


### `cds.mcp.per_action_tool`

By default, multiple actions may share the same generic [`call`](#-call-action) tool, which has advantages in regarding context windows by reducing the number of tools within the MCP ecosystem. Set <Config>cds.mcp.per_action_tool: true</Config> to configure that each action gets its own dedicated tool.


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

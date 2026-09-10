# CAP-level Agents

CDS plugin for building agents based on the [A2A protocol](https://a2a-protocol.org).
{.abstract}

[[toc]]


## Add the Agents Plugin

Within your project root run this to add the [`@cap-js/agents`](https://github.com/cap-js/agents) plugin:

```bash
npm add @cap-js/agents
```


## Declare `@agent` Services


### Agentifying CAP Services

Simply add the `@agent` annotation to a service definition to create an agent. For example, clone the [_capire/bookshop_](https://github.com/capire/bookshop) sample, and add a new file `srv/cat-service-agent.cds` with the following content:

::: code-group
```cds [srv/cat-service-agent.cds]
using { CatalogService  } from './cat-service';
annotate CatalogService with @agent;
```
:::

With that, the plugin auto-generates [MCP tools](./mcp) from the service's entities and actions, creates a [ReAct](https://arxiv.org/abs/2210.03629) loop, and serves it via [A2A protocol](https://a2a-protocol.org) — no code required.


### Human-in-the-Loop

Annotate a CDS **action** with `@agent.hitl` to require human approval before the agent may execute it. For example, the `submitOrder` action in the `CatalogService` can be annotated like this:

::: code-group
```cds [srv/cat-service-agent.cds]
using { CatalogService  } from './cat-service';
annotate CatalogService with @agent;
annotate CatalogService.submitOrder with @agent.hitl; // [!code focus]
```
:::


When the agent decides to call the action, the task pauses and transitions to the A2A [`input-required`](https://a2a-protocol.org/latest/specification/#413-taskstate) state instead of running the action immediately.


## Test-drive Locally


### Run with `cds watch`

Start your server with `cds watch` and note that the `@agent`-annotated service gets served via the [A2A protocol](https://a2a-protocol.org/latest/specification/):

```shell
cds watch
```
```shell
[cds] - serving CatalogService {
  at: [ ..., '/a2a/browse' ],
  ...
}
```

### Connect an LLM

By default, the plugin uses a mock LLM for local development. Assuming you already have an LLM configured with a local installation of [Claude Code](https://claude.ai) or [OpenCode](https://opencode.ai), you can reuse it by simply adding this configuration:

::: code-group
```yaml [.cdsrc.yaml]
cds:
  requires:
    llm: anthropic
```
```jsonc [package.json]
"cds": {
  "requires": {
    "llm": "anthropic"
  }
}
```
:::

Alternatively you can bind your app to an existing instance of [SAP AI Core](https://help.sap.com/docs/sap-ai-core):

::: code-group
```yaml [.cdsrc.yaml]
cds:
  requires:
    llm:
      kind: aicore
      model: anthropic--claude-4.6-sonnet
```
```jsonc [package.json]
"cds": {
  "requires": {
    "llm": {
      "kind": "aicore",
      "model": "anthropic--claude-4.6-sonnet"
    }
  }
}
```
:::

Then start your server in `hybrid` profile:

```bash
cds bind -2 <instance>
cds w --profile hybrid
```

See [SAP AI Core → Create a Service Instance](https://help.sap.com/docs/sap-ai-core/sap-ai-core-service-guide/create-service-instance) for how to create an instance.



### Using Chat Preview

For local development, the plugin serves a chat preview at http://localhost:4004/a2a/browse/preview/.



![alt text](assets/chat-preview.png)




## Markdown-Based Agents

In addition you can further customize the agent by providing a Markdown-based agent definition, as described in the [Markdown-Based Agents](#markdown-based-agents) section.

### Markdown-Based Agents

To define an agent's identity, behaviour, and skills explicitly, add a sibling directory matching the slugified service name. When present, it replaces the default agentification: instead of the auto-generated ReAct agent, the plugin auto-builds the agent from the directory at startup — no JavaScript handler required.

```zsh
srv/
├─ travel-agent/.cds
└─ catalog-agent/                ← matches the slugified service name
   ├─ AGENTS.md                  ← agent identity + behaviour
   └─ skills/
      └─ book-purchase/
         └─ SKILL.md             ← workflow + examples
```

`AGENTS.md` defines who the agent is. The frontmatter populates the agent card;
the body is the agent's system prompt:

```md
---
name: catalog-agent
version: "1.0.0"
description: >
  Bookshop assistant for placing book orders on behalf of the user.
---

# Catalog Agent

## Identity

You are the **Catalog Agent**, a helpful assistant for the capire bookshop.
...
```


## Configuration

The LLM used by an agent is configured via `cds.requires.llm`. You can provide a `kind` as with [any required service](https://cap.cloud.sap/docs/node.js/core-services#required-services).

```jsonc
"cds": {
  "requires": {
    "llm": {
      "kind": "aicore",
      "model": "anthropic--claude-4.6-sonnet"
    }
  }
}
```

| Kind     | Description                                                           |
| -------- | --------------------------------------------------------------------- |
| `aicore` | The default for `production` and `hybrid`, connects to SAP AI Core    |
| `mock`   | The default for `development`, provides a mocked response when called |

## Advanced

The following capabilities are experimental and documented separately. Their public surface may change.

- [Connectivity](.docs/connectivity.md) — destination-based connectivity, `AICORE_SERVICE_KEY` / `ANTHROPIC_API_KEY`, and the `anthropic` kind
- [Configuration](.docs/configuration.md) — using multiple models, global and per-service settings, file I/O, and push notifications
- [Quota Enforcement](.docs/quota.md) — configurable rate limits and resource quotas
- [Audit Logging](.docs/audit-logging.md) — immutable audit trail of agent decisions and tool usage
- [Data Privacy](.docs/data-privacy.md) — deletion of message history
- [Telemetry](.docs/telemetry.md) — OpenTelemetry metrics, tracing, and MLflow export
- [Content Filter](.docs/content-filter.md) — SAP AI Core content filtering and prompt injection shielding

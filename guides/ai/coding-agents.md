---
description: >
  How to configure coding clients to load shared CAP agent instructions through HTTP or project files, and verify their retrieval and use.
---

# Using CAP with Coding Agents

Give your coding client the [CAP Development Instructions](./cap-agent-instructions.md), not this setup page or a copy of the whole reference. The agent entry is concise Markdown without Vue or client-installation advice. It works with clients that can load instructions and read HTTP content; no MCP server, embeddings or OpenCode-specific integration is required.
{.abstract}

<script setup>
import { ref, onMounted } from 'vue'
import { useData } from 'vitepress'
const { site } = useData()
const origin = ref('')
onMounted(() => origin.value = window.location.origin )
</script>


[[toc]]

## Load the Entry Point in Your Client

The shared entry URL is:

- [{{ origin }}{{ site.base }}guides/ai/cap-agent-instructions.md](cap-agent-instructions.md){ target="_blank" }

Use it after the page is published and its availability checked; for changes under review, select the current local URL instead. The instruction content is the same regardless of which client or model receives it.

| Client capability | How to supply the entry instructions |
| --- | --- |
| Project instruction files | Copy the block below into the client's supported file, such as `AGENTS.md` or `CLAUDE.md`; verify that the client loads that file |
| Session/system instructions | Supply the block before the application task, with an HTTP-reading tool available |
| Remote instruction loading | Configure the entry Markdown URL using that client's documented mechanism; verify the content actually arrives and is current |

Remote loaders can skip unavailable URLs or retain older fetched content. A configured URL alone is not a freshness or fail-closed guarantee. Keep the short bootstrap below available locally so missing guidance is reported instead of silently ignored.

### Copyable Bootstrap

Place this in project instructions for shared adoption, or user-level instructions for all your CAP projects. Use the entry URL from the selected documentation site; a separate documentation base URL is not required. If your client injects the instructions without retaining their source URL, supply that URL or an optional base override.

```markdown-vue
## CAP development

- Before CAP work, read and follow {{ origin }}{{ site.base }}guides/ai/cap-agent-instructions.md.
- Reuse it while current and applicable.
- If it cannot be loaded, report that before implementing affected CAP behavior.
- Do not silently substitute remembered guidance.
```

Tell the agent the application task separately. For a one-off session, the same instructions can be included in the starting prompt instead of a file.

Existing reference skills can retain stale or conflicting knowledge. Once the current entry path is established, prefer canonical task-page retrieval over competing embedded references. Disable redundant reference loading through the client's supported controls where appropriate; operational scripts can remain useful. Do not delete user-installed skills as part of ordinary application setup.

### Verify Adoption

In a fresh session, check that the entry instructions arrive, the agent retrieves relevant Markdown, identifies runtime/version scope and verifies the required application behavior. Also check that an unavailable source is reported rather than silently replaced by remembered assumptions. Repeat these checks for the clients/models you support, including older models; success with one model does not qualify another. Fetching or inserting content proves delivery, not semantic attention or correct application.

::: tip Access is not automatic adoption
The agent must have an HTTP-reading tool and permission to use the selected URL. Your harness must load the project instructions. Publishing this guide alone does not make every agent discover it, refresh its knowledge automatically or override higher-priority instructions.
:::

<br/>
<br/>
<br/>
<br/>

# Agent Instructions

The content below is included from the pure agent instruction document available via [{{ origin }}{{ site.base }}guides/ai/cap-agent-instructions.md](cap-agent-instructions.md). While written with an Agent-first focus, it may also be valuable for human readers.

<!--@include: ./cap-agent-instructions.md#instructions-->

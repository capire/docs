---
status: released
---

# Getting Started
Your First Steps {.subtitle}

Welcome to CAP, and to *capire*, its one-stop documentation.

[**CAP** [ˈkap(m)] — (unofficial) abbreviation for the *"SAP Cloud Application Programming Model"*](https://translate.google.com/details?sl=en&text=cap){.learn-more .dict}

[**capire** [ca·pì·re] — Italian for _"understand"_](https://translate.google.com/details?sl=it&tl=en&text=capire){.learn-more .dict}

<style scoped>
  a.dict { font-family: serif; font-weight: 100 }
</style>




## Initial Setup {#setup}

Follow the steps after this for a minimalistic local setup. Alternatively, you can use CAP in [SAP Build Code](https://pages.community.sap.com/topics/build-code), or other cloud-based setups, such as GitHub codespaces.



### Prerequisites

- [Node.js](https://nodejs.org) — required for installing the `cds` command line interface
- [SQLite](https://sqlite.org) — included in macOS and Linux → [install it](https://sqlite.org/download.html) on Windows
- **A Terminal**{style="font-weight: 500"} — for using the `cds` command line interface (CLI)
- **A Text Editor**{style="font-weight: 500"} → we recommend [VS Code](https://code.visualstudio.com) with [CDS plugin](../tools/cds-editors#vscode)


### Installation

- With the prerequisites met, install the [`cds` toolkit](../tools/cds-cli) *globally*:

    ```sh
    npm add -g @sap/cds-dk
    ```

    [Visit the _Troubleshooting_ guide](troubleshooting.md) if you encounter any errors. {.learn-more}

- Run `cds` to check whether installation was successful:

  ```sh
  cds
  ```

  You see some output like that:

  ```sh
  USAGE

      cds <command> [<args>]
      cds <src>  =  cds compile <src>
      cds        =  cds help

  COMMANDS

      i | init        jump-start cds-based projects
      a | add         add a feature to an existing project
      c | compile     compile cds models to different outputs
      s | serve       run your services in local server
      w | watch       run and restart on file changes
      r | repl        read-eval-event loop
      e | env         inspect effective configuration
      b | build       prepare for deployment
      d | deploy      deploy to databases or cloud
      v | version     get detailed version information
      ? | help        get detailed usage information

    Learn more about each command using:
    cds help <command> or
    cds <command> --help

  ```



### Optional

- [Java](https://sapmachine.io) & [Maven](https://maven.apache.org/download.cgi) — if you're going for Java development → [see instructions](../java/getting-started#local).
- [git](https://git-scm.com) — if you go for more than just some quick trials.



## Starting Projects

- Use `cds init` to start a CAP project, and then open it in VS Code:

   ```sh
   cds init bookshop
   ```

   ```sh
   code bookshop
   ```
   [Assumes you activated the `code` command on macOS as documented](../tools/cds-editors#vscode) {.learn-more}



## Project Structure

The default file structure of CAP projects is as follows:

```zsh
bookshop/        # Your project's root folder
├─ app/          # UI-related content
├─ srv/          # Service-related content
├─ db/           # Domain models and database-related content
├─ package.json  # Configuration for cds + cds-dk
└─ readme.md     # A readme placeholder
```

CAP has defaults for many things that you'd have to configure in other frameworks. The goal is that things should just work out of the box, with zero configuration, whenever possible. You can override these defaults by a specific configuration if you need to do so.

::: details See an example for configuring custom project layouts...

::: code-group

```json [package.json]
{ ...
  "cds": {
    "folders": {
       "db": "database/",
       "srv": "services/",
       "app": "uis/"
    }
  }
}
```

```sh [Explore the defaults in your project]
cds env ls defaults
```

[Learn more about project-specific configuration.](../node.js/cds-env){.learn-more}
:::

::: tip Convention over configuration
We recommend sticking to CAP's way of [Convention over Configuration](https://en.wikipedia.org/wiki/Convention_over_configuration) to benefit from things just working out of the  box. Only override the defaults if you really need to do so.
:::




## Learning More {#next-steps}

After the [initial setup](#setup), we recommend continuing as follows while you grow as you go...:

| # | Guide                                     | Description                                            |
|---|-------------------------------------------|--------------------------------------------------------|
| 1 | [Introduction – What is CAP?](../about/)  | Learn about key benefits and value propositions.       |
| 2 | [Bookshop by capire](in-a-nutshell)       | Build your first CAP application within 4-44 minutes.  |
| 3 | [Best Practices](../about/best-practices) | Key concepts & rationales to understand → *must read*. |
| 4 | [Anti Patterns](../about/bad-practices)   | Misconceptions & bad practices to avoid → *must read*. |
| 5 | [Learn More](learning-sources)            | Find samples, videos, blogs, tutorials, and so on.     |



## Grow as you go...

After these getting started-level introductions, you would continuously revisit these guides to deepen your understanding and as reference docs:

|  # | Guides & References                                                                   | Description                                    |
|---:|---------------------------------------------------------------------------------------|------------------------------------------------|
|  6 | [Cookbook](../guides/)                                                                | Walkthroughs for the most common tasks.        |
|  7 | [CDS](../cds/)<br/>[Java](../java/)<br/>[Node.js](../node.js/)<br/>[Tools](../tools/) | The reference docs for these respective areas. |
|  8 | [Plugins](../plugins/)                                                                | Curated list of recommended Calesi plugins.    |
|  9 | [Releases](../releases/)                                                              | Your primary source to stay up to date.        |
| 10 | [Resources](../resources/)                                                            | About support channels, community, ...         |


This also reflects the overall structure of [this documentation](./learning-sources.md#this-documentation).

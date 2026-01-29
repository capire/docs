---
status: released
---

# Getting Started
Jumpstart & Grow as You Go... {.subtitle}

[[toc]]


## Initial Setup

A most minimalistic setup needs [CAP's _cds-dk_](https://www.npmjs.com/package/@sap/cds-dk) installed, which in turn requires [Node.js](https://nodejs.org). Add optional setups for [Java](https://sapmachine.io), [GitHub](https://github.com), and [Visual Studio Code](https://code.visualstudio.com), as appropriate, and as outlined below.

On macOS (and Linux), we recommend using [Homebrew](https://brew.sh), and run the commands in the subsequent sections in your terminal to get everything set up.

```shell
bash -c "$( curl https://raw.githubusercontent.com/homebrew/install/HEAD/install.sh )"
```

::: details Alternative setup (required on Windows) ...

  Instead of using Homebrew – which is not available on Windows –, you can manually download and install the required packages from their respective websites:

  | Package | Install from                     | Remarks                                                 |
  |---------|----------------------------------|---------------------------------------------------------|
  | Node.js | https://nodejs.org               | _required_                                                |
  | Java    | https://sapmachine.io            | _optional_                                                |
  | Git     | https://git-scm.com              | _optional_                                                |
  | VS Code | https://code.visualstudio.com    | + [recommended extensions](../tools/cds-editors#vscode) |
  | SQLite  | https://sqlite.org/download.html | _required_ on Windows                                     |

Then install CAP's _cds-dk_ globally:

  ```shell
  npm add -g @sap/cds-dk
  ```
:::


<style scoped>
  .required::before { content: 'Required:'; color: #999; margin-right: 0.5em }
  .optional::before { content: 'Optional:'; color: #999; margin-right: 0.5em }
  .proposed::before { content: 'Proposed:'; color: #999; margin-right: 0.5em }
</style>



### Node.js and _cds-dk_ {.required}

```shell
brew install node      # Node.js latest LTS
npm i -g @sap/cds-dk   # CAP's cds-dk
```


### Java and Maven {.optional}

```shell
brew install sapmachine-jdk
brew install maven
```


### Git and GitHub {.optional}

```shell
brew install git       # Git CLI
brew install gh        # GitHub CLI
brew install github    # GitHub Desktop App
```



### Visual Studio Code {.proposed}

```shell
brew install --cask visual-studio-code            # VS Code itself
```
```shell
code --install-extension sapse.vscode-cds         # for .cds models
code --install-extension mechatroner.rainbow-csv  # for .csv files
code --install-extension qwtel.sqlite-viewer      # for .sqlite files
code --install-extension humao.rest-client        # for REST requests
code --install-extension dbaeumer.vscode-eslint   # for linting
```
```shell
code --install-extension oracle.oracle-java       # for Java
code --install-extension vscjava.vscode-maven     # for Maven
```


> You can of course also use other IDEs or editors of your choice, such as [IntelliJ IDEA](https://www.jetbrains.com/idea/), for which we also provide [support](../tools/cds-editors#intellij). Yet we strongly recommend Visual Studio Code for the best experience with CAP.


## Command Line Interface

### The `cds` command
Run the `cds` command in your terminal to verify your installation and see an overview of available commands, as shown below:
  ```shell
  cds
  ```
  ```zsh
  SYNOPSIS

    cds <command> [ <args> ]
    cds <src>  =  cds compile <src>
    cds        =  cds help

  COMMANDS

    i | init        jumpstart cap projects
    a | add         add facets to projects to grow as you go
    s | serve       run your services in local server
    w | watch       run with auto-restarts on changes
      | mock        mock a single service
    r | repl        read-eval-event loop
    e | env         inspect effective configuration
    c | compile     compile cds models to various outputs
    b | build       prepare for deployment
    d | deploy      deploy to databases or cloud
      | up          one stop build and deploy to cloud
    v | version     get detailed version information
    ? | help        get detailed usage information

  Learn more about each command using:
  cds <cmd> --help
  cds help <cmd>
  ```
> Use `cds help` to get help on any command.


### `cds version`
Use `cds version` to check your installed versions of _cds-dk_ , as well as your project's local dependencies, with an output similar to this:
  ```shell
  cds version
  ```
  ```zsh
  @sap/cds-dk:  9.6.1    /opt/homebrew/lib/node_modules/@sap/cds/dk
  npm root -l:           ~/cap/bookshop/node_modules
  npm root -g:           /opt/homebrew/lib/node_modules
  Node.js:      24.12.0  /opt/homebrew/bin/node
  ```


## Jumpstart Projects

### `cds init`

Use `cds init` to jumpstart CAP projects, which creates a project root folder with a default layout as shown below:

```shell
cds init bookshop
cd bookshop
```
```zsh
bookshop/           # the project's root folder
├─ app/             # UI-related content
├─ srv/             # Service-related content
├─ db/              # Domain models and database-related content
└─ readme.md        # Project readme file
```

> [!info] Convention over configuration
> CAP uses defaults for many things you'd have to configure in other frameworks. The idea is that things just work out of the box, with zero configuration. While you _can_ override these defaults, of course, you _should not_ do so, but rather stick to the defaults, for the sake of simplicity.


### `cds watch`

We can run `cds watch` to start a server, which would respond like this:

```shell
cds watch
```
```zsh
  No models found in db/,srv/,app/,app/*.
  Waiting for some to arrive...
```

Let's feed it with a simple service definition by running that in a _secondary terminal_, which adds a simple service definition as shown below:
```shell
cds add tiny-sample
```
:::code-group
```cds [srv/cat-service.cds]
service CatalogService {
  entity Books {
    key ID:Integer; title:String; author:String;
  }
}
```
:::

`cds watch` would react automatically with some output containing this:

```shell
[cds] - loaded model from 1 file(s):
  srv/cat-service.cds
[cds] - connect to db > sqlite { url: ':memory:' }
[cds] - serving CatalogService { at: ['/odata/v4/catalog'] }
[cds] - server listening on { url: 'http://localhost:4004' }
```

> [!tip] Served out of the box
> Et voilà! Your first CAP service is up and running, with automatically bootstrapped in-memory database, and a full-fledged OData service, generically serving requests like that: http://localhost:4004/odata/v4/catalog/Books

## Grow as You Go...

When your project evolves, you'd use `cds add` to add features and facets as needed, for example, to add initial data, Java-specific setups, or deployment options, as outlined below. And finally, use `cds up` to build and deploy your project in one go.

### `cds add`

Use `cds add` to grow your project as you go:

```shell
cds add data
cds add nodejs
cds add java
```
<!--
cds add ui5
cds add fiori-tools
-->

Use `cds add` to add deployment options:

```shell
cds add hana
cds add xsuaa
cds add ias
cds add multitenancy
cds add mta
cds add kyma
cds add github-actions
```

### `cds up`

Use `cds up` to build and deploy your project in one go:

```shell
cds up
cds up --to cf
cds up --to kyma
```
<!--
cds up --to hana
-->

## Stay up to Date!

> [!important] Staying up to date is crucial to receive important security fixes.
> In order to benefit from the latest features and improvements, as well as receiving crucial security fixes, it's of utter importance to stay up to date with latest releases of CAP. Regularly run the following commands to do so.


Keep your development environment up to date:

```shell
brew upgrade
npm upgrade --global
```
Keep your project dependencies up to date:
```shell
# within your project folder
npm upgrade
```
> Use `npm outdated` to check which dependencies are outdated before upgrading.

> [!warning]
> For such upgrades to work, **do not use pinned versions** in your project dependencies. Always use open semver ranges instead – with a leading caret, as in `^9.7.0`, and as shown below –, combined with [`package-lock.json`](https://docs.npmjs.com/cli/configuring-npm/package-lock-json), and [`npm ci`](https://docs.npmjs.com/cli/commands/npm-ci) for repeatable builds and deployments.

::: code-group
```jsonc [package.json]
  "dependencies": {
    "@sap/cds": "9.7.0",  // DON'T use pinned versions // [!code --]
    "@sap/cds": "^9.7.0",  // [!code ++]
    ...
  }
```
:::

> [!tip]
> Consider using tools like [Dependabot](https://docs.github.com/en/code-security/getting-started/dependabot-quickstart-guide) or [Renovate](https://www.mend.io/renovate/) to automate dependency updates for you. These tools automatically open pull requests in your Git repositories whenever new versions of your dependencies are released. They are also highly recommended for managing Maven dependencies in CAP Java projects.


## Next: Bookshop

Continue with [_The Bookshop Sample_](./bookshop) for a step-by-step walkthrough of the most common development tasks in CAP projects. Then explore the [_Core Concepts_](./concepts) and [_Key Features_](./features) of CAP, before going on to the other [_Learning Sources_](./learn-more) within this documentation, or outside.

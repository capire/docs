---

---

# Serving Vue.js or React

CAP is easily integrated with Vue.js, React, Svelte, or any other popular UI library. This guide explains how to set up a minimal project with a UI.

<!-- [[toc]] -->

## Example project

The example here is built on a minimal CAP project:

```sh
cds init bookshop --add nodejs,tiny-sample && code bookshop
```

Now simply create a Vue.js or React app in `app/catalog`:

::: code-group

```sh [Vue.js]
cds add vue --into catalog
```

```sh [React]
cds add react --into catalog
```

:::

Now simply start the dev server:

```sh
cds watch
```

Open http://localhost:4004 to see your running applications.

### Next Up

You can deploy this project to Cloud Foundry or Kyma using the SAP BTP Application Frontend service or a custom App Router setup.

Simply add it like so:

```sh
cds add app-frontend
```

> When deploying your first Application Frontend service in that subaccount also make sure to subscribe to "Application Frontend Service" with plan "build-default".

Afterwards, deploy your project:

```sh
cds up
```

[Learn more about Cloud Foundry deployment](../deploy/to-cf#add-ui){.learn-more}
[Learn more about Kyma deployment](../deploy/to-kyma.md){.learn-more}

---
label: cds-lint
synopsis: >
  This page explains the ESLint plugin for CDS in depth.
status: released
---

# CDS Lint

<div class="cols-2">

<div>

To catch issues in CDS models and the CDS environment early, CAP provides an [ESLint plugin](https://eslint.org/) for CDS [`@sap/eslint-plugin-cds`](https://www.npmjs.com/package/@sap/eslint-plugin-cds) with a set of *recommended* rules that are considered best practice and universal for every CAP project. This plugin, together with the [`cds lint` CLI](#usage-lint-cli) of [`@sap/cds-dk`](https://www.npmjs.com/package/@sap/cds-dk), comprises what we call **CDS Lint**.

</div>

<div>

![ESLint plugin for CDS logo](../assets/cdslint.svg){width="130px" class="ignore-dark"}

</div>

</div>

By nature of its design, the plugin can also be run with the [ESLint CLI](#usage-eslint-cli). However, we recommended using the [CDS Lint CLI](#usage-lint-cli) instead as it comes with all preconfigured settings.


### Setup {#cds-add-lint}

The following command automatically installs ESLint, the CDS ESLint plugin, and adds the ESLint configuration. VS Code settings are added to your project as well, to also be able to lint CDS alongside JavaScript or any other ESLint plugins you may have:

```sh
cds add lint
```

You may be asked to install ESLint as additional dependency in case it is not available in your project yet. Just follow the instructions on screen.


### CDS Lint CLI {#usage-lint-cli}

In your project's root folder, execute:

```sh
cds lint
```

It follows standard ESLint behaviour. If there are no lint errors, there is no output. If there are, a standard ESLint error report will be printed.


### CDS Lint in VS Code {#cds-lint-vscode}

::: tip
Make sure you have ESLint and our ESLint plugin installed via [`cds add lint`](#cds-add-lint).
:::

To turn on lint checking in your VS Code Editor simply download the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for _Visual Studio Code_.
CDS Lint seamlessly integrates with it. For _SAP Business Application Studio_ this comes preinstalled.

Now you can see lint reports also in your editor. You can see all rules [marked as **Editor default** here](./rules/). Any other (project-based) rules are not turned on by
default but can be turned on via the `show` rule option. For example, if we want to show the [`valid-csv-header`](./rules/valid-csv-header/) rule reports in the Editor, we would add the following to our ESLint
`rules` configuration:

```json
{
  "rules": {
    "@sap/cds/valid-csv-header": ["warn", "show"]
  }
}
```


### CDS Lint Rules

The **CDS Lint** rules are a set of generic rules based on CAP best practices.

[See our Rules Reference page to find out more](./rules/){ .learn-more}


### ESLint CLI (optional) {#usage-eslint-cli}

To have more control over the linting process, you can also access the CDS ESLint plugin natively via the [ESLint CLI](https://eslint.org/docs/user-guide/command-line-interface). To determine the proper command line options, it can help to refer to output of the equivalent call using the [CDS Lint CLI](#usage-lint-cli) with `DEBUG="lint"`, which shows all of the options and flags applied:

```sh
DEBUG=lint cds lint
```

<pre class="log">
Linting:
<span>[lint] - eslint --ext ".cds,.csn,.csv" ...</span>
</pre>

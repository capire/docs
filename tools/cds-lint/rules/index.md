---
label: cds-lint-rules
synopsis: >
  This page lists the rules contained in the ESLint plugin for CDS in depth.
status: released
---

<script setup>
  import RulesRefTable from '../components/RulesRefTable.vue'
</script>


# Rules Reference

Below you can find all rules of the `@sap/eslint-plugin-cds` ESLint plugin.

They are grouped by categories [Model Validation](#model-validation), [JavaScript](#javascript), and [Environment](#environment) to help you understand their purpose.

Your standard CDS project configuration turns on a subset of these rules by default, namely the *recommended* (&nbsp;✅&nbsp;) rules to ensure basic standards are met.

## Model Validation

Model Validation rules are used to validate CDS models within projects. They are used to enforce security, naming conventions, or other best practices.

Note that while all recommended (&nbsp;✅&nbsp;) model rules run with the CLI, only a number of them are enabled and visible in the editor by default (&nbsp;👀&nbsp;).
::: details
* *Editor default* rules: Rules that are enabled in the editor by default only rely on the current file as their rule context. These are quick to execute and
can react on file changes.
* *Project-based* rules: Rules that are disabled in the editor by default usually rely on a series of (project) files for their rule context or include
slow or expensive processes. These are slow to execute and by default only run with the CLI.
:::

<RulesRefTable category="Model Validation"/>

## Environment

Environment rules are used to check for proper and up-to-date CDS project environments. These run only via the command line and are not available in the editor because they often cannot be pinpointed to any particular file.

<RulesRefTable category="Environment"/>


## JavaScript

JavaScript rules are designed to catch bad practices and common mistakes when implementing custom JavaScript handlers in CDS projects. These rules help ensure code quality, maintainability, and adherence to best practices when extending CDS with JavaScript logic.

<RulesRefTable category="Javascript"/>
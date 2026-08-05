---
description: >
  Use Terraform to provision the SAP BTP subaccounts, entitlements, HANA Cloud instances, and Cloud Foundry environments your CAP project needs.
---

# BTP Account Setup with Terraform

Before you deploy a CAP application to Cloud Foundry or Kyma, you need SAP BTP subaccounts with the right entitlements and services in place. `cds add terraform` generates a ready-to-run Terraform configuration that does exactly that — it provisions three environments (Sandbox, Staging, Production) as code so the setup is repeatable and version-controlled.

[[toc]]

## Prerequisites

- [Terraform CLI](https://developer.hashicorp.com/terraform/install) installed
- An SAP BTP global account with quota for: HANA Cloud, XSUAA, Destination, SaaS Registry, Alert Notification, Application Logging
- BTP and Cloud Foundry credentials (user + password)

## Generate the Configuration

Run in your CAP project root:

```sh
cds add terraform
```

You will be prompted for:

| Prompt | Example |
|--------|---------|
| `globalAccountId` | `my-team` |
| `region` | `eu12` |
| `idp_origin_key` | `sap.custom` (press Enter for default) |
| `BTP username` | `user@example.com` |
| `CF username` | `user@example.com` |
| `admin emails` | `user@example.com, colleague@example.com` |
| `BTP password` | *(hidden)* |
| `CF password` | *(hidden)* |
| `HANA SYSTEM password` | *(hidden)* |

The **admin emails** (comma-separated) receive the *Subaccount Administrator* role collection in all three subaccounts. Leave blank to skip role assignments.

The command writes:

```
.terraform/
  main.tf            # subaccounts, entitlements, HANA Cloud, CF spaces, role assignments
  provider.tf        # SAP BTP + Cloud Foundry provider config
  variables.tf       # variable declarations with defaults
  terraform.tfvars   # your credentials — DO NOT commit this file
```

::: warning Keep `terraform.tfvars` out of git
It is written with mode `0600`. Add `.terraform/terraform.tfvars` to your `.gitignore`.
:::

## Provision

```sh
cd .terraform
terraform init
terraform plan    # preview what will be created
terraform apply   # provision
```

## What Gets Created

For each of the three environments (Sandbox, Staging, Production):

- A BTP **subaccount** in the configured region
- **Entitlements**: XSUAA, Destination, HANA Cloud, HANA HDI (hdi-shared), SaaS Registry, Alert Notification, Application Logging
- A **Cloud Foundry environment** instance and space
- A **HANA Cloud** service instance (default: 30 GB)
- An **IAS trust** configuration (if `idp_origin_key` is set)
- **Subaccount Administrator** role assignments for the given admin emails

Once provisioned, continue with [Deploy to Cloud Foundry](to-cf) or [Deploy to Kyma/K8s](to-kyma) to deploy your application.

## Customization

Edit the generated files to fit your landscape:

- `hana_memory_gb` in `variables.tf` — resize HANA instances
- `cf_landscape_label` — change if your region uses a non-default CF landscape (e.g. `cf-us10-001`)
- `*_subdomain` variables — set custom subaccount subdomains
- `main.tf` — add further entitlements or service instances

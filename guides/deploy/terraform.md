---
description: >
  Use Terraform to provision SAP BTP subaccounts, entitlements, HANA Cloud instances, and CF environments for your CAP application.
---

# Deploy with Terraform

[Terraform](https://www.terraform.io/) lets you declare your BTP infrastructure as code and provision it reproducibly. `cds add terraform` generates a ready-to-run Terraform configuration that creates three subaccounts (Sandbox, Staging, Production) with all the services a typical CAP app needs.

[[toc]]

## Prerequisites

- [Terraform CLI](https://developer.hashicorp.com/terraform/install) installed
- An SAP BTP global account with entitlements for: HANA Cloud, XSUAA, Destination, SaaS Registry, Alert Notification, Application Logging
- BTP and CF credentials (user + password)

## Setup

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

The **admin emails** (comma-separated) are assigned the *Subaccount Administrator* role collection in all three subaccounts. Leave blank to skip role assignments.

This writes the following files:

```
.terraform/
  main.tf            # subaccounts, entitlements, HANA, CF, role assignments
  provider.tf        # SAP BTP + Cloud Foundry provider config
  variables.tf       # variable declarations
  terraform.tfvars   # your credentials — DO NOT commit this file
```

::: warning Keep `terraform.tfvars` out of git
It is written with mode `0600`. Add `.terraform/terraform.tfvars` to your `.gitignore`.
:::

## Run

```sh
cd .terraform
terraform init
terraform plan   # preview what will be created
terraform apply  # provision the infrastructure
```

## What Gets Provisioned

For each environment (Sandbox, Staging, Production):

- A BTP **subaccount** in the given region
- **Entitlements**: XSUAA, Destination, HANA Cloud (hana), HANA HDI (hdi-shared), SaaS Registry, Alert Notification, Application Logging
- A **Cloud Foundry environment** instance and space
- A **HANA Cloud** service instance (default: 30 GB memory)
- An **IAS trust** configuration (if `idp_origin_key` is set)
- **Subaccount Administrator** role assignments for the given admin emails

## Customization

After running `cds add terraform`, edit the generated files directly:

- Change `hana_memory_gb` in `variables.tf` to resize HANA instances
- Add more entitlements or services to `main.tf`
- Adjust `cf_landscape_label` if your region uses a non-default label (e.g. `cf-us10-001`)
- Set per-environment `*_subdomain` variables for custom subaccount subdomains

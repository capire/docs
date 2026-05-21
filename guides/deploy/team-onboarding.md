---
synopsis: >
  Step-by-step guide for onboarding a new team to CAP on SAP BTP, from creating a global account, through provisioning subaccounts via Terraform, to deploying a CAP application with a UI via a production-grade CI/CD pipeline.
status: released
---

# Team Onboarding

{{ $frontmatter.synopsis }}

[[toc]]

## Overview

You'll end up with three subaccounts (_Sandbox_, _Staging_, _Production_) provisioned via Terraform, and a release flow where pushes to `main` auto-deploy to _Staging_ and tagged GitHub releases roll out to _Production_.

The topology mirrors what `cds add github-actions` produces, so the Terraform infrastructure and CI/CD workflows fit together without further glue.

## 1. Create the Global Account

Global account creation is a one-time, manual step. Request one via your BTP admin or [SAP for Me](https://me.sap.com).

You also need an admin user with permissions to create subaccounts.

Once the global account exists, note its **subdomain** (e.g. `my-team`) and pick a **region** (`eu12`, `us10`, …). The same region is used for all three subaccounts.

[Learn more about SAP BTP global accounts.](https://help.sap.com/docs/btp/sap-business-technology-platform/global-accounts){.learn-more}

### Set Up Identity

Authentication for your subaccounts and apps goes through **SAP Cloud Identity Services (IAS)**. Set this up once at the global-account level so every subaccount inherits the same trust:

1. Provision an IAS tenant for your team if you don't already have one. Request via your BTP admin or [SAP for Me](https://me.sap.com).
2. In the BTP cockpit, open your global account → **Security** → **Trust Configuration** → **Establish Trust** and select the IAS tenant. This makes IAS the identity provider for the global account.
3. Note the IAS **origin key** (e.g. `sap.custom`). Terraform uses it to wire IAS trust into each subaccount and to assign admin role collections.

[Learn more about IAS trust configuration.](https://help.sap.com/docs/btp/sap-business-technology-platform/establish-trust-and-federation-with-ui){.learn-more}

## 2. Install Local Tooling

Make sure the basic CAP tools are installed. In addition, you'll need [Terraform](https://developer.hashicorp.com/terraform/install).

[Learn more in Get Started.](../../get-started/){.learn-more}

## 3. Set Up the Landscape with Terraform

Use the bundled Terraform template to provision a consistent _Sandbox + Staging + Production_ landscape in one shot:

```sh
mkdir <your-project-name>
cd <your-project-name>
cds init
cds add terraform
```

You'll be prompted for:

| Prompt                  | Used for                                                |
|-------------------------|---------------------------------------------------------|
| `globalAccountId`       | Subdomain of your global account                        |
| `region`                | Region label for all subaccounts                        |
| `idp_origin_key`        | IAS origin key (defaults to `sap.custom`)               |
| BTP username + password | BTP Terraform provider auth                             |
| CF username + password  | Cloud Foundry Terraform provider auth                   |
| HANA SYSTEM password    | Initial HANA Cloud SYSTEM user password                 |

Four files are written to `.terraform/`: `main.tf`, `provider.tf`, `variables.tf`, and a `terraform.tfvars` (mode `0600`) holding the values you just entered. The whole `.terraform/` directory is already gitignored.

The result:

```zsh
Global Account (‹my-team›)
├── Subaccount: Sandbox
├── Subaccount: Staging
└── Subaccount: Production
```

Each subaccount gets the same baseline entitlements, a Cloud Foundry environment instance, a default CF space, and a HANA Cloud instance.

::: tip Why three subaccounts?
The split matches the CI/CD flow created by `cds add github-actions`:

- **Sandbox** for individual developers to experiment.
- **Staging** auto-deployed on every push to `main`.
- **Production** deployed only when a GitHub release is published.
:::

::: details Baseline entitlements per subaccount

| Service              | Plan          | Purpose                          |
|----------------------|---------------|----------------------------------|
| `xsuaa`              | `application` | Authentication                   |
| `destination`        | `lite`        | Outbound destinations            |
| `hana-cloud`         | `hana`        | Managed HANA                     |
| `hana`               | `hdi-shared`  | HDI containers                   |
| `saas-registry`      | `application` | Multitenant scenarios            |
| `alert-notification` | `standard`    | Operational alerts               |
| `application-logs`   | `lite`        | Log aggregation                  |

IAS trust is configured per subaccount, and admins listed in `sandbox_admin_emails` / `staging_admin_emails` / `production_admin_emails` are assigned the admin role collection.

:::

### Apply

```sh
cd .terraform
terraform init
terraform plan
terraform apply
```

HANA Cloud provisioning takes 20–30 minutes per instance, so expect this `terraform apply` to run for a while.

::: details Customizing variables

Create a `terraform.tfvars` next to `main.tf` to assign admins:

```hcl
sandbox_admin_emails    = ["alice@example.com"]
staging_admin_emails    = ["alice@example.com"]
production_admin_emails = ["alice@example.com"]
```

Other overrides (region, subdomains, role collection name, HANA memory, IP allowlist) are documented in `variables.tf`.

:::

## 4. Bootstrap, Deploy, and Wire Up CI/CD

Pick **one** deployment guide depending on your runtime choice:

- [Deploy to Cloud Foundry](to-cf): an opinionated, app-centric runtime where the platform manages buildpacks, routing, and bound services. Best when you want to focus on code over infrastructure.
- [Deploy to Kyma/K8s](to-kyma): a managed Kubernetes runtime where you own the container images, manifests, and networking. Best when you need fine-grained control or are already invested in the K8s ecosystem.

Then automate the rollout:

- [Deploy with CI/CD](cicd): wire up GitHub Actions so pushes to `main` deploy to _Staging_ and releases deploy to _Production_.

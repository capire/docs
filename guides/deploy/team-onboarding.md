---
synopsis: >
  Set up a Mac for CAP development, provision Sandbox, Staging, and Production on SAP BTP, and deploy a Bookshop application to Cloud Foundry from the command line.
status: draft
---

# Team Onboarding

{{ $frontmatter.synopsis }}

[[toc]]

## Before You Start

The CRM team maintains several CAP applications, such as Contacts, Sales Orders, and Bookshop. They share a team landscape with separate Sandbox, Staging, and Production subaccounts. This guide deploys Bookshop as the worked example using Node.js, Cloud Foundry, SAP HANA Cloud, IAS authentication, AMS authorization, and a Fiori UI served through an App Router and SAP BTP Portal. Terraform owns the landscape; `cds up` owns the application and its bound services. Once a global account is available, the setup below needs no BTP cockpit interaction. SSO and application login still use your browser.

Bootstrap the landscape once per team. If it already exists, obtain its Terraform outputs from the owner, complete local setup and login, then skip to application deployment. Each application has its own repository, MTA ID, IAS application, AMS policies, and release pipeline. Use a unique application name for each app in a shared stage; another app does not require another Terraform state or another set of subaccounts.

| CRM application | Responsibility | Repository / MTA ID |
| --- | --- | --- |
| Contacts | Customer and contact records | `crm-contacts` |
| Sales Orders | Order processing | `crm-orders` |
| Bookshop | Worked example for this onboarding | `bookshop` |

The CRM platform repository owns Terraform for all three stages. The application repositories own their CDS models, UI, MTA descriptors, service instances, and pipelines. All three apps can run in the same stage space; each app deploys its own services and HDI container.

A global account and its commercial entitlements must already exist. Request them from your BTP administrator or [SAP for Me](https://me.sap.com). Your provisioning user needs **Global Account Administrator** permissions to create subaccounts and assign entitlements. Include that user's email among the team administrators below.

An IAS tenant available to that provisioning user must also exist. The CRM team needs IAS identities for app login and policy-administration rights to assign AMS permissions after deployment. List available tenants from the CLI below and obtain application-policy access from your identity administrator.

The three stages have separate subaccounts, CF orgs, spaces, and databases. **Sandbox** is for experiments, **Staging** for integration checks, and **Production** for releases. The production classification alone does not configure database high availability, backups, or application scaling; configure those for your workload before serving customers.

## 1. Set Up Your Mac

Follow [Initial Setup](../../get-started/#initial-setup) for Homebrew, Node.js, `cds-dk`, Git, and optionally VS Code. Finish Homebrew's printed PATH setup instructions and open a new terminal.

Install the [MTA Build Tool](to-cf#mbt) and the [CF CLI and its MTA and HTML5 plugins](to-cf#cf-cli).

For landscape provisioning, install [Terraform](https://developer.hashicorp.com/terraform/install) with Homebrew:

~~~sh
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
~~~

Download the [SAP BTP CLI](https://tools.hana.ondemand.com/#cloud-btpcli) archive matching your Mac's processor (Apple silicon or Intel), extract it, and put the `btp` executable on your PATH. For example, if you extracted it into `~/Downloads/btp-cli`:

~~~sh
mkdir -p ~/.local/bin
install -m 755 ~/Downloads/btp-cli/btp ~/.local/bin/btp
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zprofile
exec zsh -l
~~~

Adjust the source path if you extracted the archive elsewhere. `btp --info` works before login and shows the CLI version. Verify all tools:

~~~sh
node --version
cds version
terraform version
btp --info
cf version
mbt --version
cf plugins
cds add --help
~~~

Use Terraform 1.2 or newer and CF CLI 8 or newer. `cf plugins` must list `multiapps` and `html5-plugin`. The Terraform facet is currently under development: your `cds-dk` build must list `terraform` in `cds add --help`.

<span id="onboarding-tools-end" />

## 2. Log In and Generate the Landscape

Obtain the **global-account subdomain** from your administrator. It can be a UUID; it is not the display name or a subaccount ID. Choose a region offering all required services, for example `eu12`:

~~~sh
btp login --sso --subdomain <global-account-subdomain>
btp --info
btp --format json list accounts/subaccount
btp --format json list accounts/entitlement
btp --format json list security/available-idp
cf login --sso -a https://api.cf.eu12-001.hana.ondemand.com
mkdir crm
cd crm
cds add terraform
~~~

Replace angle-bracket placeholders before running commands. Region and CF foundation are distinct: the default for region `eu12` is landscape `cf-eu12-001` and its API is `https://api.cf.eu12-001.hana.ondemand.com`. For another foundation, set `cf_landscape_label` in your variables and log in to its matching API. Use the same provisioning identity for both logins. CF does not need a target org or space yet. Check that `btp --info` shows the intended global account and server; a cockpit session alone does not authenticate Terraform.

| Prompt | Answer |
| --- | --- |
| Global account subdomain | The subdomain used for BTP login |
| Region | For example `eu12`; must match the CF API |
| `idp_origin_key` | Empty for SAP's default IdP; otherwise the BTP administrative origin supplied by your administrator |
| Email(s) | Comma-separated users receiving subaccount administrator and CF deployment access; put the logged-in CF provisioning user first |
| IAS tenant hostname | An available tenant hostname from `btp list security/available-idp`, without `https://` or a trailing slash |

Authentication uses CLI sessions; the email prompt controls roles. The first email is recorded as `cf_user`, the org creator whose organization membership CF creates automatically. Keep that value unchanged when another administrator later applies the configuration. The command creates `terraform/main.tf`, `provider.tf`, `variables.tf`, `outputs.tf`, local `terraform.tfvars`, and a `.gitignore`. An older preview may have generated its configuration in `.terraform/`: continue using that directory and its state instead of generating another landscape. Repeating the command preserves existing configuration. `--force` regenerates templates while preserving local variables; review changes before planning against a provisioned landscape.

### Choose Names and Identity Settings

Use a short, unique landscape name. Here `crm/` contains Terraform and a nested Bookshop app. Edit `terraform/terraform.tfvars` before the first apply to fit your team's naming:

~~~hcl
landscape            = "crm"
landscape_name       = "CRM"
sandbox_subdomain    = "crm-sandbox"
staging_subdomain    = "crm-staging"
production_subdomain = "crm-production"
~~~

`landscape` controls CF org and HANA names; `landscape_name` controls subaccount display names. Subdomains are globally unique. Check the existing inventory and reserve names with your team. Terraform creates new accounts; do not import an existing team account into this landscape.

| Stage | Subaccount | CF org | Space |
| --- | --- | --- | --- |
| Sandbox | CRM Sandbox | `crm-sandbox` | `sandbox` |
| Staging | CRM Staging | `crm-staging` | `staging` |
| Production | CRM Production | `crm-production` | `production` |

Terraform reuses the BTP CLI session with `USE_BTPCLI_SESSION=true` and reads the CF CLI login through its empty CF provider block. Log in to both CLIs before provisioning. Stale `CF_*` credential environment variables can override CF's CLI fallback; clear them or verify their target and user.

The default `cli_server_url` is `https://cli.btp.cloud.sap`. If `btp --info` shows another endpoint, put that exact URL in `terraform.tfvars`. For a custom CLI config location, export `BTPCLI_CONFIG_PATH` with the file path used by `btp --config`.

CF role assignments default to origin `sap.ids`. For a custom CF identity provider, set `cf_origin` to its UAA origin. This is independent of `idp_origin_key` for BTP administrative roles. The separate `ias_tenant` setting selects the IAS tenant for application login. Terraform establishes its application trust in each new subaccount; global-account platform trust does not provide this application trust. The tenant must be available to your provisioning user. An origin key such as `sap.custom` is not a tenant hostname.

### Check Capacity

Verify that the global account can assign the following **to each of the three stages**:

| Service | Plan | Purpose / capacity per stage |
| --- | --- | --- |
| `APPLICATION_RUNTIME` | `MEMORY` | 4 GB CF app memory; configurable with `cf_memory_gb` |
| `identity` | `application` | IAS app authentication and AMS authorization |
| `destination` | `lite` | Destinations |
| `hana-cloud` | `hana` | One HANA Cloud database, default 30 GB memory |
| `hana` | `hdi-shared` | App's HDI container |
| `html5-apps-repo` | `app-host`, `app-runtime` | Fiori UI storage and serving |
| `portal` | `standard` | Bookshop launchpad |

The initial Bookshop deployment needs 12 GB unassigned CF memory and capacity for three HANA databases. Additional CRM applications consume more CF memory and may need `cf_memory_gb` increased after a reviewed capacity change. Each app gets its own HDI container; apps in a stage can use the HANA database in that stage. Entitlements authorize consumption; service use can incur charges. Terraform does not reclaim quotas from existing accounts. Obtain additional capacity before applying if necessary.

## 3. Provision and Verify

In the same terminal, set a HANA SYSTEM password without putting it in shell history:

~~~zsh
read -s 'TF_VAR_hana_system_password?HANA SYSTEM password: '
printf '\n'
export TF_VAR_hana_system_password
export USE_BTPCLI_SESSION=true
cd terraform
terraform init
terraform fmt
terraform validate
terraform plan -out=landscape.tfplan
terraform apply landscape.tfplan
terraform output
terraform plan
cd ..
~~~

Use a password satisfying [SAP HANA Cloud password requirements](https://help.sap.com/docs/hana-cloud). Review the saved plan before applying: for a fresh landscape it must show only **adds**, **0 changes**, **0 destroys**, and exactly your three new subaccounts. Subaccounts have `prevent_destroy` protection, but every plan still needs review. Do not run `terraform destroy` during onboarding.

Each stage receives entitlements, CF runtime capacity, an org and space, administrator and Space Developer roles, and a HANA Cloud instance in that space. Space-local database provisioning supplies the app's HDI database without a cockpit mapping step. Provisioning can take 20–30 minutes. Leave the operation running until it finishes. The subsequent plan should report no changes.

Terraform also establishes IAS application trust for each stage. The app deployment creates an IAS application and deploys AMS policies for that app; these are separate from the BTP and CF infrastructure roles.

Normal Terraform output hides sensitive values, but state and saved plans can contain passwords. Restrict access and use an encrypted, access-controlled remote state backend before sharing the landscape. Keep **one state per landscape**, backed up; independent states for the same accounts can cause duplicate provisioning.

### Recover a Failed Apply

Keep the same directory and state. Fix the reported cause, run `terraform plan -out=landscape.tfplan` again, review it, and apply. Never delete state or change names to retry a partially provisioned landscape.

| Error | Action |
| --- | --- |
| BTP HTTP 401 | Re-run BTP SSO and match `cli_server_url` to `btp --info` |
| BTP HTTP 5xx during entitlement assignment | Preserve state, verify the account and assigned quotas with the CLI, and retry a reviewed plan; report persistent server errors to BTP support |
| Missing CF credentials | Log in to the region's CF API; clear stale credential overrides |
| HTTP 403 | Check provisioning permissions and that its email is in the admin lists |
| Insufficient entitlement | Obtain capacity; preserve existing assignments |
| Subdomain already exists | Choose unique names before creation; preserve names already recorded in state |
| HANA still provisioning | Wait for the active operation; inspect `cf service <hana-name>` before retrying |
| HDI cannot find a database | Verify HANA completed provisioning in this stage's space |

## 4. Create and Deploy Bookshop

From `crm/`:

~~~sh
cds init bookshop --nodejs --add sample
cd bookshop
cds add hana,ias,ams,mta,portal
npm install
~~~

These facets follow [Prepare for Production](to-cf#prepare-for-production), including the [Portal UI option](to-cf#add-ui). Portal adds App Router and HTML5 repository support. Refer to [Build and Deploy](to-cf#build-and-deploy) for the deployment procedure, build customization, and troubleshooting.

Give each CRM app a distinct route prefix. In `mta.yaml`, add `host` to the existing parameters of the `bookshop` App Router module:

~~~yaml
modules:
  - name: bookshop
    parameters:
      host: crm-${space}
~~~

For Contacts use `crm-contacts-${space}`; for Sales Orders use `crm-orders-${space}`. `${space}` is resolved from the targeted CF stage. Keep the other generated module parameters and bindings.

In the existing `bookshop-ias` resource, set `parameters.config.display-name` to `CRM Bookshop (${space})`. This makes the three IAS applications easy to distinguish when assigning AMS policies. Give the other apps their own corresponding display names.

For the other CRM apps, use their repository names when running `cds init`, for example `cds init crm-contacts --nodejs` or `cds init crm-orders --nodejs`. Develop their models and UI following [Domain Modeling](../../guides/domain-modeling), then add the same production facets. Their unique package names become distinct MTA IDs, so deploying one app does not replace another.

Use the org and space names from `terraform output`. This first run tests the same app in all three new stages:

~~~sh
for stage in sandbox staging production; do
  cf target -o "crm-$stage" -s "$stage"
  cf target
  cds up
  cf apps
  cf services
  cf mta bookshop
done
~~~

Change `crm` if you chose another prefix. Verify the target before every deployment. For daily work, deploy manually to Sandbox and use a release process for Staging and Production.

### Assign App Roles and Test

Infrastructure roles do not grant Bookshop application permissions. `cds add ams` generates and deploys authorization policies alongside the app. Assign the generated `cap.admin` policy to your IAS user for the IAS application in each stage, following [AMS policy assignment](../security/cap-users#ams-deployment). This uses the IAS tenant Administrative Console and requires policy-administration rights. Reuse existing CRM team identities across applications.

For **each stage**, open the `bookshop` App Router route shown by `cf apps`. Sign in, open **Browse Books**, and verify seeded books and prices. Open **Manage Books** after assigning the policy. In Sandbox, record a book's stock, change it by one, save, and reload to confirm persistence; then restore the original value and reload again. The development index and Fiori preview are disabled in production; use the deployed Portal UI.

All long-running apps must have their requested instances running. `cf services` must show successful creation of HANA, HDI, IAS, HTML5, and Portal services. On failure, inspect `cf mta-ops` and `cf logs bookshop-srv --recent`, then use [CF troubleshooting](../../get-started/get-help#mta). A successful deployment operation alone does not prove the UI works.

## 5. Set Up CI/CD and Team Ownership

For each CRM app, set its own repository's Git remote before `cds add github-actions`, so release workflows use the correct repository. Follow [Deploy using CI/CD Pipelines](cicd#github-actions).

Configure GitHub environments **Staging** and **Production** with `CF_API`, `CF_ORG`, `CF_SPACE`, `CF_USERNAME`, and secret `CF_PASSWORD` for their respective Terraform outputs. Use a technical deployment user with supported noninteractive login and CF deployment rights scoped to these new targets. Local CLI SSO sessions are not CI credentials. Grant CF-only deployment rights without making the technical user a BTP administrator:

~~~sh
cf set-org-role <technical-user> <cf-org> OrgUser
cf set-space-role <technical-user> <cf-org> <cf-space> SpaceDeveloper
~~~

For a custom CF IdP, append `--origin <cf-origin>` to both commands. If this user should receive the template's administrator access, add its email to the appropriate stage's list and apply the reviewed plan.

The generated workflows deploy `main` pushes to Staging and published releases to Production. Configure Production's required reviewers and branch rules before releasing. Infrastructure provisioning remains separate from app CI/CD.

Keep Contacts, Sales Orders, and Bookshop in separate repositories with distinct MTA IDs and app-specific routes. Their pipelines target the same team stage orgs and spaces, while keeping service instances and credentials app-specific.

Commit app source, `mta.yaml`, lockfiles, and workflows. Commit Terraform configuration and `.terraform.lock.hcl`; keep state, local `*.tfvars`, and saved plans in protected storage. Record who owns provisioning and state access so the next developer can reuse the landscape.

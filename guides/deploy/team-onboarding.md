---
description: >
  Prepare a team landscape on SAP BTP for app deployment and CI/CD.
status: released
---

# Team Onboarding

{{ $frontmatter.description }}

[[toc]]

## Overview

Assume your team is developing a complex CRM solution with multiple apps and services that share three subaccounts, one for each stage:

::: info A subaccount for each stage

- **Sandbox** for development and experiments.
- **Staging** for integration checks.
- **Production** for releases to users.
:::

Each app has its own repository and release pipeline.

::: tip Shared Setup

Typically, one operator sets up the shared landscape so the whole team can deploy apps with `cds up` without repeating the setup.
:::

## 1. Choose a Runtime

Choose the runtime that fits your team before provisioning the landscape:

### Cloud Foundry

Cloud Foundry is an opinionated runtime where the platform manages buildpacks, routing, and bound services. It fits teams that want to focus on application code.

### Kyma

Kyma is a managed Kubernetes runtime where you own the container images, manifests, and networking. Choose it when you need more control or already work with Kubernetes.

## 2. Install the Tools

We assume you've installed the basic tooling from [Getting Started](../../get-started/#initial-setup). Install Terraform and the BTP CLI, then the tools for your chosen runtime:

::: code-group
~~~sh [macOS]
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
brew install --cask btp
~~~
~~~sh [Linux]
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
btp_arch=$(uname -m)
btp_arch=${btp_arch/x86_64/amd64}
btp_arch=${btp_arch/aarch64/arm64}
curl -L "https://tools.hana.ondemand.com/additional/btp-cli-linux-$btp_arch-2.116.3.tar.gz" -o btp.tar.gz
tar -xzf btp.tar.gz
sudo install -m 755 "linux-$btp_arch/btp" /usr/local/bin/btp
~~~
~~~powershell [Windows]
winget install --silent Hashicorp.Terraform
winget install --silent SAP.btp

# Open a new terminal after installation.
# For WSL, follow the Linux steps.
~~~
:::

### Cloud Foundry Tools

::: code-group
~~~sh [macOS/Linux]
brew install cloudfoundry/tap/cf-cli@8
~~~
~~~powershell [Windows]
winget install --silent CloudFoundry.CLI.v8
winget install --silent ezwinports.make
~~~
:::

In your terminal:

~~~sh
npm install -g mbt
cf add-plugin-repo CF-Community https://plugins.cloudfoundry.org
cf install-plugin -f multiapps
cf install-plugin -f html5-plugin
~~~

### Kyma Tools

::: code-group
~~~sh [macOS/Linux]
brew install kubernetes-cli helm buildpacks/tap/pack
brew install int128/kubelogin/kubelogin
~~~
~~~powershell [Windows]
winget install --silent Kubernetes.kubectl
winget install --silent Helm.Helm
winget install --silent int128.kubelogin
Invoke-WebRequest https://github.com/buildpacks/pack/releases/download/v0.40.10/pack-v0.40.10-windows.zip -OutFile pack.zip
Expand-Archive pack.zip -DestinationPath "$env:LOCALAPPDATA\Microsoft\WinGet\Links" -Force
~~~
:::

For app deployment, you also need [Docker](https://docs.docker.com/get-docker/) and a [container registry](to-kyma#get-access-to-a-container-registry).

## 3. Get a Global Account

[Request a global account](https://help.sap.com/docs/btp/sap-business-technology-platform/getting-global-account) and [an IAS tenant](https://help.sap.com/docs/cloud-identity-services/cloud-identity-services/get-your-tenant) from your BTP admin. You need **Global Account Administrator** access and permission to assign IAS authorization policies.

<span id="team-account-requests" />

Note your global account subdomain and IAS hostname.

## 4. Provision the Landscape

Log in to BTP and create a directory for your team:

~~~sh
btp login --sso
mkdir crm
cd crm
~~~

Choose the matching variant:

::: code-group
~~~sh [Cloud Foundry]
cf login --sso -a https://api.cf.eu10.hana.ondemand.com
cds add terraform --cf
~~~
~~~sh [Kyma]
cds add terraform --k8s
~~~
:::

You will be prompted for some inputs:

| Prompt | Enter |
| --- | --- |
| Global account subdomain | Your global account subdomain |
| Region | Your region, for example `eu10`. [Learn more about regions.](https://help.sap.com/docs/btp/sap-business-technology-platform/regions){.learn-more} |
| `idp_origin_key` | Leave empty for SAP's default identity provider; otherwise use your administrative identity provider's origin key |
| Email(s) | Team admin emails, with your login email first |
| IAS tenant hostname | Your team's IAS hostname for application trust, without `https://` |

<br>

The command creates the Terraform configuration in `crm/` for these stages:

| Subaccount | CF org / Kyma cluster | Space / Namespace |
| --- | --- | --- |
| CRM Sandbox | `crm-sandbox` | `team` |
| CRM Staging | `crm-staging` | `ci` |
| CRM Production | `crm-production` | `ci` |

### Apply

Use your BTP CLI login:

::: code-group
~~~sh [macOS/Linux]
export USE_BTPCLI_SESSION=true
~~~
~~~powershell [Windows]
$env:USE_BTPCLI_SESSION = 'true'
~~~
:::

Initialize the configuration, review the plan, then apply it:

~~~sh
terraform init
terraform plan
terraform apply
~~~

> You'll be prompted for the HANA SYSTEM password.

Applying the configuration creates the subaccounts, runtime, admin access, IAS trust, and a HANA database per stage. For Kyma, it also prepares the namespaces, service operator, and HANA mappings.

::: tip Allow time for provisioning
Provisioning HANA usually takes around 20–30 minutes. When setting up Kyma, you may be asked to sign in through your browser for cluster access.
:::

## 5. Deploy to Sandbox

Deploy your first app to *Sandbox* using the guide for your runtime:

### Cloud Foundry

Prepare and deploy your app with `cds up --to cf`.

[Learn more in Deploy to Cloud Foundry.](to-cf){.learn-more}

### Kyma

Prepare and deploy your app with `cds up --to k8s`.

[Learn more in Deploy to Kyma.](to-kyma){.learn-more}

## 6. Set Up CI/CD

Once your app runs in *Sandbox*, set up CI/CD to roll out changes to *Staging* and *Production*.

::: tip Release flow
Pushes to `main` deploy to *Staging*. Published GitHub releases deploy to *Production*.
:::

[Learn more in Deploy with CI/CD.](cicd){.learn-more}

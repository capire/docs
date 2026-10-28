---
description: >
  Prepare a team landscape on SAP BTP for app deployment and CI/CD.
status: released
---

# Team Onboarding

{{ $frontmatter.description }}

[[toc]]

## Overview

Assume your team is developing a complex CRM solution with multiple apps and services.

::: tip A subaccount for each stage

- **Sandbox** for development and experiments.
- **Staging** for integration checks.
- **Production** for releases to users.
:::

Each app has its own repository and release pipeline. We'll set up the shared landscape with Terraform so you can deploy your apps with a simple `cds up`.

## 1. Choose Runtime

Choose the runtime that fits your team before provisioning the landscape:

### Cloud Foundry

Cloud Foundry is an opinionated runtime where the platform manages buildpacks, routing, and bound services. It fits teams that want to focus on application code.

[Learn more in Deploy to Cloud Foundry.](to-cf){.learn-more}

### Kyma

Kyma is a managed Kubernetes runtime where you own the container images, manifests, and networking. Choose it when you need more control or already work with Kubernetes.

[Learn more in Deploy to Kyma.](to-kyma){.learn-more}

## 2. Install Tools

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
~~~
:::

> On Windows, open a new terminal after installation. For WSL, follow the Linux steps.

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

## 3. Global Account

[Request a global account](https://help.sap.com/docs/btp/sap-business-technology-platform/getting-global-account) and an IAS tenant from your BTP admin. You need **Global Account Administrator** access and permission to assign IAS authorization policies.

Note your global-account subdomain and IAS hostname. This example uses `eu10`.

## 4. Provision Landscape

Log in and create a directory for your team:

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
| Global account subdomain | Your global-account subdomain |
| Region | Your region, for example `eu10` |
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

Terraform prompts for the HANA SYSTEM password:

~~~sh
terraform init
terraform plan
terraform apply
~~~

Terraform creates the subaccounts, runtime, admin access, IAS trust, and a HANA database per stage. For Kyma, it also prepares the namespaces, service operator, and HANA mappings.

::: tip Allow time for provisioning
HANA takes about 20–30 minutes. Kyma clusters can take longer. Complete browser sign-in when prompted.
:::

## 5. Deploy to Sandbox

Select Sandbox from `crm/` to deploy your first app:

::: code-group
~~~sh [Cloud Foundry]
cf target -o crm-sandbox -s team
~~~
~~~sh [Kyma macOS/Linux]
export KUBECONFIG="$PWD/crm-sandbox.kubeconfig"
kubectl config set-context --current --namespace=team
~~~
~~~powershell [Kyma Windows]
$env:KUBECONFIG = "$PWD/crm-sandbox.kubeconfig"
kubectl config set-context --current --namespace=team
~~~
:::

- [**Deploy to Cloud Foundry**](to-cf)
- [**Deploy to Kyma**](to-kyma)

## 6. Set Up CI/CD

Once your app runs in Sandbox, set up CI/CD to roll out changes to Staging and Production.

::: tip Release flow
Pushes to `main` deploy to Staging. Published GitHub releases deploy to Production.
:::

[Learn more in Deploy with CI/CD.](cicd){.learn-more}

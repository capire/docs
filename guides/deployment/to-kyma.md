---
label: Deploy to Kyma/K8s
synopsis: >
  A step-by-step guide on how to deploy a CAP (Cloud Application Programming Model) application to Kyma Runtime of SAP Business Technology Platform.
breadcrumbs:
  - Cookbook
  - Deployment
  - Deploy to Kyma
status: released
# uacp: Used as link target from Help Portal at https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/Cloud/en-US/29c25e504fdb4752b0383d3c407f52a6.html and https://help.sap.com/viewer/65de2977205c403bbc107264b8eccf4b/Cloud/en-US/e4a7559baf9f4e4394302442745edcd9.html
---

<script setup>
  import { h } from 'vue'
  const X  =  () => h('span', { class: 'x',   title: 'mandatory' }, ['✓'] )
</script>
<style scoped lang="scss">
  .x   { color: var(--vp-c-green-2); }
  h3 code + em { color: #666; font-weight: normal; }
  ol {
    margin-left: -10px;
    counter-reset: my-counter;
    li {
      counter-increment: my-counter;
      list-style: none;
      &::before {
        content: counter(my-counter);
        color: var(--vp-c-text-1);
        background-color: var(--vp-code-bg);
        width: 20px;
        height: 20px;
        background-size: 20px;
        line-height: 22px;
        border-radius: 50%;
        font-weight: 400;
        text-align: center;
        font-size: 12px;
        vertical-align: middle;
        display: inline-block;
        position: relative;
        top: -2px;
        left: -30px;
        margin-right: -20px;
      }
      p {
        display: inline;
      }
    }
  }
</style>

# Deploy to Kyma

You can run your CAP application in the [SAP BTP Kyma Runtime](https://discovery-center.cloud.sap/serviceCatalog/kyma-runtime?region=all), the SAP-managed offering for the [Kyma project](https://kyma-project.io/).

<ImplVariantsHint />

[[toc]]

## Overview

Kyma is a Kubernetes-based runtime for deploying and managing containerized applications. Applications are packaged as container images—typically Docker images—and their deployment and operations are defined using Kubernetes resource configurations.

Deploying apps on the SAP BTP Kyma Runtime requires two main artifact types:

1. **Container Images** – Your application packaged in a container
2. **Kubernetes Resources** – Configurations for deployment and scaling

The following diagram illustrates the deployment workflow:

![A CAP Helm chart is added to your project. Then you build your project as container images and push those images to a container registry of your choice. As a last step the Helm chart is deployed to your Kyma cluster, where service instances of SAP BTP services are created and pods pull the previously created container images from the container registry.](assets/deploy-kyma.drawio.svg)


## Prerequisites {#prerequisites}

+ Use a Kyma-enabled [Trial Account](https://account.hanatrial.ondemand.com/) or purchase a Kyma cluster from SAP
+ You need a [Container Image Registry](#get-access-to-a-container-registry)
+ Get the required SAP BTP service entitlements
+ Install [Docker Desktop or Docker for Linux](https://docs.docker.com/get-docker/)
+ Download and install the following command line tools:
  + [`kubectl` command line client](https://kubernetes.io/docs/tasks/tools/) for Kubernetes
  + [`pack` command line tool](https://buildpacks.io/docs/for-platform-operators/how-to/integrate-ci/pack/)
  + [`helm` command line tool](https://helm.sh/docs/intro/install/)
+ Make sure your SAP HANA Cloud is [mapped to your namespace](https://community.sap.com/t5/technology-blogs-by-sap/consuming-sap-hana-cloud-from-the-kyma-environment/ba-p/13552718#toc-hId-569025164)
+ Ensure SAP HANA Cloud is accessible from your Kyma cluster by [configuring trusted source IPs](https://help.sap.com/docs/HANA_CLOUD/9ae9104a46f74a6583ce5182e7fb20cb/0610e4440c7643b48d869a6376ccaecd.html)

#### Configure Kubernetes

Download the Kubernetes configuration from SAP BTP and move it to _$HOME/.kube/config_.

[Learn more in the SAP BTP Kyma documentation](https://help.sap.com/docs/btp/sap-business-technology-platform/access-kyma-instance-using-kubectl){.learn-more}

#### Get Access to a Container Registry

SAP BTP doesn't provide a container image registry (or container repository), but you can choose from offerings of hosted open source and private container image registries, as well as solutions that can be run on premise or in your own cloud infrastructure.

::: tip Ensure network access
Verify the Kubernetes cluster has network access to the container registry, especially if hosted behind a VPN or within a restricted network environment.
:::

#### Set Up Your Cluster for a Private Container Registry

To use a docker image from a private repository, you need to [create an image pull secret](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/) and configure this secret for your containers.

:::info Interactive setup
If a pull secret does not exist for your namespace when deploying your application, the CLI will prompt you to set up the pull secret interactively.
:::

::: warning Assign limited permissions to the technical user
For this secret, use a technical user with read-only permissions. This limits the risk, as anyone with access to the Kubernetes cluster could retrieve the password from the secret and potentially modify or publish images to the registry.
:::

<span id="afterprivatereg" />

## Deploy to Kyma

Let's  start with a new sample project and prepare it for production using an SAP HANA database and XSUAA for authentication:

<div class="impl java">

```sh
cds init bookshop --java --add sample && cd bookshop
cds add hana,xsuaa
```

</div>
<div class="impl node">

```sh
cds init bookshop --add sample && cd bookshop
cds add hana,xsuaa
```

</div>


#### User Interfaces <Beta />

If you need a UI, you can also add SAP Build Work Zone support:

```sh
cds add workzone
```
> This is currently only supported for single-tenant scenarios.

<!-- For that, create a container image with your UI files configured with the [HTML5 application deployer](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/9b178ab3388c4647b0c52f2c85641844.html). -->

#### Add CAP Helm Charts

CAP provides a configurable [Helm chart](https://helm.sh/) for Node.js and Java applications, which can be added like so:

```sh
cds add kyma
```
> You will be asked to provide a Kyma cluster domain and your container registry name.

::: details Running `cds build` now creates a _gen_/_chart_ folder

This folder will have all the necessary files required to deploy the Helm chart. Files from the _chart_ folder are copied to _gen/chart_.
They support the deployment of your CAP service, database, UI content, and the creation of instances for BTP services.

:::

#### Build and Deploy

**First, ensure the Docker daemon** is running, for example by starting Docker Desktop.

You can now quickly deploy the application like so:

```sh
cds up -2 k8s [ -n <your-namespace> ]
```

::: details Essentially, this automates the following steps...

```zsh
cds add kyma # if not already done

# Installing app dependencies, e.g.

# If package-lock.json doesn't exist
npm install --prefix app/browse

npm run build --prefix app/browse

# If package-lock.json doesn't exist
npm i app/admin-books

npm run build --prefix app/admin-books

# If project is multitenant
npm i --package-lock-only mtx/sidecar

# If package-lock.json doesn't exist
npm i --package-lock-only

# Buildpack commands
pack build bookshop-srv:latest --path gen/srv --builder builder-jammy-base --env BP_NODE_RUN_SCRIPTS=""
pack build bookshop-html5-deployer:latest --path app/html5-deployer --builder builder-jammy-base --env BP_NODE_RUN_SCRIPTS=""

# Final assembly and deployment, e.g.
helm upgrade --install bookshop ./gen/chart --namespace bookshop --wait --wait-for-jobs --timeout=10m
kubectl rollout status deployment bookshop-srv --timeout=8m
kubectl rollout status deployment bookshop-approuter --timeout=8m
kubectl rollout status deployment bookshop-sidecar --timeout=8m
```

:::

_This command uses checksums to detect changes in your code. If any modifications are found, it automatically triggers a rebuild. The checksums are reflected in the Docker image tags._

This process can take a few minutes to complete and logs output like this:

```log
[…]
The release bookshop is installed in namespace [namespace].

Your services are available at:
  [workload] - https://bookshop-[workload]-[namespace].[configured-domain]
[…]
```

You can use this URL to access the approuter as the entry point of your application.

For **multitenant applications**, you have to subscribe a tenant first. The application is accessible via a tenant-specific URL after subscription.

::: info SaaS Extensibility
Share the above App-Router URL with SaaS consumers for logging in as extension developers using `cds login` or other [extensibility-related commands](https://cap.cloud.sap/docs/guides/extensibility/customization#prep-as-operator).
:::

<!-- ::: tip See the examples
Try out the [CAP SFLIGHT](https://github.com/SAP-samples/cap-sflight)
and [CAP for Java](https://github.com/SAP-samples/cloud-cap-samples-java) examples on Kyma.
::: -->

---
{style="margin-top:11em"}

## Deep Dives


<span id="aftercluster" />

<span id="beforeend" />


### Configure Image Repository

Specify the repository where you want to push the images:

::: code-group

```yaml [containerize.yaml]
...
repository: <your-container-registry>
```
:::

### Customize Helm Chart {#customize-helm-chart}

#### About CAP Helm Charts {#about-cap-helm}

The following files are added to a _chart_ folder by executing `cds add kyma`:

```zsh
chart/
├── values.yaml         # Default configuration of the chart
├── Chart.yaml          # Chart metadata
└── values.schema.json  # JSON Schema for values.yaml file
```

[Learn more about _values.yaml_.](https://helm.sh/docs/chart_template_guide/values_files/){.learn-more}
[Learn more about _Chart.yaml_.](https://helm.sh/docs/topics/charts/){.learn-more}

<br>

In addition, a `cds build` also puts some files to the _gen/chart_ folder:

```zsh
chart/
├── templates/
│   ├── NOTES.txt # Message printed after Helm upgrade
│   ├── *.tpl     # Template libraries used in template resources
│   ├── *.yaml    # Template files for Kubernetes resources
```

[Learn how to create a Helm chart from scratch.](https://helm.sh/docs){.learn-more}

#### Configure {#configure-helm-chart}

You can change the configuration of CAP Helm charts by editing the _chart/values.yaml_ file. The `helm` CLI also offers you other options to overwrite settings from _chart/values.yaml_ file:

+ Overwrite properties using the  `--set` parameter.
+ Overwrite properties from a YAML or JSON file using the `-f` parameter.

::: tip Multiple deployment types
It is recommended to do the main configuration in the _chart/values.yaml_ file and have additional YAML files for specific deployment types (dev, test, productive) and targets.
:::

#### Global Properties

::: code-group

```yaml [values.yaml]
# Secret name to access container registry, only for private registries
imagePullSecret:
  name: <docker-secret>

# Kubernetes cluster ingress domain (used for application URLs)
domain: <cluster-domain>

# Container image registry where to pull the image from
image:
  registry: <registry-server>
```
:::

#### Deployment Properties

The following properties are available for the `srv` key:

::: code-group
```yaml [values.yaml]
srv:
  # [Service bindings](#configuration-options-for-service-bindings)
  bindings:

  # Kubernetes container resources
  # https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
  resources:

  # Map of additional env variables
  env:
    MY_ENV_VAR: 1

  # Kubernetes Liveness, Readiness and Startup Probes
  # https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
  health:
    liveness:
      path: <endpoint>
    readiness:
      path: <endpoint>
    startupTimeout: <seconds>

  # Container image
  image:
```
:::

> You can explore more configuration options in the subchart's directory _gen/chart/charts/web-application_.

### SAP BTP Services

You can find a list of SAP BTP services in the [Discovery Center](https://discovery-center.cloud.sap/viewServices?provider=all&regions=all&showFilters=true). To find out if a service is supported in the Kyma and Kubernetes environment, go to the **Service Marketplace** of your Subaccount in the SAP BTP Cockpit and select Kyma or Kubernetes in the environment filter.

You can find information about planned SAP BTP, Kyma Runtime features in the [product road map](https://roadmaps.sap.com/board?PRODUCT=73554900100800003012&PRODUCT=73554900100800003012).

#### Built-in SAP BTP Services

The Helm chart supports creating service instances for commonly used services. Services are pre-populated in _chart/values.yaml_ based on the used services in the `requires` section of the CAP configuration.

You can use the following services in your configuration:

::: code-group
```yaml [values.yaml]
xsuaa:
  parameters:
    xsappname: <name>
    HTML5Runtime_enabled: true # for SAP Launchpad service
event-mesh: …
connectivity: …
destination: …
html5-apps-repo-host: …
hana: …
service-manager: …
saas-registry: …
```
:::

<span id="beforemodify" />

#### Arbitrary BTP Services

These are the steps to create and bind to an arbitrary service, using the binding of the feature toggle service to the CAP application as an example:

1. In the _chart/Chart.yaml_ file, add an entry to the `dependencies` array.

    ```yaml
    dependencies:
      ...
      - name: service-instance
        alias: feature-flags
        version: 0.1.0
    ```

2. Add service configuration and binding in _chart/values.yaml_:

    ```yaml
    feature-flags:
      serviceOfferingName: feature-flags
      servicePlanName: lite
    ...
    srv:
       bindings:
         feature-flags:
            serviceInstanceName: feature-flags
    ```

    > The `alias` property in `dependencies` must match the property added in the root of _chart/values.yaml_ and the value of `serviceInstanceName` in the binding.

::: details Additional requirements for the SAP Connectivity service...

To access the SAP Connectivity service, add the following modules in your Kyma Cluster:

- connectivity-proxy
- transparent-proxy
- istio

You can do so using the `kubectl` CLI:

```sh
kubectl edit kyma default -n kyma-system
```

Then, add the three modules:
::: code-group
```yaml [editor]
spec:
  modules:
    - name: connectivity-proxy
    - name: transparent-proxy
    - name: istio
```
:::

Finally, you should see a success message as follows:

```sh
kyma.operator.kyma-project.io/default edited
```

[Learn more about adding modules from the Kyma Dashboard.](https://help.sap.com/docs/btp/sap-business-technology-platform/enable-and-disable-kyma-module?version=Cloud#loio1b548e9ad4744b978b8b595288b0cb5c){.learn-more style="margin-top:10px"}


#### Configuration Options for Services

_Services have the following configuration options:_

::: code-group
```yaml [values.yaml]
### Required ###
serviceOfferingName: my-service
servicePlanName: my-plan

### Optional ###

# Use instead of generated nname
fullNameOverride: <use instead of the generated name>

# Name for service instance in SAP BTP
externalName: <name for service instance in SAP BTP>

# List of tags describing service,
# copied to ServiceBinding secret in a 'tags' key
customTags:
  - foo
  - bar

# Some services support additional configuration,
# as found in the respective service offering
parameters:
  key: val
jsonParameters: {}

# List of secrets from which parameters are populated
parametersFrom:
  - secretKeyRef:
      name: my-secret
      key: secret-parameter
```
:::

> You can explore more configuration options in the subchart's directory _gen/chart/charts/service-instance_.

#### Configuration Options for Service Bindings

::: code-group
``` yaml [values.yaml]
<service name>:
  # Exactly one of these must be specified
  serviceInstanceName: my-service # within Helm chart
  serviceInstanceFullname: my-service-full-name # using absolute name
  # Additional parameters
  parameters:
    key: val
```
:::

#### Configuration Options for Container Images

::: code-group
``` yaml [values.yaml]
repository: my-repo.docker.io # container repo name
tag: latest # optional container image version tag
```
:::

#### HTML5 Applications

::: code-group
``` yaml [values.yaml]
html5-apps-deployer:
  image:
  bindings:
  resources:
  env:
    # Name of your business service (unique per subaccount)
    SAP_CLOUD_SERVICE: <service-name>
```
:::

[Container image]: #configuration-options-for-container-images
[HTML5 application deployer]: https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/9b178ab3388c4647b0c52f2c85641844.html
[Kubernetes Container resources]: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

#### Backend Destinations

Backend destinations maybe required for HTML5 applications or for App Router deployment. They can be configured using `backendDestinations`.

If you want to add an external destination, you can do so by providing the `external` property like this:

::: code-group
``` yaml [values.yaml]
...
srv: # Key is the target service, e.g. 'srv'
  backendDestinations:
    srv-api:
      service: srv
    ui5: # [!code ++]
      external: true # [!code ++]
      name: ui5 # [!code ++]
      Type: HTTP # [!code ++]
      proxyType: Internet # [!code ++]
      url: https://ui5.sap.com # [!code ++]
      Authentication: NoAuthentication # [!code ++]
```
:::

> Our Helm chart will remove the `external` key and add the rest of the keys as-is to the environment variable.

### Modify

Modifying the Helm chart allows you to customize it to your needs. However, this has consequences if you want to update with the latest changes from the CAP template.

You can run `cds add kyma` again to update your Helm chart. It has the following behavior for modified files:

1. Your changes of the _chart/values.yaml_ and _chart/Chart.yaml_ will not be modified. Only new or missing properties will be added by `cds add kyma`.
2. To modify any of the generated files such as templates or subcharts, copy the files from _gen/chart_ folder and place it in the same level inside the _chart_ folder. After the next `cds build` executions the generated chart will have the modified files.
3. If you want to have some custom files such as templates or subcharts, you can place them in the _chart_ folder at the same level where you want them to be in _gen/chart_ folder. They will be copied as is.

### Extend

Instead of modifying consider extending the CAP Helm chart. Just make sure adding new files to the Helm chart does not conflict with `cds add kyma`.

::: tip Consider Kustomize
A modification-free approach to change files is to use [Kustomize](https://kustomize.io/) as a [post-processor](https://helm.sh/docs/topics/advanced/#post-rendering) for your Helm chart. This might be usable for small changes if you don't want to branch-out from the generated `cds add kyma` content.
:::


### Services from Cloud Foundry

To bind service instances created on Cloud Foundry (CF) to a workload (`srv`, `hana-deployer`, `html5-deployer`, `approuter` or `sidecar`) in the Kyma environment, do the following:

1. Create a secret with credentials from the service key of that instance.

2. Use the `fromSecret` property inside the `bindings` key of the workload.

For example, if you want to use an `hdi-shared` instance created on CF:

1. [Create a Kubernetes secret](https://kubernetes.io/docs/concepts/configuration/secret/#creating-a-secret) with service key credentials from CF
2. Add additional properties to the Kubernetes secret:

    ```yaml
    stringData:
      # <…>
      .metadata: |
        {
          "credentialProperties":
            [
              { "name": "certificate", "format": "text"},
              { "name": "database_id", "format": "text"},
              { "name": "driver", "format": "text"},
              { "name": "hdi_password", "format": "text"},
              { "name": "hdi_user", "format": "text"},
              { "name": "host", "format": "text"},
              { "name": "password", "format": "text"},
              { "name": "port", "format": "text"},
              { "name": "schema", "format": "text"},
              { "name": "url", "format": "text"},
              { "name": "user", "format": "text"}
            ],
          "metaDataProperties":
            [
              { "name": "plan", "format": "text" },
              { "name": "label", "format": "text" },
              { "name": "type", "format": "text" },
              { "name": "tags", "format": "json" }
            ]
        }
      type: hana
      label: hana
      plan: hdi-shared
      tags: '[ "hana", "database", "relational" ]'
    ```

    > Update the values of the properties accordingly.

3. Change `serviceInstanceName` to `fromSecret` for each workload with that service instance in `bindings` in _chart/values.yaml_:

    ```yaml [values.yaml]
    …
    srv:
      bindings:
        db:
            serviceInstanceName: ## [!code --]
            fromSecret: <your secret> ## [!code ++]
    hana-deployer:
      bindings:
        hana:
          serviceInstanceName: ## [!code --]
          fromSecret: <your secret> ## [!code ++]
    ```

4. Delete `hana` in _chart/values.yaml_:

      ```yaml
      …
      hana: ## [!code --]
        serviceOfferingName: hana ## [!code --]
        servicePlanName: hdi-shared ## [!code --]
      …
      ```

5. Make the following changes to _chart/Chart.yaml_:

      ```yaml
      …
      dependencies:
        …
        - name: service-instance ## [!code --]
          alias: hana ## [!code --]
          version: ">0.0.0" ## [!code --]
        …
      ```

### Cloud Native Buildpacks

Cloud Native Buildpacks provide advantages like embracing [best practices](https://buildpacks.io/features/) and secure standards such as:

+ Resulting images use an unprivileged user
+ Builds are [reproducible](https://buildpacks.io/docs/features/reproducibility/)
+ [Software Bill of Materials](https://buildpacks.io/docs/features/bill-of-materials/) (SBoM) baked into the image
+ Auto-detection of base images

Additionally Cloud Native Buildpacks can be easily plugged together to fulfill more complex requirements. For example the [ca-certificates](https://github.com/paketo-buildpacks/ca-certificates) enables adding additional certificates to the system trust-store at build and runtime. When using Cloud Native Buildpacks you can continuously benefit from best practices coming from the community without any changes required.

[Learn more about Cloud Native Buildpacks Concepts.](https://buildpacks.io/docs/concepts/){ .learn-more}

<div id="aftercloudnative" />

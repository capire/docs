---
label: Hybrid Testing
synopsis: >
  How to locally test your application with real cloud services.
permalink: advanced/hybrid-testing
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/29c25e504fdb4752b0383d3c407f52a6.html and https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/e4a7559baf9f4e4394302442745edcd9.html
---

# Hybrid Testing { #hybrid-testing}

CAP enables you to run and test your CAP application using a local SQLite database and mocks to a large extent. However, you might want to test with actual cloud services at some point.

**Hybrid testing** capabilities help you stay in a local development environment and avoid long turnaround times of cloud deployments, by selectively connecting to services in the cloud.

[[toc]]

## Bind to Cloud Services

### Services on Cloud Foundry

```sh
cds bind db --to bookshop-db
```

Binds the service `db` of your local CAP application to the service instance `bookshop-db`, using your currently targeted Cloud Foundry space. Here, `bookshop-db` is a _managed_ service of kind `hana` with plan `hdi-shared`.

::: tip `cds bind` automatically creates a service key for you
If no service key for your service `<srv>` is specified, a `<srv>-key` is automatically created.
The service name `db` can be omitted as it represents the default value for the service kind `hana`.
:::

[Got errors? See our troubleshooting for connection issues with SAP HANA Cloud.](../get-started/get-help#connection-failed-89008){.learn-more}

Output:

```log
[bind] - Retrieving data from Cloud Foundry...
[bind] - Binding db to Cloud Foundry managed service bookshop-db:bookshop-db-key with kind hana.
[bind] - Saving bindings to .cdsrc-private.json in profile hybrid.
[bind] -
[bind] - TIP: Run with cloud bindings: cds watch --profile hybrid
```

For most commonly used services, CAP can automatically infer the service type and kind — in our example, the `db` CDS service is bound and set to the `hana` kind without additional parameters.

::: code-group
```json {5}[.cdsrc-private.json]
{
  "requires": {
    "[hybrid]": {
      "db": {
        "kind": "hana",
        "binding": {
          "type": "cf",
          "apiEndpoint": "https://api.sap.hana.ondemand.com",
          "org": "your-cf-org",
          "space": "your-cf-space",
          "instance": "bookshop-db",
          "key": "bookshop-db-key",
          "vcap": {
            "label": "hana",
            "plan": "hdi-shared"
          },
          "resolved": false
        }
      }
    }
  }
}
```
:::

Bindings are assigned to the `hybrid` profile by default.

::: tip No credentials are saved on-disk
Only the information about **where the credentials can be obtained** is stored on your machine.
:::

#### User-Provided Services on Cloud Foundry { #binding-user-provided-services}

```sh
cds bind my --to bookshop-ups
```

Binds the service `my` of your local CAP application to the user provided service instance `bookshop-ups`. The service name `my` has to match the service name used in the CDS `requires` service configuration.

Output:

```log
[bind] - Retrieving data from Cloud Foundry...
[bind] - Binding my to Cloud Foundry user provided service bookshop-ups. // [!code focus]
[bind] - Saving bindings to .cdsrc-private.json in profile hybrid.
[bind] -
[bind] - TIP: Run with cloud bindings: cds watch --profile hybrid
```

#### Shared Service Instances on Cloud Foundry <Since version="7.9.0" package="@sap/cds-dk" /> { #binding-shared-service-instances}

On SAP BTP Cloud Foundry, service instances can be shared across orgs and spaces. Even such shared instances can be used in `cds bind`:

```sh
cds bind messaging --to bookshop-redis
```

Binds the `messaging` service of your CAP application to the shared `bookshop-redis` service instance. `cds bind` retrieves the `org` and `space` where the service is shared from, as the service key needs to be created within that org and space. This requires the _Space Developer_ role for both spaces.

::: tip Use `cds bind --to bookshop-redis`
The service name `messaging` can be omitted as it represents the default value for the service kind `redis-messaging`.
:::

::: code-group
```json {5}[.cdsrc-private.json]
{
  "requires": {
    "[hybrid]": {
      "redis": {
        "binding": {
          "type": "cf",
          "apiEndpoint": "https://api.sap.hana.ondemand.com",
          "org": "shared-from-cf-org", // [!code focus]
          "space": "shared-from-cf-space", // [!code focus]
          "instance": "redis-cache",
          "key": "redis-cache-key",
          "resolved": false
        },
        "kind": "redis-messaging",
        "vcap": {
          "name": "messaging"
        }
      }
    }
  }
}
```
:::

`cds watch --profile hybrid` will automatically resolve shared service instance bindings using the correct org and space.

::: info Not all services can be shared
Only services that have the `shareable` flag in the metadata set to `true` can be shared. Use command `cf curl /v3/service_offerings` to read the service catalog metadata.
See the [CloudFoundry docs](https://docs.cloudfoundry.org/devguide/services/sharing-instances.html) for further details.
:::

::: tip Allow dynamic deploy targets
Service bindings created by `cds bind` contain the Cloud Foundry API endpoint, org, and space. You can allow your services to connect to the currently targeted Cloud Foundry org and space by removing these properties from the binding structure.
:::

### Services on Kubernetes


You can bind to **Service Bindings** of Open Service Broker service instances, such as SAP BTP services, on your Kubernetes cluster and to plain Kubernetes **Secrets** by adding the `--on k8s` option to the `cds bind` command:

```sh
cds bind -2 ‹service binding or secret› --on k8s
```

The command uses your current Kubernetes context. That is your current server and namespace. You need to be logged in as a precondition.

#### Bind to Kubernetes Service Bindings

To list all **Service Bindings** in your current Kubernetes context, you can use the `kubectl get servicebindings` command:

```log
NAME                   SERVICE-INSTANCE  SECRET-NAME           STATUS  AGE
bookshop-auth-binding  bookshop-auth     bookshop-auth-secret  Ready   11s
```

Use the service binding name for the `-2` option:

```sh
cds bind -2 bookshop-auth-binding --on k8s
```

Output:

```log
[bind] - Retrieving data from Kubernetes...
[bind] - Binding uaa to Kubernetes service binding bookshop-auth-binding with kind xsuaa
[bind] - Saving bindings to .cdsrc-private.json in profile hybrid
[bind] -
[bind] - TIP: Run with cloud bindings: cds watch --profile hybrid
```

The binding information is stored in the _.cdsrc-private.json_ file of your project in the `requires` section:

::: code-group
```json [.cdsrc-private.json]
{
  "requires": {
    "[hybrid]": {
      "auth": {
        "binding": {
          "type": "k8s",
          "name": "bookshop-auth-binding",
          "cluster": "https://apiserver.d9a6204.kyma-stage.shoot.live.k8s-hana.ondemand.com",
          "instance": "bookshop-auth",
          "namespace": "dev",
          "secret": "bookshop-auth-secret",
          "resolved": false,
          "vcap": {
            "label": "xsuaa",
            "plan": "application"
          }
        },
        "kind": "xsuaa"
      }
    }
  }
}
```
:::

#### Bind to Kubernetes Secrets

Alternatively, you can bind to Kubernetes **Secrets**.

You can use the `kubectl get secrets` command to list all secrets in your current Kubernetes context:

```log
NAME               TYPE      DATA   AGE
bookshop-db        Opaque    11     44h
```

Use the secret name for the `-2` option.

You need to provide either the service argument or the `--kind` option as well, because secrets have no service metadata.

```sh
cds bind -2 bookshop-db --on k8s --kind hana
```

Output:

```log
[bind] - Retrieving data from Kubernetes...
[bind] - Binding db to Kubernetes secret bookshop-db with kind hana
[bind] - Saving bindings to .cdsrc-private.json in profile hybrid
[bind] -
[bind] - TIP: Run with cloud bindings: cds watch --profile hybrid
```

::: warning Service bindings take precedence
If a service binding with the same name as the Kubernetes secret exists, `cds bind` will connect to the service binding instead.
:::

## Run with Service Bindings

### Run CAP Node.js Apps with Service Bindings { #node}

Now, you can run your CAP service locally using the cloud service bindings:

```sh
cds watch --profile hybrid
```

It will resolve the cloud bindings in your configuration:
1. **Bindings to Cloud Foundry:** The credentials are downloaded from the service key of the Cloud Foundry API endpoint, org, and space that were targeted when `cds bind` was called. This requires you to be logged in to the correct Cloud Foundry API endpoint.
2. **Bindings to Kubernetes:** The credentials are downloaded from the service bindings and secrets of the Kubernetes cluster and namespace that were in the current context when `cds bind` was called.

You can also resolve and display credentials using the `cds env` command:

```sh
cds env get requires.db.credentials --profile hybrid --resolve-bindings
```

Example output:

```js
{
  url: 'jdbc:sap://BDB9AC0F20CB46B494E6742047C4F99A.hana.eu10.hanacloud.ondemand.com:443?encrypt=true&validateCertificate=true&currentschema=BDB9AC0F20CB46B494E6742047C4F99A',
  host: 'bdb9ac0f20cb46b494e6742047c4f99a.hana.eu10.hanacloud.ondemand.com',
  port: '443',
  driver: 'com.sap.db.jdbc.Driver',
  schema: 'BDB9AC0F20CB46B494E6742047C4F99A',
  hdi_user: 'BDB9AC0F20CB46B494E6742047C4F99A_DT',
  hdi_password: 'abc...xyz',
  user: 'BDB9AC0F20CB46B494E6742047C4F99A_RT',
  password: 'abc....xyz',
  certificate: '-----BEGIN CERTIFICATE-----\n' +
    '...' +
    '-----END CERTIFICATE-----'
}
```

### Run Arbitrary Commands with Service Bindings

With `cds bind` you avoid storing credentials on your hard disk. If you need to start other local applications with cloud service bindings, you can use the `exec` option.

For example, you can run the App Router from an `approuter` child directory:

::: code-group
```sh [Mac/Linux]
cds bind --exec -- npm start --prefix approuter
```
```cmd [Windows]
cds bind --exec -- npm start --prefix approuter
```
```powershell [Powershell]
cds bind --exec '--' npm start --prefix approuter
```
:::

This works by constructing a `VCAP_SERVICES` environment variable. You can output the content of this variable as follows:

::: code-group
```sh [Mac/Linux]
cds bind --exec -- node -e 'console.log(process.env.VCAP_SERVICES)'
```
```cmd [Windows]
cds bind --exec -- node -e 'console.log(process.env.VCAP_SERVICES)'
```
```powershell [Powershell]
cds bind --exec '--' node -e 'console.log(process.env.VCAP_SERVICES)'
```
:::

### Run CAP Java Apps with Service Bindings

Start your CAP Java application with `cds bind --exec` to use remote service bindings:

```sh
cds bind --exec mvn spring-boot:run
```

### Bindings from a Cloud Application

Instead of binding to specific cloud services, you can bind to all supported service bindings of an application running on the SAP BTP Cloud Foundry environment:

```sh
cds bind -a bookshop-srv # ...or the spelled out way:
cds bind --to-app-services bookshop-srv
```
> This shortcut is only possible if you don't need to provide a `kind`.

If your application has multiple service bindings of the same kind, `cds bind` will log warnings since they can not be resolved automatically. In this case you can resolve the ambiguities by adding the correct service instance name to the cds service configuration using the `vcap.name` property.

Here is an example of adding `vcap.name` for services of kind `xsuaa`.

```json
"requires": {
  "auth": {
    "kind": "xsuaa",
    "vcap": {
      "name": "bookshop-auth1"
    }
  },
  "auth2": {
    "kind": "xsuaa",
    "vcap": {
      "name": "bookshop-auth2"
    }
  }
}
```

## `cds bind` Usage { #cds-bind-usage}

### By Cloud Service Only

The shortest way to use `cds bind` is to specify only the Cloud Foundry service instance name:

```sh
cds bind -2 bookshop-db
```

You can specify a different key after a colon ("`:`"):

```sh
cds bind -2 bookshop-db:my-db-key
```

### With different profile

By default `cds bind` uses the profile `hybrid` to store binding information. You can specify a different profile with `--for` or shortcut `-4`:

```sh
cds bind --to bookshop-db --for test
```

You have to use the same profile name for hybrid testing to correctly resolve any bindings you've created with this profile.

```sh
cds watch --profile test
```

### With CDS Service and Kind

If `kind` or CDS service cannot be determined automatically by `cds bind`, you need to specify it:

```sh
cds bind credstore -2 my-credstore --kind credstore
```

You are informed with an error message if this is required.

### Bind Multiple Services with One Command

There is a handy shortcut to bind multiple services with one command:

```sh
cds bind -2 bookshop-db,bookshop-auth
```
> This shortcut is only possible if you don't need to specify a `kind`.

### Overwrite Cloud Service Credentials { #overwriting-service-credentials}

Some hybrid test scenarios might require to overwrite dedicated service credential values. For example, if you want to connect to a Cloud Foundry service via an SSH tunnel. In the example below the value of the property _onpremise_proxy_host_ is updated with the value _localhost_.

```sh
cds bind -2 my-service --credentials '{ "onpremise_proxy_host": "localhost" }'
```

::: code-group
```json [.cdsrc-private.json]
{
  "requires": {
    "[hybrid]": {
      "my-service": {
        "binding": {
          "type": "cf",
          "apiEndpoint": "https://api.sap.hana.ondemand.com",
          "org": "your-cf-org",
          "space": "your-cf-space",
          "instance": "my-service",
          "key": "my-service-key",
          "credentials": { // [!code focus]
            "onpremise_proxy_host": "localhost" // [!code focus]
          }, // [!code focus]
          "resolved": false
         }
      }
    }
  }
}
```
:::

Now, you can run your CAP service locally using cloud service bindings in combination with merged custom credential values:

```sh
cds watch --profile hybrid
```

Example output:

```js
{
  onpremise_proxy_host: 'localhost', // [!code focus]
  // other cloud foundry credential values
}
```

You can also overwrite credential values for multiple services with a single `cds bind` call. Use the service instance together with an optional service key name as defined in the `--to` parameter to add the custom credential values for that service:

```sh
cds bind --to my-service,redis-cache:my-key,bookshop-xsuaa --credentials \
  '{ "my-service": { "onpremise_proxy_host": "localhost" }, "redis-cache:my-key":{ "hostname": "localhost", "port": 1234 }}'
```

Use the service instance name in combination with the option `-a` if you want to create bindings for all service instances of your application:

```sh
cds bind -a bookshop-srv --credentials \
  '{ "my-service": { "onpremise_proxy_host": "localhost" }, "redis-cache":{ "hostname": "localhost", "port": 1234 }}'
```

See [Accessing services with SSH](https://docs.cloudfoundry.org/devguide/deploy-apps/ssh-services.html) for further details on how you can gain direct command line access to your deployed service instance using SSH.

### With Profile and Output File

By default, the bindings for the `hybrid` profile are stored in the _.cdsrc-private.json_ file in your current working directory.

This can be overwritten using the `--out` option.

### Execute Commands with Bindings { #cds-bind-exec}

You can start arbitrary command line programs with your bindings.

The service bindings are [resolved from the cloud](#node) and [provided in the `VCAP_SERVICES` env variable](../node.js/cds-connect#provide-service-bindings) to the application. So it works with every application that can consume Cloud Foundry credentials.

```sh
cds bind --exec [--] <command> <args ...>
```

Use the double-dash (`--`) if your command has args starting with a dash (`-`) character. Otherwise the `cds` command line will try to parse them as their own options.

On PowerShell you need to quote the double dash (`--`) when an option with double dash follows:

```powershell
cds bind --exec '--' somecmd --someflag --some-double-dash-parameter 42
```

Profiles can be set using the optional `--profile` parameter. By default the `hybrid` profile is used.

```sh
cds bind --exec --profile <profile> [--] <command> <args ...>
```

The `--profile` parameter must follow `exec` directly.

## Use Cases

Most of the following use cases are shown for Node.js, but can be easily adapted for Java.

### Destinations

Learn how to [connect to remote services locally](../guides/services/consuming-services#connect-to-remote-services-locally) using SAP BTP destinations.

### Authentication and Authorization using XSUAA

Learn how to do hybrid testing using the XSUAA service in the [CAP Node.js authentication documentation](../node.js/authentication#xsuaa-setup).
### Integration Tests

`cds bind` can be handy for testing with real cloud services in your CI/CD pipeline.

Configure your required bindings for testing and save them to your project's _package.json_ file for your tests' profile:

```sh
cds bind -2 integration-test-hana -o package.json -4 integration-test
```

No credentials are saved!

In your CI/CD pipeline you can resolve the bindings and inject them into the test commands:

```sh
# Login
cf auth $USER $PASSWORD
# Optional if your bindings have org and space removed to be agnostic
cf target -o $ORG -s $SPACE

# Set profile
export CDS_ENV=integration-test  # [!code highlight]

# Set resolved bindings
export cds_requires="$(cds env get requires --resolve-bindings)"  # [!code highlight]

# Run tests
npm run integration-test  # [!code highlight]
```

Some comments to the previous snippet:
- With `CDS_ENV` you specify the [configuration profile](../node.js/cds-env#profiles) for the test, where you previously put the service binding configuration.
- [`cds env get requires`](../node.js/cds-env#services) prints the `requires` section of the configuration as a JSON string. Through `--resolve-bindings`, it includes the credentials of the service bindings from the cloud. To make the credentials available for all subsequent `cds` commands and the tests, the `requires` JSON string is put into the `cds_requires` script variable.
- In `npm run integration-test` any test code can run, for example, [`cds.test`](../node.js/cds-test).


<!-- TODO: "cds deploy" should take the existing bindings for hana -->

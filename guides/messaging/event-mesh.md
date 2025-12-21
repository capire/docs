---
# # layout: cookbook
shorty: SAP Event Mesh
status: released
---

# Using SAP Event Mesh in Cloud Foundry

CAP provides out-of-the-box support for [SAP Event Mesh](https://help.sap.com/docs/event-mesh), and automatically handles many things behind the scenes, so that application coding stays agnostic and focused on conceptual messaging.

::: warning
The following guide is based on a productive (paid) account on SAP BTP. It's not supported to use the trial offering of SAP Event Mesh.
:::

[[toc]]



## Prerequisite: Create an Instance of SAP Event Mesh

- [Follow this tutorial](https://developers.sap.com/group.cp-enterprisemessaging-get-started.html) to create an instance of SAP Event Mesh with plan `default`.
- Alternatively follow [one of the guides in SAP Help Portal](https://help.sap.com/docs/SAP_EM/bf82e6b26456494cbdd197057c09979f/3ef34ffcbbe94d3e8fff0f9ea2d5911d.html).

::: tip
**Important:** You don't need to manually create queues or queue subscriptions as CAP takes care for that automatically based on declared events and subscriptions.
:::


## Use `enterprise-messaging`

Add the following to your _package.json_ to use SAP Event Mesh:

```jsonc
"cds": {
  "requires": {
    "messaging": {
      "[production]": { "kind": "enterprise-messaging" },
    }
  }
}
```

[Learn more about `cds.env` profiles](../../node.js/cds-env#profiles){.learn-more}
[Learn how to use the CloudEvents protocol.](../../node.js/messaging#cloudevents-protocol){.learn-more}

:::tip **Behind the Scenes**

The `enterprise-messaging` implementation handles these things automatically and transparently:

  - Creation of queues & subscriptions for event receivers
  - Handling all broker-specific handshaking and acknowledgments
  - Constructing topic names as expected by the broker

:::

### Optional: Add `namespace` Prefixing Rules

SAP Event Mesh documentation recommends to prefix all event names with the service instance's configured `namespace`, both, when emitting as well as when subscribing to events. If you followed these rules, add corresponding rules to your configuration in _package.json_ to have CAP's messaging service implementations enforcing these rules automatically:

```json
"cds": {
  "requires": {
    "messaging": {
      "publishPrefix": "$namespace/",
      "subscribePrefix": "$namespace/"
    }
  }
}
```

The variable `$namespace` is resolved from your SAP Event Mesh service instance's configured `namespace` property.


## Run Tests in `hybrid` Setup

Before [deploying to the cloud](#deploy-to-the-cloud-with-mta), you may want to run some ad-hoc tests with a hybrid setup, that is, keep running the CAP services locally, but using the SAP Event Mesh instance from the cloud. Do that as follows:

1. Configure CAP to use the `enterprise-messaging-shared` implementation in the `reviews` and `bookstore` sample:

    ```jsonc
    "cds": {
      "requires": {
        "messaging": {
          "[hybrid]": { "kind": "enterprise-messaging-shared" }
        }
      }
    }
    ```

    > The `enterprise-messaging-shared` variant is for single-tenant usage and uses AMQP by default. Thus, it requires much less setup for local tests compared to the production variant, which uses HTTP-based protocols by default.

2. Add `@sap/xb-msg-amqp-v100` as dependency to `reviews` and `bookstore`:

    ```sh
    npm add @sap/xb-msg-amqp-v100
    ```

    [Learn more about SAP Event Mesh (Shared).](../../node.js/messaging#event-mesh-shared){.learn-more}

3. Create a service key for your Event Mesh instance [→ see help.sap.com](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/4514a14ab6424d9f84f1b8650df609ce.html)

4. Bind to your Event Mesh instance's service key from `reviews` and `bookstore`:

    ```sh
    cds bind -2 <instance>:<service-key>
    ```


    [Learn more about `cds bind` and hybrid testing.](../advanced/hybrid-testing){.learn-more}

5. Run your services in separate terminal shells with the `hybrid` profile:

    ```sh
    cds watch reviews --profile hybrid
    ```
    ```sh
    cds watch bookstore --profile hybrid
    ```

    [Learn more about `cds.env` profiles.](../../node.js/cds-env#profiles){.learn-more}

6. Test your app [as described in the messaging guide](./#add-or-update-reviews).


### CAP Automatically Creates Queues and Subscriptions

When you run the services with a bound instance of SAP Event Mesh as documented in a previous section, CAP messaging service implementations will automatically create a queue for each receiver process. The queue name is chosen automatically and the receiver's subscriptions added.


### Optional: Configure Queue Names

In case you want to manage queues yourself, use config option `queue.name` as follows:

```jsonc
"cds": {
  "requires": {
    "messaging": { // ...
      "queue": { "name": "$namespace/my/own/queue" }
    }
  }
}
```

In both cases — automatically chosen queue names or explicitly configured ones — if the queue already exists it's reused, otherwise it's created.

[Learn more about queue configuration options.](../../node.js/messaging#message-brokers){.learn-more}


## Deploy to the Cloud (with MTA)

A general description of how to deploy CAP applications to SAP BTP's Cloud Foundry, can be found in the [Deploy to Cloud* guide](../deploy/). As documented there, MTA is frequently used to deploy to SAP BTP. Follow these steps to ensure binding of your deployed application to the SAP Event Mesh instance.


### 1. Specify Binding to SAP Event Mesh Instance

Add SAP Event Mesh's service instance's name to the `requires` section of your CAP application's module, and a matching entry to the `resources` section, for example:

```yaml
modules:
  - name: bookstore-srv
    requires:
      - name: <Event Mesh Service Instance - Name>

resources:
  # SAP Event Mesh
  - name: <Event Mesh Service Instance - Name>
    type: org.cloudfoundry.managed-service
    parameters:
      service: enterprise-messaging
      service-plan: <Event Mesh Service Instance - Plan>
```

[Learn more about using MTA.](../deploy/){.learn-more}

::: warning
Make sure to use the exact `name` and `service-plan` used at the time creating the service instance you want to use.
:::


### 2. Optional: Auto-Create SAP Event Mesh Instances

MTA can also create the service instance automatically. To do so, you need to additionally provide a service descriptor file and reference that through the `path` parameter in the `resources` section:

```yaml
resources:
  # SAP Event Mesh as above...
    parameters:
      path: ./<Event Mesh Service Descriptor JSON file>
```

[Learn more about Service Descriptors for SAP Event Mesh.](https://help.sap.com/docs/SAP_EM/bf82e6b26456494cbdd197057c09979f/5696828fd5724aa5b26412db09163530.html){.learn-more}


<span id="afterdeploymta" />

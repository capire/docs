---
# # layout: cookbook
shorty: SAP Cloud Application Event Hub
status: released
---

# Using SAP Cloud Application Event Hub in Cloud Foundry

[SAP Cloud Application Event Hub](https://help.sap.com/docs/event-broker) is the new default offering for messaging in SAP Business Technology Platform (SAP BTP).
CAP provides out-of-the-box support for SAP Cloud Application Event Hub, and automatically handles many things behind the scenes, so that application coding stays agnostic and focused on conceptual messaging.

::: warning
The following guide is based on a productive (paid) account on SAP BTP.
:::

[[toc]]



## Prerequisite: Set up SAP Cloud Application Event Hub

Follow guides [Initial Setup](https://help.sap.com/docs/sap-cloud-application-event-hub/sap-cloud-application-event-hub-service-guide/initial-setup) as well as [Integration Scenarios &rarr; CAP Application as a Consumer](https://help.sap.com/docs/sap-cloud-application-event-hub/sap-cloud-application-event-hub-service-guide/cap-application-as-subscriber) to set up SAP Cloud Application Event Hub in your account.



## Configuration


### Use `event-broker` in Node.js

Install plugin [`@cap-js/event-broker`](../../plugins/#event-hub):

```sh
npm add @cap-js/event-broker
```

And add the following to your _package.json_ to use SAP Cloud Application Event Hub:

```jsonc
"cds": {
  "requires": {
    "messaging": {
      // kind "event-broker" is derived from the service's technical name
      "[production]": { "kind": "event-broker" }
    }
  }
}
```


[Learn more about configuring SAP Cloud Application Event Hub in CAP Node.js.](../../node.js/messaging#event-broker){.learn-more}

[Learn more about `cds.env` profiles.](../../node.js/cds-env#profiles){.learn-more}


### Use `event-hub` in Java

Install plugin [`com.sap.cds:cds-feature-event-hub`](../../plugins/#event-hub) and add the following to your _application.yaml_ to use SAP Cloud Application Event Hub:

::: code-group
```xml [srv/pom.xml]
<dependency>
    <groupId>com.sap.cds</groupId>
    <artifactId>cds-feature-event-hub</artifactId>
    <version>${latest-version}</version>
</dependency>
```

```yaml [srv/src/main/resources/application.yaml]
cds:
  messaging.services:
  - name: "messaging-name"
    kind: "event-hub"
```
:::

[Find the latest version on Maven central.](https://central.sonatype.com/artifact/com.sap.cds/cds-feature-event-hub/versions){.learn-more}
[Learn more about configuring SAP Cloud Application Event Hub in CAP Java.](../../java/messaging#using-real-brokers){.learn-more}



## Hybrid Testing

Since SAP Cloud Application Event Hub sends events via HTTP, you won't be able to receive events on your local machine unless you use a tunneling service.
Therefore we recommend to use a messaging service of kind [`local-messaging`](../../node.js/messaging#local-messaging) for local testing.



## Prepare for MTA Deployment {#deploy}

A general description of how to deploy CAP applications to SAP BTP Cloud Foundry, can be found in the [Deploy to Cloud guide](../deployment/).
As documented there, MTA is frequently used to deploy to SAP BTP.

[Learn more about using MTA.](../deployment/){.learn-more}

Follow these steps to ensure proper binding of your deployed application to the SAP Cloud Application Event Hub instance.
The guide makes use of the [@capire/incidents](https://github.com/cap-js/incidents-app) reference application.

We'll start with the definition of the app itself:

::: code-group
```yaml [mta.yaml]
modules:
  - name: incidents-srv
    provides:
      - name: incidents-srv-api
        properties:
          url: ${default-url} #> needed in references below
```
:::


### Add SAP Cloud Application Event Hub Instance

Your SAP Cloud Application Event Hub configuration must include your system namespace as well as the webhook URL.


::: code-group
```yaml [mta.yaml in Node.js]
resources:
  - name: incidents-event-broker
    type: org.cloudfoundry.managed-service
    requires:
      - name: incidents-srv-api
    parameters:
      service: event-broker
      service-plan: event-connectivity
      config:
        # unique identifier for this event broker instance
        # should start with own namespace (i.e., "foo.bar") and may not be longer than 15 characters
        systemNamespace: cap.incidents
        webhookUrl: ~{incidents-srv-api/url}/-/cds/event-broker/webhook

```

```yaml [mta.yaml in Java]
resources:
  - name: incidents-event-broker
    type: org.cloudfoundry.managed-service
    parameters:
      service: event-broker
      service-plan: event-connectivity
      config:
        # unique identifier for this event broker instance
        # should start with own namespace (i.e., "foo.bar") and may not be longer than 15 characters
        systemNamespace: cap.incidents
        webhookUrl: ~{incidents-srv-api/url}/messaging/v1.0/eb
      requires:
        - name: incidents-srv-api
```
:::


### Add Identity Authentication Service Instance

Your Identity Authentication service instance must be configured to include your SAP Cloud Application Event Hub instance under `consumed-services` in order for your application to accept requests from SAP Cloud Application Event Hub.
For this purpose, the Identity Authentication service instance should further be `processed-after` the SAP Cloud Application Event Hub instance.

::: code-group
```yaml {6,14} [mta.yaml]
resources:
  - name: incidents-ias
    type: org.cloudfoundry.managed-service
    requires:
      - name: incidents-srv-api
    processed-after:
      # for consumed-services (cf. below), incidents-event-broker must already exist
      # -> ensure incidents-ias is created after incidents-event-broker
      - incidents-event-broker
    parameters:
      service: identity
      service-plan: application
      config:
        consumed-services:
          - service-instance-name: incidents-event-broker
       	xsuaa-cross-consumption: true #> if token exchange from IAS token to XSUAA token is needed
        display-name: cap.incidents #> any value, e.g., reuse MTA ID
        home-url: ~{incidents-srv-api/url}
```
:::


### Bind the Service Instances

Finally, we can bring it all together by binding the two service instances to the application.
The bindings must both be parameterized with `credential-type: X509_GENERATED` and `authentication-type: X509_IAS`, respectively, to enable Identity Authentication service-based authentication.

::: code-group
```yaml {1-3} [mta.yaml]
modules:
  - name: incidents-srv
    provides:
      - name: incidents-srv-api
        properties:
          url: ${default-url} 
    requires: #[!code focus:10]
      - name: incidents-ias #[!code ++]
        parameters: #[!code ++]
          config: #[!code ++]
            credential-type: X509_GENERATED #[!code ++]
            app-identifier: cap.incidents #> any value, e.g., reuse MTA ID [!code ++]
      - name: incidents-event-broker #[!code ++]
        parameters: #[!code ++]
          config: #[!code ++]
            authentication-type: X509_IAS #[!code ++]
```
:::


<span id="event-hub-mt" />

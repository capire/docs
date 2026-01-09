---
synopsis: >
  The guide provides an overview of health checks that are available on Cloud Foundry and Kubernetes, how to configure them, as well as the respective defaults of the two CAP stacks.
status: released
---

# Health Checks

On both Cloud Foundry and Kubernetes, it is possible to provide two separate endpoints for liveness checks ("are you alive?") and readiness checks ("are you ready for more requests?").
A failure on the former leads to a restart, whereas a failure on the latter temporarily takes the app instance out of the request dispatching rotation until a subsequent readiness probe is successful.

[Learn more about health checks on Cloud Foundry.](https://docs.cloudfoundry.org/devguide/deploy-apps/healthchecks.html) {.learn-more}

[Learn more about health checks on Kubernetes.](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes) {.learn-more}

For **CAP Node.js**, the runtime provides an out-of-the-box endpoint for liveness and readiness checks at `/health`.
Requests that reach this public endpoint are answered with the status code 200 and the body `{ status: 'UP' }`.

[Learn more about availability checks in Node.js.](../../node.js/best-practices#availability-checks) {.learn-more}


For **CAP Java**, `cds add mta` and `cds add kyma` add the necessary dependencies and configuration for the publicly available probe endpoints `/actuator/health/liveness` and `/actuator/health/readiness`.

[Learn more about availability checks in Java.](../../java/operating-applications/observability#availability) {.learn-more}


[Learn more about Spring Boot health checks.](../../java/operating-applications/observability#spring-health-checks){.learn-more}

<!--

To achieve this, from `@sap/cds-dk^7.8` onwards, the configuration for readiness health checks is included in the MTA template for deployment to CF.
The default configuration specifies checks via http to `/` for Java (as there aren't any default Spring Boot health check endpoints) and `/health` for Node.js, respectively.

Additionally, for Node.js, the Helm chart template now specifies `/health` instead of `/` as the endpoint for the checks. For your app to be considered "alive", the endpoint `/health` needs to return a success response code.
This means, if you have a _fully custom_ `server.js`, you will need to add the `/health` endpoint to it, or adjust your MTA descriptor/Helm chart (if it's generated with `@sap/cds-dk^7.8`).

-->

For deployment to Kyma/ Kubernetes, `@sap/cds-dk` adds the necessary configurations to Helm charts.

::: warning Limited support for readiness checks on CF
Although supported by the Cloud Foundry core, readiness checks are not yet supported by the Cloud Foundtry CLI as well as the Cloud MTA Build Tool (MBT).
:::

::: tip Adjust deployment descriptors for custom health checks
Adjust the values created by `cds add` in case you add different Spring Boot health check endpoints or use a fully custom _server.js_.
:::


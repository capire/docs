# Integrating CAP Agents with Joule

CAP agents can be exposed through the Agent-to-Agent (A2A) protocol and consumed from SAP Joule. This guide connects an IAS-protected CAP agent to a Joule development tenant using an SAP BTP destination and a Joule capability.
{.abstract}

[[toc]]

The setup follows the [Integrate Joule with an External Agent reference architecture](https://architecture.learning.sap.com/docs/ref-arch/7b6426).

## How It Works

The integration has four parts:

1. A CAP application exposes an A2A endpoint and agent card.
2. SAP Cloud Identity Services protects the CAP application.
3. An SAP BTP destination obtains an IAS token with an X.509 client certificate and calls the A2A endpoint.
4. A Joule capability uses that destination through a remote `agent-request`.

The Joule development tenant, BTP subaccount, and IAS tenant must belong to the same formation.

## Prerequisites

Before you start, you need:

- A CAP agent deployed to Cloud Foundry and protected by SAP Cloud Identity Services
- An IAS service binding or service key with `credential-type: X509_GENERATED`
- A Joule development tenant and the Joule Studio CLI
- Permissions to manage destinations, formations, and Joule capabilities

The examples below use these names:

| Resource | Example |
| --- | --- |
| Capability | `xtravels_hotels_a2a` |
| System alias | `XTravelsHotelsAgent` |
| Destination | `XTRAVELS_HOTELS_A2A` |
| A2A endpoint | `https://<app-route>/a2a/hotels` |
| Agent card | `https://<app-route>/a2a/hotels/.well-known/agent-card.json` |

## Verify the CAP Agent

The agent card must be available with an IAS access token and must advertise the URL of the JSON-RPC endpoint. For example:

```json
{
  "name": "HotelsService",
  "url": "https://<app-route>/a2a/hotels",
  "protocolVersion": "0.3.0"
}
```

Keep both URLs distinct:

- Use `.../.well-known/agent-card.json` to discover and inspect the agent.
- Use the value of the card's `url` property as the destination URL. Joule sends A2A JSON-RPC requests to this URL.

> [!warning] Do not use the agent-card URL as the destination URL
> If the destination points to `.../.well-known/agent-card.json`, Joule sends a `POST` request to the card resource. The CAP application responds with `404`, and Joule reports an agent connector error such as `AgentConnector - 0105` with HTTP status `400`.

## Create the Joule Capability

Create a project with the digital assistant definition at its root and the capability in a subdirectory:

```text
joule-integration/
├── da.sapdas.yaml
└── hotels-agent/
    ├── capability.sapdas.yaml
    ├── capability_context.yaml
    ├── functions/
    │   └── call_agent.yaml
    └── scenarios/
        └── invoke_agent.yaml
```

The digital assistant definition references the local capability:

```yaml
schema_version: 1.4.0
name: xtravels_hotels_a2a
capabilities:
  - type: local
    folder: ./hotels-agent
```

In `capability.sapdas.yaml`, map a system alias to the destination:

```yaml
schema_version: 3.27.0

metadata:
  namespace: com.example
  name: xtravels_hotels_a2a
  version: 1.0.0
  display_name: XTravels Hotels Agent
  description: Finds and books hotels through a CAP A2A agent.

system_aliases:
  XTravelsHotelsAgent:
    destination: XTRAVELS_HOTELS_A2A
```

The function delegates the user's request to the remote agent and retains the A2A context for subsequent messages:

```yaml
parameters:
  - name: contextId
    optional: true
  - name: taskId
    optional: true

action_groups:
  - actions:
      - type: agent-request
        agent_type: remote
        system_alias: XTravelsHotelsAgent
        body: >
          <? (contextId == null || contextId.isEmpty()) && (taskId == null || taskId.isEmpty())
             ? null
             : '{ "contextId": "' + contextId + '", "taskId": "' + taskId + '" }' ?>
        result_variable: result

result:
  contextId: "<? result.body.contextId ?>"
  taskId: "<? result.body.id ?>"
```

Declare `contextId` and `taskId` in `capability_context.yaml` and map them between the scenario and function. The scenario description should state clearly when Joule should select the agent.

## Create the Destination

The destination uses OAuth client credentials with mutual TLS to obtain an IAS access token. In the BTP cockpit, create an HTTP destination with these properties:

| Property | Value |
| --- | --- |
| Name | `XTRAVELS_HOTELS_A2A` |
| Type | `HTTP` |
| URL | The A2A endpoint from the agent card, for example `https://<app-route>/a2a/hotels` |
| Proxy Type | `Internet` |
| Authentication | `OAuth2ClientCredentials` |
| Client ID | `clientid` from the IAS X.509 binding |
| Use mTLS for token retrieval | Enabled |
| Token Service URL | `<ias-url>/oauth2/token` |
| Token Service URL Type | `Dedicated` |
| Use default client trust store | Enabled |

Convert the certificate and private key from the IAS binding into a PKCS#12 key store:

```sh
openssl pkcs12 -export \
  -in certificate.pem \
  -inkey key.pem \
  -out ias-client.p12 \
  -name ias-client
```

Upload the key store as the **Token Service Key Store** and enter its password. Delete the temporary PEM and PKCS#12 files after the upload. Never commit certificates, private keys, service secrets, tokens, or one-time passcodes.

The cockpit's **Check Connection** can issue an unauthenticated request and therefore doesn't prove that token retrieval and the A2A call work. Complete the end-to-end verification in Joule.

## Add the Systems to a Formation

In **System Landscape** in the BTP cockpit, open or create a formation of type **Integrate with Joule Development**. Add the following systems:

- The subaccount that contains the destination
- The Joule development tenant
- The SAP Cloud Identity Services tenant that protects the CAP application

The formation must reach the **Ready** state. If the IAS tenant isn't offered in the formation wizard, register it as an SAP Cloud Identity Services system first. This system type is provider-managed and can't be replaced with a generic system entry. Ask the global account or IAS administrator to complete the tenant registration if it isn't available.

## Compile and Deploy

Log in with the Joule Studio CLI. When your environment uses a one-time SSO passcode, request a fresh passcode for each login attempt and don't store it.

Compile from the capability directory, where `capability.sapdas.yaml` is located:

```sh
cd joule-integration/hotels-agent
joule compile
```

Deploy from the parent directory, where `da.sapdas.yaml` is located:

```sh
cd ..
joule deploy -c -n xtravels_hotels_a2a
joule list
```

The `-c` option compiles the local capabilities before deployment. A successful deployment appears in `joule list`.

> [!tip] `da.sapdas.yaml` not found
> If `joule deploy -c` reports `DEPLOY_INVALID_SOURCE`, run it from the digital assistant project root, not from the capability directory.

## Launch and Verify

Launch the deployed assistant:

```sh
joule launch xtravels_hotels_a2a
```

Send a request that matches the scenario description, for example:

```text
Find hotels in Berlin for two adults from October 20 to October 22.
```

The response insights should show that Joule selected the capability and invoked the remote agent. A successful response from the CAP agent confirms all of the following:

- The capability is deployed and discoverable.
- The destination can obtain an IAS token with its X.509 certificate.
- Joule can call the A2A JSON-RPC endpoint.
- The CAP agent can process the request and return its result.

## Troubleshooting

| Symptom | Cause and resolution |
| --- | --- |
| `COMPILE_TRIGGER_FAILED` with HTTP `403` | The logged-in user lacks a compiler role accepted by the target Joule application. Assign `capability_developer`, `capability_release_admin`, or the matching `extensibility_developer` role for that application. |
| `DEPLOY_INVALID_SOURCE` for `da.sapdas.yaml` | Run `joule deploy` from the digital assistant project root. |
| `AgentConnector - 0105` with HTTP `400` and a `POST` to the agent-card URL returning `404` | Change the destination URL to the A2A endpoint advertised in the card's `url` property. |
| The protected card works with a direct IAS token, but Joule can't invoke the agent | Check the destination's client ID, key store, key store password, token service URL, and mTLS setting. Then verify formation membership. |
| The IAS tenant isn't available in the formation wizard | Register the IAS tenant as an SAP Cloud Identity Services system or ask the responsible administrator to do so. |

Use Cloud Foundry application logs and Joule response insights together when diagnosing an invocation. The router log reveals the exact HTTP method, path, and status while response insights confirm whether Joule selected the intended capability.

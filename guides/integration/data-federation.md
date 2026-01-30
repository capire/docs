# CAP-level Data Federation

CAP applications can integrate and federate data from multiple external data sources, enabling seamless access and manipulation of distributed data. This guide provides an overview of the core concepts and techniques for implementing data federation in CAP applications, including service-level replication, HANA virtual tables, synonyms, and data products.
{.abstract}


## Introduction & Motivation

Displaying external data in lists commonly requires fast access to that data. Relying on live calls to remote services per row is clearly not an option, as that would lead to poor performance, excessive load on server, and a nightmare regarding resilience. Instead, we somehow need to ensure that all required data is available locally, so that it can be accessed fast and reliably by UIs, using good old SQL JOINs.

For example, we saw the need for that already in the [CAP-level Service Integration](calesi.md#integration-logic-required) guide, where the `Customer` field in the travel requests list is populated from the remote S/4 Business Partner service, but missing when running the services separately:

1. First run these commands **in two separate terminals**:

    ```shell
    cds mock apis/capire/s4.cds
    ```
    ```shell
    cds mock apis/capire/xflights.cds
    ```

2. Start the xtravels server as usual **in a third terminal**, and note that it now _connects_ to the other services instead of mocking them:

    ```shell
    cds watch
    ```
    ```zsh
    [cds] - connect to S4BusinessPartnerService > odata { 
      url: 'http://localhost:54476/odata/v4/s4-business-partner' 
    }
    ```
    ```zsh
    [cds] - connect to sap.capire.flights.data > hcql { 
      url: 'http://localhost:54475/hcql/data' 
    }
    ```

2. Open the Fiori UI in the browser again -> data from the S/4 service is missing now, as we have not yet implemented the required custom code for the actual data integration, the same applies to the flight data from _xflights_:

![XTravels Fiori list view showing a table of travel requests, with the Customer column empty.](assets/xtravels-list-.png)

![XTravels Fiori details view showing a travel requests, with the flights data missing](assets/xtravels-bookings-.png)

In addition, when we again look into the log output, we see some bulk requests like shown below, which indicates that the Fiori client is desparately trying to fetch the missing customer data. If we'd scroll the list in the UI this would repeat like crazy.

<span style="font-size:63%">

```js
[odata] - POST /odata/v4/travel/$batch
[odata] - > GET /Travels(ID=4133,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4132,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4131,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4130,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4129,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4128,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4127,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4126,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4125,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4124,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4123,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4122,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4121,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4120,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4119,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4118,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4117,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4116,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4115,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4114,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4113,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4112,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4111,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4110,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4109,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4108,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4107,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4106,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4105,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
[odata] - > GET /Travels(ID=4104,IsActiveEntity=true) { '$select': 'Customer', '$expand': 'Customer($select=ID,Name)' }
```
</span>


## Get The XTravels Sample

In the [`@capire/xtravels`](https://github.com/capire/xtravels) app we accomplished that with a simple, yet quite effective data replication solution, which automatically replicates data as documented below. 

Clone the project from GitHub and open it in VS Code to follow along:

```shell
git clone https://github.com/capire/xtravels.git cap/samples/xtravels
code cap/samples/xtravels
```


## Federated Consumption Views

Tag [consumption views](calesi#consumption-views) with the `@federated` annotation, to express your intent to have that data federated, i.e. in close access locally. For example, we did so in out consumption view for S/4 Business Partners:

::: code-group
```cds :line-numbers=4 [apis/capire/s4.cds]
@federated entity Customers as projection on S4.A_BusinessPartner { ... }
```
:::

> [!tip] Stay Intentional -> <i>What, not how!</i> -> Minimal Assumptions
> 
> By tagging entities with `@federated` we stay _intentional_ about **_what_** we want to achieve, and avoid any premature assumptions about **_how_** things are actually implemented. => This allows CAP runtimes – or your own _generic_ solutions, as in this case – to choose the best possible implementation strategies for the given environment and use case, which may differ between development, testing, and production environments, or might need to evolve over time.


## Generic Implementation

Here's the complete code, as found in [`srv/data-federation.js`](https://github.com/capire/xtravels/blob/main/srv/data-federation.js):

::: code-group
```js:line-numbers [srv/data-federation.js]
const PROD = process.env.NODE_ENV === 'production' /* eslint-disable no-console */
const cds = require ('@sap/cds')
const feed = []

// Collect all entities to be federated, and prepare replica tables
PROD || cds.on ('loaded', csn => {
  for (let e of cds.linked(csn).entities) {
    if (e['@federated']) {
      let srv = remote_srv4(e)
      if (is_remote(srv)) {
        e['@cds.persistence.table'] = true //> turn into table for replicas
        feed.push ({ entity: e.name, remote: srv })
      }
    }
  }
})
  
// Setup and schedule replications for all collected entities
PROD || cds.once ('served', () => Promise.all (feed.map (async each => {
  const srv = await cds.connect.to (each.remote)
  srv._once ??=! srv.on ('replicate', replicate)
  await srv.schedule ('replicate', each) .every ('3 seconds')
})))

// Event handler for replicating single entities
async function replicate (req) { 
  let { entity } = req.data, remote = this
  let { latest } = await SELECT.one `max(modifiedAt) as latest` .from (entity)
  let rows = await remote.run (
    SELECT.from (entity) .where `modifiedAt > ${latest}` 
  )
  if (rows.length) await UPSERT (rows) .into (entity); else return
  console.log ('Replicated', rows.length, 'entries', { for: entity, via: this.kind })
}

// Helpers to identify remote services, and check whether they are connected
const remote_srv4 = entity => entity.__proto__._service?.name
const is_remote = srv => cds.requires[srv]?.credentials?.url
```
:::

Let's have a closer look at this code, which handles these main tasks:

1. **Prepare Persistence** – When the model is `loaded`, before it's deployed to the database, we collect all to be `@federated` entities, check whether their respective services are remote, and if so, turn them into tables for local replicas (line 11).

2. **Setup Replication** – Later when all services are `served`, we connect to each remote one (line 20), register a handler for replication (line 21), and schedule it to be invoked every three seconds (line 22).

3. **Replicate Data** – Finally, the `replicate` handler implements a simple polling-based data federation strategy, based on `modifiedAt` timestamps (lines 28-32), with the actual call to remote happening on line 29. 

> [!tip] CAP-level Querying -> agnostic to databases & protocols
> We work with **database-agnostic** and **protocol-agnostic** [CQL queries](../../cds/cql) both for interacting with the local database as well as for querying remote services. In effect, we got a fully generic solution for replication, i.e., it works for **_any_** remote service that supports OData, or HCQL.


## Test Drive Locally

Let's see the outcome in action: to activate the above data federation code, edit `srv/server.js` file and uncomment the single line of code in there like this:

::: code-group
```js :line-numbers [srv/server.js]
process.env.NODE_ENV || require ('./data-federation')
```
:::

Restart the Xtravels app, and see these lines in the log output:

```zsh
Replicated 49 entries { for: 'sap.capire.xflights.Supplements', via: 'hcql' }
Replicated 44 entries { for: 'sap.capire.xflights.Flights', via: 'hcql' }
Replicated 727 entries { for: 'sap.capire.s4.Customers', via: 'odata' }
```

The S/4 Business Partner service in terminal 1 shows the incoming OData request(s):

```zsh
[odata] - GET /odata/v4/s4-business-partner/A_BusinessPartner {
  '$select': 'BusinessPartner,PersonFullName,LastChangeDate',
  '$filter': 'LastChangeDate gt 2024-12-31'
}
```

While the xflights service in terminal 2 shows its incoming HCQL requests like that:

```zsh
[hcql] - GET /hcql/data/ {
  SELECT: {
    from: { ref: [ 'sap.capire.flights.data.Flights' ] },
    columns: [
      { ref: [ 'ID' ], as: 'ID' },
      { ref: [ 'date' ], as: 'date' },
      { ref: [ 'departure' ], as: 'departure' },
      { ref: [ 'arrival' ], as: 'arrival' },
      { ref: [ 'free_seats' ], as: 'free_seats' },
      { ref: [ 'modifiedAt' ], as: 'modifiedAt' },
      { ref: [ 'airline', 'icon' ], as: 'icon' },
      { ref: [ 'airline', 'name' ], as: 'airline' },
      { ref: [ 'origin', 'name' ], as: 'origin' },
      { ref: [ 'destination', 'name' ], as: 'destination' }
    ],
    where: [
      { ref: [ 'modifiedAt' ] },
      '>',
      { val: '2026-01-28T17:38:28.929Z' }
    ]
  }
}
```

Finally, open the Fiori UI in the browser again, and see that customer data from S/4 as well as flight data from xflights is now displayed properly, thanks to the data federation implemented above.

![XTravels Fiori list view showing tarvel requests, now with customer names again.](assets/xtravels-list.png)

![XTravels Fiori details view showing a travel requests, now with flight data again.](assets/xtravels-bookings.png)


<!--
## Service-level Replication 
### Initial Loads 
### Delta Loads 
### On-Demand Replication 
### Event-driven Updates 
## HANA Virtual Tables 
## HANA Synonyms 
## HANA Data Products 
-->

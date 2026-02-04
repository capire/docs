---
synopsis: >
  Learn how to use uniform APIs to consume local or remote services.
impl-variants: true
---




# Consuming Services

If you want to use data from other services or you want to split your application into multiple microservices, you need a connection between those services. We call them **remote services**. As everything in CAP is a service, remote services are modeled the same way as internal services — using CDS.

[[toc]]



## Local Mocking

When developing your application, you can mock the remote service.

### Add Mock Data

As for any other CAP service, you can add mocking data.

The CSV file needs to be added to the _srv/external/data_ folder. {.node}

The CSV file needs to be added to the _db/data_ folder.

::: code-group
```csv [API_BUSINESS_PARTNER-A_BusinessPartner.csv]
BusinessPartner,BusinessPartnerFullName,BusinessPartnerIsBlocked
1004155,Williams Electric Drives,false
1004161,Smith Batteries Ltd,false
1004100,Johnson Automotive Supplies,true
```
:::

For Java, make sure to add the `--with-mocks` option to the `cds deploy` command used to generate the `schema.sql` in `srv/pom.xml`. This ensures that tables for the mocked remote entities are created in the database.{.java}

[Find this source in the end-to-end tutorial](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui-java/srv/external/data/API_BUSINESS_PARTNER-A_BusinessPartner.csv){.learn-more}


### Run Local with Mocks

Start your project with the imported service definition.

<div class="impl node">

```sh
cds watch
```

The service is automatically mocked, as you can see in the log output on server start.

```log
...

[cds] - model loaded from 8 file(s):

  ...
  ./srv/external/API_BUSINESS_PARTNER.cds
  ...

[cds] - connect using bindings from: { registry: '~/.cds-services.json' }
[cds] - connect to db > sqlite { database: ':memory:' }
 > filling sap.ui.riskmanagement.Mitigations from ./db/data/sap.ui.riskmanagement-Mitigations.csv
 > filling sap.ui.riskmanagement.Risks from ./db/data/sap.ui.riskmanagement-Risks.csv
 > filling API_BUSINESS_PARTNER.A_BusinessPartner from ./srv/external/data/API_BUSINESS_PARTNER-A_BusinessPartner.csv
/> successfully deployed to sqlite in-memory db

[cds] - serving RiskService { at: '/service/risk', impl: './srv/risk-service.js' }
[cds] - mocking API_BUSINESS_PARTNER { at: '/api-business-partner' }  // [!code focus] [!code highlight]

[cds] - launched in: 1.104s
[cds] - server listening on { url: 'http://localhost:4004' }
[ terminate with ^C ]
```

[If you want to run with a mock server in the cloud, try the BTP Developer's Guide.](https://github.com/SAP-samples/btp-developer-guide-cap/blob/main/documentation/remote-service/remote-service-mock-cf.md){.learn-more}

</div>

<div class="impl java">

```sh
mvn spring-boot:run
```

</div>

### Mock Associations

You can't get data from associations of a mocked service out of the box.

The associations of imported services lack information how to look up the associated records. This missing relation is expressed with an empty key definition at the end of the association declaration in the CDS model (`{ }`).

::: code-group
```cds{9} [srv/external/API_BUSINESS_PARTNER.cds]
entity API_BUSINESS_PARTNER.A_BusinessPartner {
  key BusinessPartner : LargeString;
  BusinessPartnerFullName : LargeString;
  BusinessPartnerType : LargeString;

  ...

  to_BusinessPartnerAddress :
    Association to many API_BUSINESS_PARTNER.A_BusinessPartnerAddress {  };  // [!code focus]
};

entity API_BUSINESS_PARTNER.A_BusinessPartnerAddress {
  key BusinessPartner : String(10);
  key AddressID : String(10);

  ...
};
```
:::

To mock an association, you have to modify the imported file. Before doing any modifications, create a local copy and add it to your source code management system.

<!-- TODO: Ellipsis not ideal here, not copiable -->
```sh
cp srv/external/API_BUSINESS_PARTNER.cds srv/external/API_BUSINESS_PARTNER-orig.cds
git add srv/external/API_BUSINESS_PARTNER-orig.cds
...
```

Import the CDS file again, just using a different name:

```sh
cds import ~/Downloads/API_BUSINESS_PARTNER.edmx --keep-namespace \
    --as cds --out srv/external/API_BUSINESS_PARTNER-new.cds
```

Add an `on` condition to express the relation:

::: code-group
```cds [srv/external/API_BUSINESS_PARTNER-new.cds]
entity API_BUSINESS_PARTNER.A_BusinessPartner {
  // ...
  to_BusinessPartnerAddress :
      Association to many API_BUSINESS_PARTNER.A_BusinessPartnerAddress
      on to_BusinessPartnerAddress.BusinessPartner = BusinessPartner;
};
```
:::

Don't add any keys or remove empty keys, which would change it to a managed association. Added fields aren't known in the service and lead to runtime errors.


Use a 3-way merge tool to take over your modifications, check it and overwrite the previous unmodified file with the newly imported file:

```sh
git merge-file API_BUSINESS_PARTNER.cds \
               API_BUSINESS_PARTNER-orig.cds \
               API_BUSINESS_PARTNER-new.cds
mv API_BUSINESS_PARTNER-new.cds API_BUSINESS_PARTNER-orig.cds
```

To prevent accidental loss of modifications, the `cds import --as cds` command refuses to overwrite modified files based on a "checksum" that is included in the file.

### Mock Remote Service as OData Service (Node.js)

As shown previously you can run one process including a mocked external service. However, this mock doesn't behave like a real external service. The communication happens in-process and doesn't use HTTP or OData. For a more realistic testing, let the mocked service run in a separate process.

Start the CAP application with the mocked remote service only:

```sh
cds mock API_BUSINESS_PARTNER
```

If the startup is completed, run `cds watch` in the same project from a **different** terminal:

```sh
cds watch
```

CAP tracks locally running services. The mocked service `API_BUSINESS_PARTNER` is registered in file _~/.cds-services.json_. `cds watch` searches for running services in that file and connects to them.

Node.js only supports *OData V4* protocol and so does the mocked service. There might still be some differences to the real remote service if it uses a different protocol, but it's much closer to it than using only one instance. In the console output, you can also easily see how the communication between the two processes happens.

### Mock Remote Service as OData Service (Java)

You configure CAP to do OData and HTTP requests for a mocked service instead of doing it in-process. Configure a new Spring Boot profile (for example `mocked`):
::: code-group
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: mocked
cds:
  application.services:
  - name: API_BUSINESS_PARTNER-mocked
    model: API_BUSINESS_PARTNER
    serve.path: API_BUSINESS_PARTNER
  remote.services:
    API_BUSINESS_PARTNER:
      destination:
        name: "s4-business-partner-api-mocked"
```
:::
The profile exposes the mocked service as OData service and defines a destination to access the service. The destination just points to the CAP application itself. You need to implement some Java code for this:

::: code-group
```java [DestinationConfiguration.java]
@EventListener
void applicationReady(ApplicationReadyEvent ready) {
  int port = Integer.valueOf(environment.getProperty("local.server.port"));
  DefaultHttpDestination mockDestination = DefaultHttpDestination
      .builder("http://localhost:" + port)
      .name("s4-business-partner-api-mocked").build();

  DefaultDestinationLoader loader = new DefaultDestinationLoader();
  loader.registerDestination(mockDestination);
  DestinationAccessor.prependDestinationLoader(loader);
}
```
:::

Now, you just need to run the application with the new profile:

```sh
mvn spring-boot:run -Dspring-boot.run.profiles=default,mocked
```

When sending a request to your CAP application, for example the `Suppliers` entity, it is transformed to the request for the mocked remote service and requested from itself as a OData request. Therefore, you'll see two HTTP requests in your CAP application's log.

For example:

[http://localhost:8080/service/risk/Suppliers](http://localhost:8080/service/risk/Suppliers)

```log
2021-09-21 15:18:44.870 DEBUG 34645 — [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : GET "/service/risk/Suppliers", parameters={}
...
2021-09-21 15:18:45.292 DEBUG 34645 — [nio-8080-exec-2] o.s.web.servlet.DispatcherServlet        : GET "/API_BUSINESS_PARTNER/A_BusinessPartner?$select=BusinessPartner,BusinessPartnerFullName,BusinessPartnerIsBlocked&$top=1000&$skip=0&$orderby=BusinessPartner%20asc&sap-language=de&sap-valid-at=2021-09-21T13:18:45.211722Z", parameters={masked}
...
2021-09-21 15:18:45.474 DEBUG 34645 — [nio-8080-exec-2] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
2021-09-21 15:18:45.519 DEBUG 34645 — [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Completed 200 OK
```

[Try out the example application.](https://github.com/SAP-samples/cloud-cap-risk-management/tree/ext-service-s4hc-suppliers-ui-java){.learn-more}

## Execute Queries

You can send requests to remote services using CAP's powerful querying API.

### Execute Queries with Node.js

Connect to the service before sending a request, as usual in CAP:

```js
const bupa = await cds.connect.to('API_BUSINESS_PARTNER');
```

Then execute your queries using the [Querying API](../../node.js/core-services#srv-run-query):

```js
const { A_BusinessPartner } = bupa.entities;
const result = await bupa.run(SELECT(A_BusinessPartner).limit(100));
```

We recommend limiting the result set and avoid the download of large data sets in a single request. You can `limit` the result as in the example: `.limit(100)`.

Many features of the querying API are supported for OData services. For example, you can resolve associations like this:

```js
const { A_BusinessPartner } = bupa.entities;
const result = await bupa.run(SELECT.from(A_BusinessPartner, bp => {
    bp('BusinessPartner'),
    bp.to_BusinessPartnerAddress(addresses => {
      addresses('*')
    })
  }).limit(100));
```

[Learn more about querying API examples.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui/test/odata-examples.js){.learn-more}


### Execute Queries with Java

You can use dependency injection to get access to the remote service:

```java
@Autowired
@Qualifier(ApiBusinessPartner_.CDS_NAME)
CqnService bupa;
```

Then execute your queries using the [Querying API](../../java/working-with-cql/query-execution):

```java
CqnSelect select = Select.from(ABusinessPartner_.class).limit(100);
List<ABusinessPartner> businessPartner = bupa.run(select).listOf(ABusinessPartner.class);
```

[Learn more about querying API examples.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui/test/odata-examples.js){.learn-more}


### Model Projections

External service definitions, like [generated CDS or CSN files during import](#import-external-apis), can be used as any other CDS definition, but they **don't** generate database tables and views unless they are mocked.

It's best practice to use your own "interface" to the external service and define the relevant fields in a projection in your namespace. Your implementation is then independent of the remote service implementation and you request only the information that you require.

```cds
using {  API_BUSINESS_PARTNER as bupa } from '../srv/external/API_BUSINESS_PARTNER';

entity Suppliers as projection on bupa.A_BusinessPartner {
  key BusinessPartner as ID,
  BusinessPartnerFullName as fullName,
  BusinessPartnerIsBlocked as isBlocked,
}
```

As the example shows, you can use field aliases as well.


### Execute Queries on Projections to a Remote Service

Connect to the service before sending a request, as usual in CAP:

```js
const bupa = await cds.connect.to('API_BUSINESS_PARTNER');
```

Then execute your queries:

```js
const suppliers = await bupa.run(SELECT(Suppliers).where({ID}));
```

CAP resolves projections and does the required mapping, similar to databases.

A brief explanation, based on the previous query, what CAP does:
+ Resolves the `Suppliers` projection to the external service interface `API_BUSINESS_PARTNER.A_Business_Partner`.
+ The **where** condition for field `ID` will be mapped to the `BusinessPartner` field of `A_BusinessPartner`.
+ The result is mapped back to the `Suppliers` projection, so that values for the `BusinessPartner` field are mapped back to `ID`.

This makes it convenient to work with external services.

### Building Custom Requests with Node.js

If you can't use the querying API, you can craft your own HTTP requests using `send`:

<!-- TODO: What is 'A_BusinessPartner' here? -->
```js
bupa.send({
  method: 'PATCH',
  path: A_BusinessPartner,
  data: {
    BusinessPartner: 1004155,
    BusinessPartnerIsBlocked: true
  }
})
```

[Learn more about the `send` API.](../../node.js/core-services#srv-send-request){.learn-more}

### Building Custom Requests with Java

For Java, you can use the `HttpClient` API to implement your custom requests. The API is enhanced by the SAP Cloud SDK to support destinations.

[Learn more about using the HttpClient Accessor.](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/http-client){.learn-more}

[Learn more about using destinations.](#use-destinations-with-java){.learn-more}

## Integrate and Extend

By creating projections on remote service entities and using associations, you can create services that combine data from your local service and remote services.

What you need to do depends on the scenarios and how your remote services should be integrated into, as well as extended by your local services.

### Expose Remote Services

To expose a remote service entity, you add a projection on it to your CAP service:

```cds
using {  API_BUSINESS_PARTNER as bupa } from '../srv/external/API_BUSINESS_PARTNER';

extend service RiskService with {
  entity BusinessPartners as projection on bupa.A_BusinessPartner;
}
```

CAP automatically tries to delegate queries to database entities, which don't exist as you're pointing to an external service. That behavior would produce an error like this:

```xml
<error xmlns="https://docs.oasis-open.org/odata/ns/metadata">
<code>500</code>
<message>SQLITE_ERROR: no such table: RiskService_BusinessPartners in: SELECT BusinessPartner, Customer, Supplier, AcademicTitle, AuthorizationGroup, BusinessPartnerCategory, BusinessPartnerFullName, BusinessPartnerGrouping, BusinessPartnerName, BusinessPartnerUUID, CorrespondenceLanguage, CreatedByUser, CreationDate, (...)  FROM RiskService_BusinessPartner ALIAS_1 ORDER BY BusinessPartner COLLATE NOCASE ASC LIMIT 11</message>
</error>
```

To avoid this error, you need to handle projections. Write a handler function to delegate a query to the remote service and run the incoming query on the external service.

::: code-group
```js [Node.js]
module.exports = cds.service.impl(async function() {
  const bupa = await cds.connect.to('API_BUSINESS_PARTNER');

  this.on('READ', 'BusinessPartners', req => {
      return bupa.run(req.query);
  });
});
```

```java [Java]
@Component
@ServiceName(RiskService_.CDS_NAME)
public class RiskServiceHandler implements EventHandler {
  @Autowired
  @Qualifier(ApiBusinessPartner_.CDS_NAME)
  CqnService bupa;

  @On(entity = BusinessPartners.CDS_NAME)
  Result readSuppliers(CdsReadEventContext context) {
    return bupa.run(context.getCqn());
  }
}
```

:::

[For Node.js, get more details in the end-to-end tutorial.](https://developers.sap.com/tutorials/btp-app-ext-service-add-consumption.html#0a5ed8cc-d0fa-4a52-bb56-9c864cd66e71){.learn-more}


::: warning
If you receive `404` errors, check if the request contains fields that don't exist in the service and start with the name of an association. `cds import` adds an empty keys declaration (`{ }`) to each association. Without this declaration, foreign keys for associations are generated in the runtime model, that don't exist in the real service. To solve this problem, you need to reimport the external service definition using `cds import`.
:::

This works when accessing the entity directly. Additional work is required to support [navigation](#handle-navigations-across-local-and-remote-entities) and [expands](#handle-expands-across-local-and-remote-entities) from or to a remote entity.

Instead of exposing the remote service's entity unchanged, you can [model your own projection](#model-projections). For example, you can define a subset of fields and change their names.

::: tip
CAP does the magic that maps the incoming query, according to your projections, to the remote service and maps back the result.
:::

```cds
using { API_BUSINESS_PARTNER as bupa } from '../srv/external/API_BUSINESS_PARTNER';

extend service RiskService with {
  entity Suppliers as projection on bupa.A_BusinessPartner {
    key BusinessPartner as ID,
    BusinessPartnerFullName as fullName,
    BusinessPartnerIsBlocked as isBlocked
  }
}
```

```js
module.exports = cds.service.impl(async function() {
  const bupa = await cds.connect.to('API_BUSINESS_PARTNER');

  this.on('READ', 'Suppliers', req => {
      return bupa.run(req.query);
  });
});
```

[Learn more about queries on projections to remote services.](#execute-queries-on-projections-to-a-remote-service){.learn-more}

### Expose Remote Services with Associations

It's possible to expose associations of a remote service entity. You can adjust the [projection for the association target](#model-projections) and change the name of the association:

```cds
using { API_BUSINESS_PARTNER as bupa } from '../srv/external/API_BUSINESS_PARTNER';

extend service RiskService with {
  entity Suppliers as projection on bupa.A_BusinessPartner {
    key BusinessPartner as ID,
    BusinessPartnerFullName as fullName,
    BusinessPartnerIsBlocked as isBlocked,
    to_BusinessPartnerAddress as addresses: redirected to SupplierAddresses
  }

  entity SupplierAddresses as projection on bupa.A_BusinessPartnerAddress {
    BusinessPartner as bupaID,
    AddressID as ID,
    CityName as city,
    StreetName as street,
    County as county
  }
}
```

As long as the association is only resolved using expands (for example `.../risk/Suppliers?$expand=addresses`), a handler for the __source entity__ is sufficient:

```js
this.on('READ', 'Suppliers', req => {
    return bupa.run(req.query);
});
```

If you need to resolve the association using navigation or request it independently from the source entity, add a handler for the __target entity__ as well:

```js
this.on('READ', 'SupplierAddresses', req => {
    return bupa.run(req.query);
});
```

As usual, you can put two handlers into one handler matching both entities:

```js
this.on('READ', ['Suppliers', 'SupplierAddresses'], req => {
    return bupa.run(req.query);
});
```

### Mashing up with Remote Services

You can combine local and remote services using associations. These associations need manual handling, because of their different data sources.

#### Integrate Remote into Local Services

Use managed associations from local entities to remote entities:

```cds
@path: 'service/risk'
service RiskService {
  entity Risks : managed {
    key ID      : UUID  @(Core.Computed : true);
    title       : String(100);
    prio        : String(5);
    supplier    : Association to Suppliers;
  }

  entity Suppliers as projection on BusinessPartner.A_BusinessPartner {
    key BusinessPartner as ID,
    BusinessPartnerFullName as fullName,
    BusinessPartnerIsBlocked as isBlocked,
  };
}
```

#### Extend a Remote by a Local Service 

You can augment a projection with a new association, if the required fields for the on condition are present in the remote service. The use of managed associations isn't possible, because this requires to create new fields in the remote service.
<!--Does it matter if it's managed or unmanaged? In other section we say, that you shouldn't make it a managed assoc b/c that would lead to runtime errors. -->

```cds
entity Suppliers as projection on bupa.A_BusinessPartner {
  key BusinessPartner as ID,
  BusinessPartnerFullName as fullName,
  BusinessPartnerIsBlocked as isBlocked,
  risks : Association to many Risks on risks.supplier.ID = ID,
};
```

### Handle Mashups with Remote Services

Depending on how the service is accessed, you need to support direct requests, navigation, or expands. CAP resolves those three request types only for service entities that are served from the database. When crossing the boundary between database and remote sourced entities, you need to take care of those requests.

The list of [required implementations for mashups](#required-implementations-for-mashups) explains the different combinations.

#### Handle Expands Across Local and Remote Entities

Expands add data from associated entities to the response. For example, for a risk, you want to display the suppliers name instead of just the technical ID. But this property is part of the (remote) supplier and not part of the (local) risk.

To handle expands, you need to add a handler for the main entity:
1. Check if a relevant `$expand` column is present.
2. Remove the `$expand` column from the request.
3. Get the data for the request.
4. Execute a new request for the expand.
5. Add the expand data to the returned data from the request.

Example of a CQN request with an expand:

```json
{
  "from": { "ref": [ "RiskService.Suppliers" ] },
  "columns": [
    { "ref": [ "ID" ] },
    { "ref": [ "fullName" ] },
    { "ref": [ "isBlocked" ] },
    { "ref": [ "risks" ] },
    { "expand": [
      { "ref": [ "ID" ] },
      { "ref": [ "title" ] },
      { "ref": [ "descr" ] },
      { "ref": [ "supplier_ID" ] }
    ] }
  ]
}
```

[See an example how to handle expands in Node.js.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui/srv/risk-service.js){.node .learn-more}

[See an example how to handle expands in Java.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui-java/srv/src/main/java/com/sap/cap/riskmanagement/handler/RiskServiceHandler.java){.java .learn-more}


Expands across local and remote can cause stability and performance issues. For a list of items, you need to collect all IDs and send it to the database or the remote system. This can become long and may exceed the limits of a URL string in case of OData. Do you really need expands for a list of items?

```http
GET /service/risk/Risks?$expand=supplier
```

Or is it sufficient for single items?

```http
GET /service/risk/Risks(545A3CF9-84CF-46C8-93DC-E29F0F2BC6BE)/?$expand=supplier
```
::: warning Keep performance in mind
Consider to reject expands if it's requested on a list of items.
:::

#### Handle Navigations Across Local and Remote Entities

Navigations allow to address items via an association from a different entity:

```http
GET /service/risks/Risks(20466922-7d57-4e76-b14c-e53fd97dcb11)/supplier
```

The CQN consists of a `from` condition with 2 values for `ref`. The first `ref` selects the record of the source entity of the navigation. The second `ref` selects the name of the association, to navigate to the target entity.

```json
{
  "from": {
    "ref": [ {
      "id": "RiskService.Risks",
      "where": [
        { "ref": [ "ID" ] },
        "=",
        { "val": "20466922-7d57-4e76-b14c-e53fd97dcb11" }
      ]},
      "supplier"
    ]
  },
  "columns": [
    { "ref": [ "ID" ] },
    { "ref": [ "fullName" ] },
    { "ref": [ "isBlocked" ] }
  ],
  "one": true
}
```

To handle navigations, you need to check in your code if the `from.ref` object contains 2 elements. Be aware, that for navigations the handler of the **target** entity is called.

If the association's on condition equals the key of the source entity, you can directly select the target entity using the key's value. You find the value in the `where` block of the first `from.ref` entry.

Otherwise, you need to select the source item using that `where` block and take the required fields for the associations on condition from that result.

[See an example how to handle navigations in Node.js.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui/srv/risk-service.js){.learn-more .node}

[See an example how to handle navigations in Java.](https://github.com/SAP-samples/cloud-cap-risk-management/blob/ext-service-s4hc-suppliers-ui-java/srv/src/main/java/com/sap/cap/riskmanagement/handler/RiskServiceHandler.java){.learn-more .java}

### Limitations and Feature Matrix
#### Required Implementations for Mashups 

You need additional logic, if remote entities are in the game. The following table shows what is required. "Local" is a database entity or a projection on a database entity.

| **Request**                                                           | **Example**                              | **Implementation**                                                |
| --------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Local (including navigations and expands)                             | `/service/risks/Risks`                   | Handled by CAP                                                    |
| Local: Expand remote                                                  | `/service/risks/Risks?$expand=supplier`  | Delegate query w/o expand to local service and implement expand.  |
| Local: Navigate to remote                                             | `/service/risks(...)/supplier`           | Implement navigation and delegate query target to remote service. |
| Remote (including navigations and expands to the same remote service) | `/service/risks/Suppliers`               | Delegate query to remote service                                  |
| Remote: Expand local                                                  | `/service/risks/Suppliers?$expand=risks` | Delegate query w/o expand to remote service and implement expand. |
| Remote: Navigate to local                                             | `/service/Suppliers(...)/risks`          | Implement navigation, delegate query for target to local service  |


##### Support Analytical Queries in Java

CAP Java provides out-of-the-box support for remote analytical queries.

| **Request**                                                           | **Example**                              | **Implementation**                                                |
| --------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| Remote: Analytical queries                                            | `/service/risks/Suppliers?$apply=...`    | Delegate query to remote service                                  |


#### Transient Access vs. Replication

> This chapter shows only techniques for transient access.

The following matrix can help you to find the best approach for your scenario:

| **Feature**                                           | **Transient Access**  | **Replication**                   |
|-------------------------------------------------------|-----------------------|-----------------------------------|
| Filtering on local **or** remote fields <sup>1</sup>  | Possible              | Possible                          |
| Filtering on local **and** remote fields <sup>2</sup> | Not possible          | Possible                          |
| Relationship: Uni-/Bidirectional associations         | Possible              | Possible                          |
| Relationship: Flatten                                 | Not possible          | Possible                          |
| Evaluate user permissions in remote system            | Possible              | Requires workarounds <sup>3</sup> |
| Data freshness                                        | Live data             | Outdated until replicated         |
| Performance                                           | Degraded <sup>4</sup> | Best                              |

<br>

> <sup>1</sup> It's **not required** to filter both, on local and remote fields, in the same request. <br>
> <sup>2</sup> It's **required** to filter both, on local and remote fields, in the same request. <br>
> <sup>3</sup> Because replicated data is accessed, the user permission checks of the remote system aren't evaluated. <br>
> <sup>4</sup> Depends on the connectivity and performance of the remote system. <br>


## Connect and Deploy


### Using Destinations

Destinations contain the necessary information to connect to a remote system. They're basically an advanced URL, that can carry additional metadata like, for example, the authentication information.

You can choose to use SAP BTP destinations or [application defined destinations](#use-application-defined-destinations).

#### Use SAP BTP Destinations

CAP leverages the destination capabilities of the SAP Cloud SDK.

##### Create Destinations on SAP BTP

Create a destination using one or more of the following options.

- **Register a system in your global account:** You can check here how to [Register an SAP System](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/2ffdaff0f1454acdb046876045321c91.html) in your SAP BTP global account and which systems are supported for registration. Once the system is registered and assigned to your subaccount, you can create a service instance. A destination is automatically created along with the service instance.
<!--  TODO: risk management link -->

- **Connect to an on-premise system:** With SAP BTP [Cloud Connector](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/e6c7616abb5710148cfcf3e75d96d596.html), you can create a connection from your cloud application to an on-premise system.

- **Manually create destinations:** You can create destinations manually in your SAP BTP subaccount. See section [destinations](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/5eba6234a0e143fdacd8535f44c315c5.html) in the SAP BTP documentation.

- **Create a destination to your application:** If you need a destination to your application, for example, to call it from a different application, then you can automatically create it in the MTA deployment.


##### Use Destinations with Node.js

In your _package.json_, a configuration for the `API_BUSINESS_PARTNER` looks like this:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata",
      "model": "srv/external/API_BUSINESS_PARTNER"
    }
  }
}
```

If you've imported the external service definition using `cds import`, an entry for the service in the _package.json_ has been created already. Here you specify the name of the destination in the `credentials` block.

In many cases, you also need to specify the `path` prefix to the service, which is added to the destination's URL. For services listed on the SAP Business Accelerator Hub, you can find the path in the linked service documentation.

Since you don't want to use the destination for local testing, but only for production, you can profile it by wrapping it into a `[production]` block:

```json
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      "kind": "odata",
      "model": "srv/external/API_BUSINESS_PARTNER",
      "[production]": {
        "credentials": {
          "destination": "S4HANA",
          "path": "/sap/opu/odata/sap/API_BUSINESS_PARTNER"
        }
      }
    }
  }
}
```

Additionally, you can provide [destination options](https://sap.github.io/cloud-sdk/api/v4/interfaces/sap-cloud-sdk_connectivity.DestinationFetchOptions.html) inside a `destinationOptions` object:

```jsonc
"cds": {
  "requires": {
    "API_BUSINESS_PARTNER": {
      /* ... */
      "[production]": {
        "credentials": {
          /* ... */
        },
        "destinationOptions": {
          "selectionStrategy": "alwaysSubscriber",
          "useCache": true
        }
      }
    }
  }
}
```

The `selectionStrategy` property controls how a [destination is resolved](#destination-resolution).

The `useCache` option controls whether the SAP Cloud SDK caches the destination. It's enabled by default but can be disabled by explicitly setting it to `false`.
Read [Destination Cache](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destination-cache#destination-cache) to learn more about how the cache works.

If you want to configure additional headers for the HTTP request to the system behind the destination, for example an Application Interface Register (AIR) header, you can specify such headers in the destination definition itself using the property [_URL.headers.\<header-key\>_](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/4e1d742a3d45472d83b411e141729795.html?q=URL.headers).

##### Use Destinations with Java

Destinations are configured in Spring Boot's _application.yaml_ file:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    API_BUSINESS_PARTNER:
      type: "odata-v2"
      destination:
        name: "cpapp-bupa"
      http:
        suffix: "/sap/opu/odata/sap"
```
:::
[Learn more about configuring destinations for Java.](../../java/cqn-services/remote-services){.learn-more}

#### Use Application Defined Destinations 

If you don't want to use SAP BTP destinations, you can also define destinations, which means the URL, authentication type, and additional configuration properties, in your application configuration or code.

Application defined destinations support a subset of properties and authentication types of the SAP BTP destination service.

##### Configure Application Defined Destinations in Node.js

You specify the destination properties in `credentials` instead of putting the name of a destination there.

This is an example of a destination using basic authentication:

```jsonc
"cds": {
  "requires": {
    "REVIEWS": {
      "kind": "odata",
      "model": "srv/external/REVIEWS",
      "[production]": {
        "credentials": {
          "url": "https://reviews.ondemand.com/reviews",
          "authentication": "BasicAuthentication",
          "username": "<set from code or env>",
          "password": "<set from code or env>",
          "headers": {
            "my-header": "header value"
          },
          "queries": {
            "my-url-param": "url param value"
          }
        }
      }
    }
  }
}
```

[Learn more about providing project configuration values.](./../../node.js/cds-env#project-specific-configurations){.learn-more} 

::: warning Warning: You should not put any sensitive information here!

Instead, set the properties in the bootstrap code of your CAP application:

```js
const cds = require("@sap/cds");

if (cds.env.requires?.credentials?.authentication === "BasicAuthentication") {
  const credentials = /* read your credentials */
  cds.env.requires.credentials.username = credentials.username;
  cds.env.requires.credentials.password = credentials.password;
}
```
:::

You might also want to set some values in the application deployment. This can be done using env variables. For this example, the env variable for the URL would be `cds_requires_REVIEWS_credentials_destination_url`.

This variable can be parameterized in the _manifest.yml_ for a `cf push` based deployment:
::: code-group
```yaml [manifest.yml]
applications:
- name: reviews
  ...
  env:
    cds_requires_REVIEWS_credentials_url: ((reviews_url))
```
:::
```sh
cf push --var reviews_url=https://reviews.ondemand.com/reviews
```

The same can be done using _mtaext_ file for MTA deployment.

If the URL of the target service is also part of the MTA deployment, you can automatically receive it as shown in this example:

::: code-group
```yaml [mta.yaml]
 - name: reviews
   provides:
    - name: reviews-api
      properties:
        reviews-url: ${default-url}
 - name: bookshop
   requires:
    ...
    - name: reviews-api
   properties:
     cds_requires_REVIEWS_credentials_url: ~{reviews-api/reviews-url}
```
:::

::: code-group
```properties [.env]
cds_requires_REVIEWS_credentials_url=http://localhost:4008/reviews
```
:::

::: warning
For the _configuration path_, you **must** use the underscore ("`_`") character as delimiter. CAP supports dot ("`.`") as well, but Cloud Foundry won't recognize variables using dots. Your _service name_ **mustn't** contain underscores.
:::

##### Implement Application Defined Destinations in Node.js

There is no API to create a destination in Node.js programmatically. However, you can change the properties of a remote service before connecting to it, as shown in the previous example.

##### Configure Application Defined Destinations in Java 

Destinations are configured in Spring Boot's _application.yaml_ file.

::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    REVIEWS:
      type: "odata-v4"
      destination:
        properties:
          url: https://reviews.ondemand.com/reviews
          authentication: TokenForwarding
      http:
        headers:
          my-header: "header value"
        queries:
          my-url-param: "url param value"
```
:::


##### Implement Application Defined Destinations in Java

You can use the APIs offered by SAP Cloud SDK to create destinations programmatically. The destination can be used by its name the same way as destinations on the SAP BTP destination service.
::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    REVIEWS:
      type: "odata-v2"
      destination:
        name: "reviews-destination"
```
:::
[Learn more about programmatic destination registration.](../../java/cqn-services/remote-services#programmatic-destination-registration){.learn-more} [See examples for different authentication types.](../../java/cqn-services/remote-services){.learn-more}


### Connect to Remote Services Locally

If you use SAP BTP destinations, you can access them locally using [CAP's hybrid testing capabilities](../../tools/cds-bind) with the following procedure:

#### Bind to Remote Destinations

Your local application needs access to an XSUAA and Destination service instance in the same subaccount where the destination is:

1. Login to your Cloud Foundry org and space
2. Create an XSUAA service instance and service key:

    ```sh
    cf create-service xsuaa application cpapp-xsuaa
    cf create-service-key cpapp-xsuaa cpapp-xsuaa-key
    ```

3. Create a Destination service instance and service key:

    ```sh
    cf create-service destination lite cpapp-destination
    cf create-service-key cpapp-destination cpapp-destination-key
    ```

4. Bind to XSUAA and Destination service:

    ```sh
    cds bind -2 cpapp-xsuaa,cpapp-destination
    ```

    [Learn more about `cds bind`.](../../tools/cds-bind#services-on-cloud-foundry){.learn-more}

#### Run a Node.js Application with a Destination

Add the destination for the remote service to the `hybrid` profile in the _.cdsrc-private.json_ file:

```jsonc
{
  "requires": {
    "[hybrid]": {
      "auth": {
        /* ... */
      },
      "destinations": {
        /* ... */
      },
      "API_BUSINESS_PARTNER": {
        "credentials": {
          "path": "/sap/opu/odata/sap/API_BUSINESS_PARTNER",
          "destination": "cpapp-bupa"
        }
      }
    }
  }
}
```

Run your application with the Destination service:

```sh
cds watch --profile hybrid
```

::: tip
If you are developing in the Business Application Studio and want to connect to an on-premise system, you will need to do so via Business Application Studio's built-in proxy, for which you need to add configuration in an `.env` file. See [Connecting to External Systems From the Business Application Studio](https://sap.github.io/cloud-sdk/docs/js/guides/bas) for more details.
:::

#### Run a Java Application with a Destination 

Add a new profile `hybrid` to your _application.yaml_ file that configures the destination for the remote service.
::: code-group
```yaml [srv/src/main/resources/application.yaml]
spring:
  config.activate.on-profile: hybrid
  sql.init.schema-locations:
  - "classpath:schema-nomocks.sql"
cds:
  remote.services:
  - name: API_BUSINESS_PARTNER
    type: "odata-v2"
    destination:
      name: "cpapp-bupa"
    http:
      suffix: "/sap/opu/odata/sap"
```
:::
Run your application with the Destination service:

```sh
cds bind --exec -- mvn spring-boot:run \
  -Dspring-boot.run.profiles=default,hybrid
```

[Learn more about `cds bind --exec`.](../../tools/cds-bind#run-arbitrary-commands-with-service-bindings){.learn-more}

::: tip
If you are developing in the Business Application Studio and want to connect to an on-premise system, you will need to do so via Business Application Studio's built-in proxy, for which you need to add configuration to your destination environment variable. See [Reach On-Premise Service from the SAP Business Application Studio](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/destination-service#reach-on-premise-service-from-the-sap-business-application-studio) for more details.
:::


### Connect to an Application Using the Same XSUAA (Forward Authorization Token)
###### Forward Auth Token

If your application consists of microservices and you use one (or more) as a remote service as described in this guide, you can leverage the same XSUAA instance. In that case, you don't need an SAP BTP destination at all.

Assuming that your microservices use the same XSUAA instance, you can just forward the authorization token. The URL of the remote service can be injected into the application in the [MTA or Cloud Foundry deployment](#deployment) using [application defined destinations](#use-application-defined-destinations).

#### Forward Authorization Token with Node.js

To enable the token forwarding, set the `forwardAuthToken` option to `true` in your application defined destination:

```json
{
  "requires": {
    "kind": "odata",
    "model": "./srv/external/OrdersService",
    "credentials": {
      "url": "<set via env var in deployment>",
      "forwardAuthToken": true
    }
  }
}
```

#### Forward Authorization Token with Java{.java}

For Java, you set the authentication type to `TOKEN_FORWARDING` for the destination.

You can implement it in your code:

```java
urlFromConfig = ...; // read from config
DefaultHttpDestination mockDestination = DefaultHttpDestination
    .builder(urlFromConfig)
    .name("order-service")
    .authenticationType(AuthenticationType.TOKEN_FORWARDING)
    .build();
```

Or declare the destination in your _application.yaml_ file:
::: code-group
```yaml [srv/src/main/resources/application.yaml]
cds:
  remote.services:
    order-service:
      type: "odata-v4"
      destination:
        properties:
          url: "<set via env var in deployment>"
          authentication: TokenForwarding
```
:::
Alternatively to setting the authentication type, you can set the property `forwardAuthToken` to `true`.

### Connect to an Application in Your Kyma Cluster

The [Istio](https://istio.io) service mesh provides secure communication between the services in your service mesh. You can access a service in your applications' namespace by just reaching out to `http://<service-name>` or using the full hostname `http://<service-name>.<namespace>.svc.cluster.local`. Istio sends the requests through an mTLS tunnel.

With Istio, you can further secure the communication [by configuring authentication and authorization for your services](https://istio.io/latest/docs/concepts/security)


### Deployment

Your micro service needs bindings to the **XSUAA** and **Destination** service to access destinations on SAP BTP. If you want to access an on-premise service using **Cloud Connector**, then you need a binding to the **Connectivity** service as well.

[Learn more about deploying CAP applications.](../deploy/index){.learn-more}
[Learn more about deploying an application using the end-to-end tutorial.](https://developers.sap.com/group.btp-app-cap-deploy.html){.learn-more}

<!-- #### Add Required Services to Cloud Foundry Manifest Deployment

The deployment with Cloud Foundry manifest is described in [the deployment guide](deployment/to-cf). You can follow this guide and make some additional adjustments to the [generated _services-manifest.yml_ and the _services.yml_](deployment/to-cf#add-manifest) files.

Add **XSUAA**, **Destination**, and **Connectivity** service to your _services-manifest.yml_ file.

::: code-group
```yaml [services-manifest.yml]
  - name: cpapp-uaa
    broker: xsuaa
    plan: application
    parameters: xs-security.json
    updateService: true

  - name: cpapp-destination
    broker: destination
    plan: lite
    updateService: false

  # Required for on-premise connectivity only
  - name: cpapp-connectivity
    broker: connectivity
    plan: lite
    updateService: false
```
:::

Add the services to your microservice's `services` list in the _manifest.yml_ file:

::: code-group
```yaml [manifest.yml]
- name: cpapp-srv
  services:
  - ...
  - cpapp-uaa
  - cpapp-destination
  - cpapp-connectivity # Required for on-premise connectivity only
```
:::

[Push](deployment/to-cf#push-the-application) the application.

```sh
cf create-service-push  # or `cf cspush` in short from 1.3.2 onwards
``` -->

#### Add Required Services to MTA Deployments

The MTA-based deployment is described in [the deployment guide](../deploy/index). You can follow this guide and make some additional adjustments to the [generated _mta.yml_](../deploy/to-cf#add-mta-yaml) file.


```sh
cds add xsuaa,destination,connectivity
```

::: details Learn what this does in the background...

1. Adds **XSUAA**, **Destination**, and **Connectivity** services to your _mta.yaml_:
    ::: code-group
    ```yaml [mta.yml]
    - name: cpapp-uaa
      type: org.cloudfoundry.managed-service
      parameters:
        service: xsuaa
        service-plan: application
        path: ./xs-security.json
    
    - name: cpapp-destination
      type: org.cloudfoundry.managed-service
      parameters:
        service: destination
        service-plan: lite
    
    # Required for on-premise connectivity only
    - name: cpapp-connectivity
      type: org.cloudfoundry.managed-service
      parameters:
        service: connectivity
        service-plan: lite
    ```
    :::
2. Requires the services for your server in the _mta.yaml_:
    ::: code-group
    ```yaml [mta.yaml]
    - name: cpapp-srv
      ...
      requires:
        ...
        - name: cpapp-uaa
        - name: cpapp-destination
        - name: cpapp-connectivity # Required for on-premise connectivity only
    ```
    :::
    :::

Build your application:

```sh
mbt build -t gen --mtar mta.tar
```

Now you can deploy it to Cloud Foundry:
```sh
cf deploy gen/mta.tar
```

#### Connectivity Service Credentials on Kyma

The secret of the connectivity service on Kyma needs to be modified for the Cloud SDK to connect to on-premise destinations.

[Support for Connectivity Service Secret in Java](https://github.com/SAP/cloud-sdk/issues/657){.java .learn-more}
[Support for Connectivity Service Secret in Node.js](https://github.com/SAP/cloud-sdk-js/issues/2024){.node .learn-more}

### Destinations and Multitenancy

With the destination service, you can access destinations in your provider account, the account your application is running in, and destinations in the subscriber accounts of your multitenant-aware application.

#### Use Destinations from Subscriber Account

Customers want to see business partners from, for example, their SAP S/4 HANA system.

As provider, you need to define a name for a destination, which enables access to systems of the subscriber of your application. In addition, your multitenant application or service needs to have a dependency to the destination service. For destinations in an on-premise system, the connectivity service must be bound.

The subscriber needs to create a destination with that name in their subscriber account, for example, pointing to their SAP S/4HANA system.





#### Destination Resolution

The destination is read from the tenant of the request's JWT (authorization) token. If no JWT token is present, the destination is read from the tenant of the application's XSUAA binding.{.java}

The destination is read from the tenant of the request's JWT (authorization) token. If no JWT token is present *or the destination isn't found*, the destination is read from the tenant of the application's XSUAA binding.{.node}

::: warning JWT token vs. XSUAA binding
Using the tenant of the request's JWT token means reading from the **subscriber subaccount** for a multitenant application. The tenant of the application's XSUAA binding points to the destination of the **provider subaccount**, the account where the application is deployed to.
:::

<div class="impl node">

You can change the destination lookup behavior as follows:

```jsonc
"cds": {
  "requires": {
    "SERVICE_FOR_PROVIDER": {
      /* ... */
      "credentials": {
        /* ... */
      },
      "destinationOptions": {
        "selectionStrategy": "alwaysProvider",
        "jwt": null
      }
    }
  }
}
```


Setting the [`selectionStrategy`](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destination#multi-tenancy) property for the [destination options](#use-destinations-with-node-js) to `alwaysProvider`, you can ensure that the destination is always read from your provider subaccount. With that you ensure that a subscriber cannot overwrite your destination.

Set the destination option `jwt` to `null`, if you don't want to pass the request's JWT to SAP Cloud SDK. Passing the request's JWT to SAP Cloud SDK has implications on, amongst others, the effective defaults for selection strategy and isolation level. In rare cases, these defaults are not suitable, for example when the request to the upstream server does not depend on the current user. Please see [Authentication and JSON Web Token (JWT) Retrieval](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destinations#authentication-and-json-web-token-jwt-retrieval) for more details.

</div>

<div class="impl java">

For Java use the property `retrievalStrategy` in the destination configuration, to ensure that the destination is always read from your provider subaccount:

```yaml
cds:
  remote.services:
    service-for-provider:
      type: "odata-v4"
      destination:
        retrievalStrategy: "AlwaysProvider"

```

Read more in the full reference of all [supported retrieval strategy values](https://sap.github.io/cloud-sdk/docs/java/features/connectivity/sdk-connectivity-destination-service#retrieval-strategy-options). Please note that the value must be provided in pascal case, for example: `AlwaysProvider`.


</div>

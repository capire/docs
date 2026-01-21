
# CAP-Level Service Integration
The *'Calesi'* Pattern {.subtitle}

Integrating remote services – from other applications, third-party services, or platform services – is a fundamental aspect of cloud application development. CAP provides an easy and platform-agnostic way to do so: Remote services are represented as CAP services, which can be consumed _as if they were local_, while the CAP runtimes manage the communication and resilience details under the hood. Not the least, remote services can be mocked automatically for local inner-loop development and testing.
{.abstract}


[toc]:./
[[toc]]



## Remote Service Consumption 

Service integration is essentially about consuming remote services from other applications, which can be third-party services, platform services, or services from other applications within the same enterprise landscape. CAP allows this by representing them as CAP services, which can be used _as if they were local_.

We can see that happening live as follows:
1. Clone the [*@capire/bookshop*](https://github.com/capire/bookshop) sample.
   ```shell
   git clone https://github.com/capire/bookshop
   ```
2. Start the application in watch mode:
   ```shell
   cds watch bookshop
   ```
3. Start a cds repl in another terminal:
   ```shell
   cds repl
   ```
4. Load service bindings from the local binding envorinment:
   ```js
   await cds.service.bindings
   ```
5. Connect to the remote _bookshop_ service from the repl:
   ```js
   let cats = await cds.connect.to ('CatalogService')
   ```
6. Read some data from the remote service:
   ```js
   await cats.read `ID, title` .from `Books`
   ```

## Integration Scenarios

```sh
mkdir -p cap/samples
cd cap/samples
```

```shell
git clone https://github.com/capire/bookstore
git clone https://github.com/capire/bookshop
git clone https://github.com/capire/reviews
git clone https://github.com/capire/orders
```

```shell
git clone https://github.com/capire/xflights
git clone https://github.com/capire/xtravels
```


### The XTravels Sample

The [*@capire/xtravels*](https://github.com/capire/xtravels) sample is about an application which allows travel agents to plan travels on behalf of travellers, including bookings of flights. Travellers are Customers maintained in, and obtained from S/4HANA. *Flights*, *Airports* and *Airline* are master data provided by the [*@capire/xflights*](https://github.com/capire/xflights) microservice. 

![Architecture diagram showing three systems: XFlights on the left containing Flights and Airports entities in light blue, XTravels in the center containing Travels, Bookings, and Supplements entities in darker blue, and S/4HANA on the right containing Customers entity in gray. Arrows connect Bookings to Flights, Travels to Customers, and Bookings to Supplements, illustrating data relationships between the systems in a federated service integration pattern.
](assets/xtravels-sample.drawio.svg)

From a service integration perspective, this sample mainly shows a **data federation** scenario, where data is consumed from different upstream systems (XFlights and S/4HANA) – most frequently in a readonly fashion – to be displayed together with an application's local data. The screenshot below shows a travel request including customer data from S/4HANA (highlighted in green) and flight data from XFlights (highlighted in blue).

![XTravels application interface showing a travel request form. The interface displays customer information including name, email, and address fields highlighted in green, sourced from S/4HANA. Below that, a flight booking section shows departure and arrival airports, dates, and times highlighted in blue, sourced from the XFlights service. The layout demonstrates data federation from multiple backend systems presented in a unified user interface.
](assets/xtravels-screenshot.png)

### The Bookstore Sample

The [*@capire/bookstore*](https://github.com/capire/bookstore) sample composes independent microservices into a composite application as follows:

- [*@capire/bookstore*](https://github.com/capire/bookstore) – a composite application which composes:
- [*@capire/bookshop*](https://github.com/capire/bookshop) – a standalone bookshop application
- [*@capire/reviews*](https://github.com/capire/reviews) – a reuse service to manage user reviews
- [*@capire/orders*](https://github.com/capire/orders) – a reuse service to manage orders 

![Diagram showing the bookstore application architecture with four hexagonal service components: a dark blue bookstore service at the top center, and three light blue services below it - bookshop at bottom center, orders at bottom right, and reviews at bottom left, representing a microservices composition pattern.
](assets/bookstore-sample.drawio.svg)

> [!note] Independent Microservices
> Each of the microservices are developed independently, and can be reused and composed in any applications. 
> Bookshop, Reviews and Orders services are all standalone CAP applications on their own, that know nothing about each other, with independent lifecycles. Only the Bookstore application composes them into a larger whole.

The illustration below zooms in to the flow of events and requests between the individual (micro) services, with the dashed lines representing asynchronous events, and the solid lines representing synchronous requests (read and write). Basically, the bookstore application follows an event-driven choreography pattern, with the following interactions:

- on _Bookshop.submitOrder_ -> _OrdersService.create (Order)_.
- on _OrdersService.Order.Changed_ -> _Bookshop.update (stock)_.
- on _ReviewsService.Ratings.Changed_ -> _Bookstore.update (averageRating)_.

![Diagram illustrating event-driven choreography in the bookstore application. Four hexagonal service components are arranged in a diamond pattern: Bookstore in dark blue at the center, Reviews in light blue at top left, Orders in light blue at top right, and Bookshop in light blue at bottom. Solid arrows indicate synchronous calls: Bookstore calls Read Reviews to Reviews service, Create Order to Orders service, and Update Stock to Bookshop service. Dashed arrows show asynchronous events: Reviews publishes Ratings Changed event to Bookstore, Orders publishes Order Changed event to Bookstore, and Bookshop publishes Submit Order event to Bookstore. This demonstrates a choreographed integration pattern where services communicate through a combination of direct calls and event-driven messaging.
](assets/bookstore-choreography.drawio.svg)


> [!tip] Integration Patterns
>
> From the descriptions of the sample scenarios above we can identify these general integration scenarios and patterns:
> * **(Master) Data Integration** scenarios, which frequently involve data replication via initial loads / delta loads, on-demand replication, or event-based replication.
> * **(Enterprise) Application Integration** scenarios, in which we commonly see a mix of (synchronous) calls to remote services, and (asynchronous) reaction on events. 
> * **Reuse & Composition of (Micro) Services** as in the *@capire/bookstore* sample.




## Defining Service APIs

CAP-based service providers define provided APIs in terms of CAP service definitions in CDS, and expose them to clients via protocols served by CAP runtimes out of the box, such as *HCQL*, *OData*, *REST*, or *GraphQL*. All the API features of CAP services can be used, which are: 

- Data-centric CRUDQ operations on deeply structured entity graphs 
- Custom actions and functions specific to the service's domain
- Asynchronous events which consumers can subscribe to

> [!tip] Yet Another CAP Service (YACS)
> In CAP, all interfaces to the outside world are defined as services in CDS. This applies equally to services meant to serve UIs, as well as to services that constitute APIs consumed from remote applications. And vice versa, all remote services we want to consume in CAP applications are to be represented as CAP services – as we'll see in the following chapters. 

Let's look at some samples below...



### Data-Centric Services

(Master) data integration scenarios usually involve data-centric services, with readonly entities, as we find in the XFlights microservice. -> Open the _cap/samples/xflights_ folder in Visual Studio Code, and have a look at the service definition in `srv/data-service.cds` in there, e.g., like that from the command line:

```shell
code xflights -g xflights/srv/data-service.cds
```

::: code-group
```cds :line-numbers [cap/samples/xflights/srv/data-service.cds]
using sap.capire.flights as x from '../db/schema';
@odata @hcql service sap.capire.flights.data {
  @readonly entity Flights as projection on x.Flights { flights.*, * };
  @readonly entity Airlines as projection on x.Airlines;
  @readonly entity Airports as projection on x.Airports;  
}
```
:::

This declares a CAP service named `sap.capire.flights.data`, served over _OData_ and _HCQL_ protocols, which exposes _Flights_, _Airlines_, and _Airports_ as readonly projections on underlying domain model entities, with _Flights_ as a denormalized view.


#### Denormalized Views

Lets have a closer look at the denormalized view for _Flights_, which basically flattens the association to `FlightConnection`. The above projection is a simplified version of the following actual definition found in `srv/data-service.cds`:

```cds :line-numbers [cap/samples/xflights/srv/data-service.cds]
@readonly entity Flights as projection on x.Flights {
  *,                          // all fields from Flights
  flight.{*} excluding {ID},  // all fields from FlightConnection
  key flight.ID,              // with flight ID preserved as key 
  key date,                   // with date preserved as key
} excluding { flight };       // which we flattened above
```

Reason for this more complicated definition is that we need to preserve the primary keys elements  `flight.ID` and `date`, as OData disallows entities without keys.

> [!tip] Use Case-Oriented Services
> Denormalized views are a common means to tailor provided APIs in a use case-oriented way. While normalization is required _within_ _XFlights_ to avoid redundancies, we flatten it here, to make life easier for external consumers. \
> => See also: [_Use Case-Oriented Services_](../../get-started/bookshop#use-case-specific-services) in the getting started guide.


### Feature-Centric Services

Let's have a look at another the reuse service definition from the [_@capire/reviews_](https://github.com/capire/reviews) sample, which is designed as a reuse service, which can be consumed by any application needing review functionality, such as the _bookstore_ sample. 

In contrast to data-centric services, such feature-centric services typically expose less entities, and more specialized custom events and actions.

Open `srv/review-service.cds` in VSCode, e.g., like that from the command line:

```shell
code reviews -g reviews/srv/review-service.cds
```
::: code-group
```cds :line-numbers [cap/samples/reviews/srv/review-service.cds]
using { sap.capire.reviews as my } from '../db/schema';

@odata @rest @hcql service ReviewsService {

  /** The central entity for reviews, add/change reviews */
  entity Reviews as projection on my.Reviews;

  /** Lightweight list of reviews without text and likes */
  @readonly entity ListOfReviews as projection on Reviews 
  excluding { text, likes };

  /** Summary of average ratings per reviewed subject. */
  @readonly entity AverageRatings as projection on Reviews {
    key subject,
    round(avg(rating),2) as rating  : my.Rating,
    count(*)             as reviews : Integer,
  } group by subject;

  /** Event emitted when a subject's average rating has changed. */
  event AverageRatings.Changed : AverageRatings;

  /** Entities and actions for liking and unliking reviews */
  @readonly entity Likes as projection on my.Likes;
  action like (review: Review);
  action unlike (review: Review);
  type Review : projection on my.Reviews { subject, reviewer }
}
```
:::
This service exposes the `Reviews` entity for full CRUD operations, as well as two readonly projections: `ListOfReviews` without the potentially large text and likes fields, and `AverageRatings` which provides aggregated average ratings per subject. Additionally, an event `AverageRatings.Changed` is defined to notify consumers when the average rating for a subject changes. Actions `like` and `unlike` are also provided to manage likes on reviews.



## Exporting APIs

Use `cds export` to export the interface-only part of service definitions. For example, run that within the _cap/samples/xflights_ folder for the service definition we saw earlier, which would display the output shown below:

```shell
cds export srv/data-service.cds 
```
```log{5}
Exporting APIs to apis/data-service ...

  > apis/data-service/package.json
  > apis/data-service/index.cds
  > apis/data-service/services.csn
  > apis/data-service/cds-plugin.js
  ...
```



### Service Interfaces

The key ingredient of the output generated by `cds export` is the `services.csn` file, which contains the interface-only part of the given service definitions in [CSN](https://cap.cloud.sap/docs/cds/csn/) format.
Open that file in VSCode, for example, by cmd/ctrl-clicking on the logged file name in your terminal, or like that from the command line:

```shell
code xflights -g xflights/apis/data-service/services.csn
```

In VSCode display the outline view (via the sidebar or `Cmd+Shift+O` / `Ctrl+Shift+O`), to get a hierarchical overview of the service definition contained in the `services.csn` file, which would display something like this:

![Visual Studio Code editor showing an outline tree view of a CAP service definition file named service.csn. The tree structure displays the sap.capire.flights.data service with its nested entities: Flights containing fields like ID, date, departure, arrival, and associations to airline, origin, and destination; Airlines with ID, name, and icon fields; Airports with ID, name, city, and country fields; and Supplements with ID, name, and description fields. The outline demonstrates the hierarchical structure of a CAP service API with its data model entities and their properties.
](assets/service.csn-outline.png){width="400px"}

::: details Inspect the difference to the original service definition

To better understand the difference between the original service definition and the exported API definition, we can compare them side by side like this:

```shell
cds export srv/data-service.cds --dry > x.log
cds minify srv/data-service.cds --dry > m.log
code --diff *.log
```
This opens a diff view in VSCode, which would display these differences:
```diff
- Kept: 26 
+ Kept: 6 

   • sap.capire.flights.data
   • sap.capire.flights.data.Flights
-  •• sap.capire.flights.Flights
-  ••• sap.capire.flights.FlightConnections
-  •••• sap.capire.flights.Airlines
-  ••••• sap.common.Currencies
-  •••••• sap.common.Currencies.texts
-  ••••••• sap.common.Locale
-  ••••••• sap.common.TextsAspect
-  •••••• sap.common.CodeList
-  ••••• Currency
-  ••••• cuid
-  •••• sap.capire.flights.Airports
-  ••••• sap.common.Countries
-  •••••• sap.common.Countries.texts
-  ••••• Country
   •• sap.capire.flights.data.Airlines
   •• sap.capire.flights.data.Airports
   • sap.capire.flights.data.Supplements
-  •• sap.capire.flights.Supplements
-  ••• sap.capire.flights.SupplementTypes
-  •••• sap.capire.flights.SupplementTypes.texts
-  ••• sap.capire.flights.Supplements.texts
   •• sap.capire.flights.data.SupplementTypes
-  ••• sap.capire.flights.data.SupplementTypes.texts
-  •• sap.capire.flights.data.Supplements.texts

- Skipped: 11 
+ Skipped: 31 
...
```
:::

> [!tip] Interface-Only Service APIs
> The exported service definitions contain only what is required to describe the service interface to consumers, that is, only the inferred entity _types_ **without any projections to underlying projections**. The latter are required for generic service providers to serve the interface on top of persisted entities, while the consumers don't need that, and should not see that. 


### Packaged APIs 

Looking at the whole output of `cds export` we see that multiple files are generated in the target folder, as shown below:

```zsh
apis/data-service
├── _i18n/
│   └── *.properties
├── data/*.csv
│   └── *.csv
├── index.cds
├── services.csn
├── cds-plugin.js
└── package.json
```

Actually that's a valid CAP project structure, as introduced in the [_Getting Started_](../../get-started/index#jumpstart-projects) guide, and when imported into consuming applications it behaves like any other CAP reuse package, in particular, the models can be reused, and when doing so, the .csv files and i18n files will be found and automatically loaded. 

> [!tip] Yet Another CAP Package (YACP)
> The output of `cds export` is a valid CAP project/package on its own, which can be consumed like any other CAP reuse package. This allows to leverage all the options for adding and sharing reuse content offered by CAP.


There is also a `cds-plugin.js` file included, which triggers CAP's plug & play configuration in consuming apps. We leverage that by this config in the _package.json_:

```json [apis/data-service/package.json]
{
  ...
  "cds": {
    "requires": {
      "sap.capire.flights.data": true
    }
  }
}
```

> [!warning] Don't Touch Files
> The `services.csn` file and the generated `i18n*.properties` and `*.csv` files are not meant to be modified, as they are overwritten on subsequent runs of `cds export`.

We can modify `package.json`, `index.cds`, and `cds-plugin.js` as needed, though, to further tailor the exported API package to our needs. For example, let's edit the _package.json_ file and adjust the package name as shown below. 

::: code-group
```json [apis/data-service/package.json]
{
  "name": "@capire/xflights-data-service", // [!code ++]
  "name": "@capire/xflights-data", // [!code --]
  ...
}```
:::

We can also add additional files, including .cds files to extend the exported definitions, or .js/.ts/.java files to add custom logic, as needed. 



#### Publishing APIs

And it's a valid _npm_ or _Maven_ package, which can be published to any package registry, as we'll see below in the [_Publishing APIs_](#publishing-apis) section.

This allows to easily share and distribute the exported APIs to consumers via standard package registries.

The second key ingredient of the output generated by `cds export` is the packaging of the exported API into an _npm_ or _Maven_ package, indicated by the presence of a `package.json` or `pom.xml` file in the generated output, as highlighted below. 

... which can be published to any npm-compatible registry, such as the public [npmjs.com](https://www.npmjs.com/) registry, or private registries like [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), [Azure Artifacts](https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npm-overview?view=azure-devops), or [JFrog Artifactory](https://jfrog.com/confluence/display/JFROG/NPM+Registry).



```shell
npm publish
```




## Importing APIs 

```shell
git clone https://github.com/capire/xtravels
code xtravels
```



### From Packaged APIs

```shell
cds import --package @capire/xflights-data
```

```shell
npm add @capire/xflights-data
```



### Importing CDS APIs

```shell
cds import --api ...
```



### Other Protocols

```shell
cds import --edmx ...
```

```shell
cds import --openapi ...
```

```shell
cds import --data-product ...
```



### Analysis

- `cds import` ⇒ CAP service definitions
- `cds watch` → imported models not loaded, as we don't use them yet



## Consuming APIs 



### Via Consumption Views

Given the imported APIs we next use the definitions within our own models. In the XTravels application we want to combine Flights, Airline and Airports data with respective Bookings: 

```cds
using { sap.capire.flights.data as external } from '@capire/xflights-data';
namespace sap.capire.xflights;

/**
 * Consumption view declaring the subset of fields we actually want to use 
 * from the external Flights entity, with associations like airline, origin, 
 * destination flattened (aka denormalized).
 */
@federated entity Flights as projection on external.Flights {
  ID, date, departure, arrival,
  airline.icon     as icon,
  airline.name     as airline,
  origin.name      as origin,
  destination.name as destination,
}
```



With that in place we can start our server again, and see that the imported models are loaded now:

```shell
cds watch
```

```zsh
[cds] - loaded model from 20 file(s):
  ...
  db/xflights.cds
  node_modules/@capire/xflights-data/index.cds
  node_modules/@capire/xflights-data/services.csn
  ...
```



### Mashup with own entities

With the consumption views in place, we can now mashup these definitions with our own definitions, by adding associations like we do in XTravels application's `Bookings` entity: 

::: code-group

```cds :line-numbers [db/schema.cds]
using { sap.capire.xflights as federated } from './xflights'; // [!code focus]
...
entity Bookings { ...
  Flight      : Association to federated.Flights; // [!code focus]
  Supplements : Composition of many { ...
    booked   : Association to federated.Supplements; // [!code focus]
  }
}
```

:::

   -  ... _as if they were local_
   -  … but JOINs require data federation



### Calling Remote Services

```javascript
const xflights = await cds.connect.to ('sap.capire.flights.data')
await xflights.read `Flights {
   ID, date, departure, 
   origin.name as ![from], 
   destination.name as ![to]
}`
```



## Service Bindings


```sh
cds.requires.<service-name> = { kind: '<protocol>' , ... }
```

### Local Binding Environment


### Cloud Foundry

### Kyma / K8s

### Destinations


## Inner-Loop Development

### Mocked Out of the Box

In same process ...

```shell
cds watch 
```

```zsh
...
[cds] - mocking sap.capire.flights.data {
  at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
  decl: '@capire/xflights-data/services.csn:3'
}
...
```

Open UI → flights data displayed



### Using `cds mock`

Run this in terminal 1:

```shell
cds mock db/xflights.cds
```

```zsh
...
[cds] - mocking sap.capire.flights.data {
  at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
  decl: '@capire/xflights-data/services.csn:3'
}
...
```

Run this in terminal 2:

```shell
cds watch 
```

```zsh
[cds] - connect to sap.capire.flights.data > hcql { 
  url: 'http://localhost:56350/hcql/data' 
}
```

Open UI → flights data missing



### Test in `cds repl`



```shell
cds repl ./
```

```js
const xflights = await cds.connect.to ('sap.capire.flights.data')
await xflights.read `Flights {
   ID, date, departure, 
   origin.name as ![from], 
   destination.name as ![to]
}`
```

⇒ equally works for both, xflights api mocked locally, as well as running remotely




### Using Workspaces

### Using Proxy Packages



## Intrinsic Extensibility 

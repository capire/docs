
# CAP-Level Service Integration
The *'Calesi'* Pattern {.subtitle}

Integrating remote services – from other applications, third-party services, or platform services – is a fundamental aspect of cloud application development. CAP provides an easy and platform-agnostic way to do so: Remote services are represented as CAP services, which can be consumed _as if they were local_, while the CAP runtimes manage the communication and resilience details under the hood. Not the least, remote services can be mocked automatically for local inner-loop development and testing.
{.abstract}


[toc]:./
[[toc]]



## As if they were local

Service integration is much about consuming remote services from other applications, third-party services, or platform services. CAP greatly simplifies this by allowing to call remote services _as if they were local_. Let's see how that looks in practice:

1. Clone the bookshop sample, and start the server in a terminal:

   ```shell
   git clone https://github.com/capire/bookshop
   cds watch bookshop
   ```

2. Start *cds repl* in a second terminal, and run the code below in there:

   ```shell
   cds repl
   ```
   ```js :line-numbers
   cats = await cds.connect.to ('http://localhost:4004/hcql/admin')
   await cats.read `Authors { 
     ID, name, books { 
       ID, title, genre.name as genre
     }
   }`
   ```

::: details Requires Cloud SDK libs ...

In case you get respective error messages ensure you've installed the following Cloud SDK packages in your project:

```shell
npm add @sap-cloud-sdk/connectivity
npm add @sap-cloud-sdk/http-client
npm add @sap-cloud-sdk/resilience
```

:::

The graphic below illustrates what happened here:

![Diagram illustrating CAP-level service integration showing two scenarios: Local services where Consumer connects to Service via CQL, and Remote services where Consumer connects to Proxy via CQL, Proxy connects to Protocol Adapter via OData, and Protocol Adapter connects to Service via CQL.
](assets/remote-services.drawio.svg)

Remote CAP services can be consumed using the same high-level, uniform APIs as for local services – i.e., **_as if they were local_**. Given a respective service bindings, `cds.connect` automatically constructs remote proxies, which translate all local requests into protocol-specific ones, sent to remote services. Thereby also taking care of all connectivity, remote communication, principal propagation, as well as generic resilience.

::: details Details about `cds.service.bindings` ...
Whenever you start a CAP server with `cds watch` it registers itself with all the provided services and their protocol-specific endpoints in a user-local `~/.cds-services.json` (or `.yaml`) file. In our example above, that would look like that:

::: code-group
```yaml [~/.cds-services.yaml]
cds:
  serves:
    '@capire/bookshop':
      root: ~/cap/samples/bookshop
      url: http://localhost:4004
      pid: 76123
      serving:
        AdminService:
          odata: /admin
          rest: /rest/admin
          hcql: /hcql/admin
        CatalogService:
          odata: /browse
          rest: /rest/catalog
          hcql: /hcql/catalog
```
```json [~/.cds-services.json]
{
  "cds": {
    "serves": {
      "@capire/bookshop": {
        "root": "~/cap/samples/bookshop",
        "url": "http://localhost:4004",
        "pid": 76123,
        "serving": {
          "AdminService": {
            "odata": "/admin",
            "rest": "/rest/admin",
            "hcql": "/hcql/admin"
          },
          "CatalogService": {
            "odata": "/browse",
            "rest": "/rest/catalog",
            "hcql": "/hcql/catalog"
          }
        }
      }
    }
  }
}
```
```json [~/.cds-services.json < 9.7]
{
  "cds": {
    "provides": {
      "AdminService": {
        "endpoints": {
          "odata": "/admin",
          "rest": "/rest/admin",
          "hcql": "/hcql/admin"
        },
        "server": 92460
      },
      "CatalogService": {
        "endpoints": {
          "odata": "/browse",
          "rest": "/rest/catalog",
          "hcql": "/hcql/catalog"
        },
        "server": 92460
      }
    },
    "servers": {
      "92460": {
        "root": "~/cap/samples/bookshop",
        "url": "http://localhost:4004"
      }
    }
  }
}
```
[Learn more about service bindings below](#service-bindings) {.learn-more}
:::


> [!tip] Calesi Design Principles
>
> 1. Remote services are represented as CAP services, ... → *Everything is a CAP service*
> 2. consumed using high-level APIs, in protocol-agnostic ways → *as if they were local*
> 3. with built-in connectivity, resilience, and principal propagation → *under the hood*
>
> => Application developers stay at the CAP level -> *Focused on Domain*

> [!note] Model Free
>
> Note that in the exercise above, the consumer side didn't even have any information about the service provider, except for the URL endpoint and protocols served, which it got from the service binding. In particular no API/service definitions at all – neither in *CDS*, *OData*, nor *OpenAPI*. 

The remainder of this guide goes beyond such simple scenarios 
and covers all the aspects of CAP-level service integration in detail.




## The XTravels Sample

In this guide we'll use the _XTravels_ sample application as our running example for CAP-level service integration. It is an modernized adaptation of the reknown [ABAP Flight reference sample](https://help.sap.com/docs/abap-cloud/abap-rap/abap-flight-reference-scenario), reimplemented using CAP, as well as split into two microservices as follows:

- The [*@capire/xflights*](https://github.com/capire/xflights) service provides flight-related master data, such as *Flights*, *Airports*, *Airlines*, and *Supplements* (like extra luggage, meals, etc.). It exposes this data via a CAP service API.

- The [*@capire/xtravels*](https://github.com/capire/xtravels) application allows travel agents to plan travels on behalf of travellers, including bookings of flights. *Customer* data is obtained from a SAP S/4HANA system, while *Flights*, *Airports* and *Airline* are consumed from the *@capire/xflights*, as indicated by the green and blue areas in the screenshot below. 

![XTravels application interface showing a travel request form. The interface displays customer information including name, email, and address fields highlighted in green, sourced from S/4HANA. Below that, a flight booking section shows departure and arrival airports, dates, and times highlighted in blue, sourced from the XFlights service. The layout demonstrates data federation from multiple backend systems presented in a unified user interface.
](assets/xtravels-screenshot.png)

The resulting entity-relashionship model looks like that:

![Architecture diagram showing three systems: XFlights on the left containing Flights and Airports entities in light blue, XTravels in the center containing Travels, Bookings, and Supplements entities in darker blue, and S/4HANA on the right containing Customers entity in gray. Arrows connect Bookings to Flights, Travels to Customers, and Bookings to Supplements, illustrating data relationships between the systems in a federated service integration pattern.
](assets/xtravels-sample.drawio.svg)

From a service integration perspective, this sample mainly shows a data federation scenario, where data is consumed from different upstream systems (XFlights and S/4HANA) – most frequently in a readonly fashion – to be displayed together with an application's local data. 


### Workflow Overview
The key steps to achieve CAP-level service integration in scenarios like this are:
1. **Providing APIs** – on the service provider side, you define CAP services for all outbound interfaces, and export them as Packaged APIs using `cds export`.
2. **Importing APIs** – on the consumer side, you import the exported API packages using standard `npm add` or `mvn install`.
3. **Consuming APIs** – you use the imported definitions within your own models, e.g., via consumption views, and mashup these definitions with your own entities.
4. **Service Bindings** – you define service bindings to specify how to connect to remote services, e.g., using environment variables or platform-specific configurations.
5. **Inner-Loop Development** – you can mock remote services automatically for local development and testing, using CAP's built-in mocking capabilities.


### Getting Started...

So let's dive into the details of CAP-level service integration, using the XTravels sample as our running example. Clone both repositories as follows to follow along:

```sh
mkdir -p cap/samples
cd cap/samples
git clone https://github.com/capire/xflights
git clone https://github.com/capire/xtravels
```


## Providing APIs

In case of CAP service providers, as for [*@capire/xflights*](https://github.com/capire/xflights) in our [sample scenario](#the-xtravels-sample), you define [CAP services](../services/) for all outbound interfaces, which includes (private) interfaces to your application's UIs, as well as public APIs to any other remote consumers. 


### Defining Service APIs

Open the _cap/samples/xflights_ folder in Visual Studio Code, and have a look at the service definition in `srv/data-service.cds` in there:

::: code-group
```cds :line-numbers [cap/samples/xflights/srv/data-service.cds]
using sap.capire.flights as x from '../db/schema';
@odata @hcql service sap.capire.flights.data {
  @readonly entity Flights as projection on x.Flights {flights.*,*};
  @readonly entity Airlines as projection on x.Airlines;
  @readonly entity Airports as projection on x.Airports;  
}
```
:::

This declares a CAP service named `sap.capire.flights.data`, served over _OData_ and _HCQL_ protocols, which exposes _Flights_, _Airlines_, and _Airports_ as readonly projections on underlying domain model entities, with _Flights_ as a denormalized view.


#### Using Denormalized Views

Lets have a closer look at the denormalized view for _Flights_, which basically flattens the association to `FlightConnection`. The projection `{flights.*,*}` shown in line 3 above, is a simplified version of the following actual definition found in `srv/data-service.cds`:

```cds :line-numbers=3 [cap/samples/xflights/srv/data-service.cds]
@readonly entity Flights as projection on x.Flights {flights.*,*}; // [!code --]
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
>




### Exporting APIs

Use `cds export` to export APIs for given [service definitions](#defining-service-apis). For example, run that within the _cap/samples/xflights_ folder for the service definition we saw earlier, which would print some output as shown below:

```shell
cds export srv/data-service.cds 
```
```log
Exporting APIs to apis/data-service ...

  > apis/data-service/services.csn
  > apis/data-service/index.cds
  > apis/data-service/package.json

/done.
```

By default, generated output is written to an `./apis/<service>`  subfolder, with `<service>` being the given service definition's `.cds` file basename. You can choose a different output folder with the `--to` option of `cds export`. 



#### Exported Service Definitions

The key ingredient of the generated output is the `services.csn` file, which contains a cleansed, ***interface-only*** part of the given service definition: only the _inferred elements signature_ of served entities are included, while all projections to underlying entities got removed, and hence all underlying entities and definitions referred to by them. 

To get an idea of the effect, run `cds export` in dry-run mode like this:

```shell
cds export srv/data-service.cds --dry 
```
```zsh
 Kept: 6

   • sap.capire.flights.data
   • sap.capire.flights.data.Flights
   • sap.capire.flights.data.Airlines
   • sap.capire.flights.data.Airports
   • sap.capire.flights.data.Supplements
   • sap.capire.flights.data.SupplementTypes

 Skipped: 31

   - sap.capire.flights.Flights
   - sap.capire.flights.FlightConnections
   - sap.capire.flights.Airlines
   - sap.capire.flights.Airports
   - sap.capire.flights.Supplements
   - sap.capire.flights.SupplementTypes
   - Language
   - Currency
   - Country
   - Timezone
   - sap.common
   - sap.common.Locale
   - sap.common.Languages
   - sap.common.Countries
   - sap.common.Currencies
   - sap.common.Timezones
   - sap.common.CodeList
   - sap.common.TextsAspect
   - sap.common.FlowHistory
   - cuid
   - managed
   - temporal
   - User
   - sap.capire.flights.Supplements.texts
   - sap.capire.flights.SupplementTypes.texts
   - sap.common.Languages.texts
   - sap.common.Countries.texts
   - sap.common.Currencies.texts
   - sap.common.Timezones.texts
   - sap.capire.flights.data.Supplements.texts
   - sap.capire.flights.data.SupplementTypes.texts

 Total: 37
```

::: details Compare to original service definition...

We can also compare the above to the respective output for the complete provided service like that:

```shell
cds export srv/data-service.cds --dry > x.log
cds minify srv/data-service.cds --dry > m.log
code --diff *.log
```
This opens a diff view in VSCode, which would display these differences:
```zsh
Kept: 26 # [!code --]
Kept: 6 # [!code ++]

   • sap.capire.flights.data
   • sap.capire.flights.data.Flights
   •• sap.capire.flights.data.Airlines
   •• sap.capire.flights.data.Airports
   • sap.capire.flights.data.Supplements
   •• sap.capire.flights.data.SupplementTypes
   •• sap.capire.flights.Flights # [!code --]
   ••• sap.capire.flights.FlightConnections # [!code --]
   •••• sap.capire.flights.Airlines # [!code --]
   ••••• sap.common.Currencies # [!code --]
   •••••• sap.common.Currencies.texts # [!code --]
   ••••••• sap.common.Locale # [!code --]
   ••••••• sap.common.TextsAspect # [!code --]
   •••••• sap.common.CodeList # [!code --]
   ••••• Currency # [!code --]
   ••••• cuid # [!code --]
   •••• sap.capire.flights.Airports # [!code --]
   ••••• sap.common.Countries # [!code --]
   •••••• sap.common.Countries.texts # [!code --]
   ••••• Country # [!code --]
   •• sap.capire.flights.Supplements # [!code --]
   ••• sap.capire.flights.SupplementTypes # [!code --]
   •••• sap.capire.flights.SupplementTypes.texts # [!code --]
   ••• sap.capire.flights.Supplements.texts # [!code --]
   ••• sap.capire.flights.data.SupplementTypes.texts # [!code --]
   •• sap.capire.flights.data.Supplements.texts # [!code --]

Skipped: 11 # [!code --]
Skipped: 31 # [!code ++]
...
```

:::

In addition to the generated `services.csn` file, an `index.cds` file was added, which you can modify as needed. It won't be overridded on subsequent runs of `cds export`.

### Packaged APIs 

The third file generated is a `package.json` with that content:

::: code-group

```json [apis/data-service/package.json]
{
  "name": "@capire/xflights-data-service",
  "version": "0.1.3"
}
```

```json [=> modified]
{
  "name": "@capire/xflights-data-service", // [!code --]
  "name": "@capire/xflights-data", // [!code ++]
  "version": "0.1.3"
}
```

:::

We can modify that as needed, changes won't be overriden on subsequent runs of `cds export`. In our xflights/xtravels sample we adjusted the package name to `@capire/xflights-data` as shown in the second tab above.

> [!tip] Yet Another CAP Package (YACAP)
> The generated output is actually a CAP project/package on its own. So we can also add additional files to the generated *./apis* subfolder as needed; such as additional models in *.cds* files, data in *.csv* files or I18n bundles, even *.js* or *.java* files with custom logic for consumers. 



#### Adding Initial Data and I18n Bundles

We can also use the following `cds export` command line options, to add I18n bundles and/or initial data , wich would generate output to the usual locations next to the generated `.csn` file as shown below:

```shell
cds export srv/data-service.cds --texts
```

```log
  > apis/data-service/_i18n/i18n.properties
  > apis/data-service/_i18n/i18n_de.properties
  > apis/data-service/_i18n/i18n_fr.properties
```
```shell
cds export srv/data-service.cds --data
```

```log
  > apis/data-service/data/sap.capire.flights.data.Flights.csv
  > apis/data-service/data/sap.capire.flights.data.Airlines.csv
  > apis/data-service/data/sap.capire.flights.data.Airports.csv
  > apis/data-service/data/sap.capire.flights.data.Supplements.csv
```

The `.csv` data is taken from the source application's existing initial data, but reduced to and transformed to the entities exposed by the given service definition, including all denormalizations or calculated fields. It's actually read via an instance of that service.



#### Plug & Play Config

We can also use the `--plugin` option, to turn the package into a CAP plugin, to benefit from CAP's plug & play configuration features in consuming apps:

```shell
cds export srv/data-service.cds --plugin
```

This would add this to the generated output:

::: code-group
```js [apis/data-service/cds-plugin.js]
// just a tag file for plug & play
```
:::
::: code-group
```json [apis/data-service/package.json]
{
  "name": "@capire/xflights-data",
  "version": "0.1.13",
  "cds": { // [!code focus]
    "requires": { // [!code focus]
      "sap.capire.flights.data": true // [!code focus]
    } // [!code focus]
  } // [!code focus]
}
```
:::




### Publishing APIs

The output of `cds export` is a valid _npm_ or _Maven_ package, which can be published to any npm-compatible registry, such as the public [*npmjs.com*](https://www.npmjs.com/) registry, or private registries like [*GitHub Packages*](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry), [*Azure Artifacts*](https://learn.microsoft.com/en-us/azure/devops/artifacts/npm/npm-overview?view=azure-devops), or [*JFrog Artifactory*](https://jfrog.com/confluence/display/JFROG/NPM+Registry). For example:

```shell
npm publish ./apis/data-service
```

::: details Using GitHub Packages ...

Within the [_capire_](https://github.com/capire) org, we're publishing to [GitHub Packages](https://docs.github.com/packages), which requires you to `npm login` once like that, prior to publishing:
  ```sh
  npm login --scope=@capire --registry=https://npm.pkg.github.com
  ```
As password you're using a Personal Access Token (classic) with `read:packages` scope (for retrieving and installing a package). Read more about that in the [_GitHub Packages_](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages) docs.
:::

::: details Not using npm registries ...

Instead of publishing to npm registries we can also share packages any other way. For example we could create an archive that we upload to some marketplace like [*SAP Business Accelerator Hub*](https://api.sap.com), or team-internal ones. 

For Node.js we'd use `npm pack` to create installable archives, which would print some output with the last line telling us the filename of the created archive:

```shell
npm pack ./apis/data-service
```

```zsh [=> output]
npm notice ...
npm notice 4.9kB services.csn
npm notice 410B index.cds
npm notice 61B package.json
npm notice ...
capire-xflights-data-0.1.13.tgz
```

> [!warning]
>
> Not using package registries like *npm* or *Maven* also means you'll loose all their support for semver-based dependency management. 

:::



> [!tip] Best Practice: Using Proven Standards
> CAP leverages standard and widely adopted package management tools and practices, such as _npm_ or _Maven_, for sharing and distributing reuse packages. This allows you to use established and battle-tested workflows and tools for versioning, publishing, consuming, and upgrading packages. At the same time it allows us to not reinvent those wheels, and focus on what matters most: allowing you to focus on domain, and be as productive as possible.





## Importing APIs 

On the consumer side, like [*@capire/xtravels*](https://github.com/capire/xtravels) in our [sample scenario](#the-xtravels-sample), ... 



### From Packaged APIs

With CAP-based service providers exporting Packaged APIs as shown earlier, consuming application projects like [*@capire/xtravels*](https://github.com/capire/xtravels) can just import the exported API packages using standard `npm add` or `mvn install` like that:

```shell
npm add @capire/xflights-data
```





### From Other APIs

```shell
cds import --edmx ...
```

```shell
cds import --openapi ...
```

```shell
cds import --data-product ...
```





- `cds import` ⇒ CAP service definitions
- `cds watch` → imported models not loaded, as we don't use them yet


## Consuming APIs 

On the consumer side, like [*@capire/xtravels*](https://github.com/capire/xtravels) in our [sample scenario](#the-xtravels-sample), ... 



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

Instead of exercising a workflow like that again and again:

- ( *develop* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )

... we can use *npm workspaces* technique to work locally and speed up things as follows:

```shell 
mkdir -p cap/works; cd cap/works
git clone https://github.com/capire/xflights
git clone https://github.com/capire/xtravels
echo '{"workspaces":["xflights","xtravels"]}' > package.json
```

Add a link to the local `@capire/xflights-data` API package, enclosed with the cloned xflights sources:

```shell
npm add ./xflights/apis/data-service
```

Check the installation using `npm ls`, which would yield output as below, showing that `@capire/xtravel`'s dependency to `@capire/xflights-data` is nicely fulfilled by a local link to `./xflights/apis/data-service`:

```shell
npm ls @capire/xflights-data
```

```zsh
works@ ~/cap/works
├── @capire/xflights-data@0.1.11 -> ./xflights/apis/data-service
└─┬ @capire/xtravels@1.0.0 -> ./xtravels
  └── @capire/xflights-data@0.1.11 deduped -> ./xflights/apis/data-service
```

Start the xtravels application → and note the sources loaded from *./xflights/apis/data-service*, and the information further below about the `sap.capire.flights.data` service mocked automatically:

```shell
cds watch xtravels
```

```zsh
[cds] - loaded model from 20 file(s):

  xtravels/srv/travel-service.cds
  xtravels/db/schema.cds
  xtravels/db/xflights.cds
  xflights/apis/data-service/index.cds
  xflights/apis/data-service/services.csn
  ...
```

```zsh
[cds] - mocking sap.capire.flights.data {
  at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
  decl: 'xflights/apis/data-service/services.csn:3',
}
```



### Using Proxy Packages

The usage of *npm workspaces* technique as described above streamlined our workflows as follows:

- Before: ( *develop* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )
- After: ( *develop* → *export* ) → ( *consume* )

We can even more streamline that by eliminating the export step as follows...

Create a new subfolder `xflights-api-shortcut`  in which we add two files as follows:

```shell
mkdir xflights-api-shortcut
```

Add a `package.json` file in there with that content:

```json
{
  "name": "@capire/xflights-data",
  "dependencies": {
    "@capire/xflights": "*"
  }
}
```

And an `index.cds` file with that content:

```cds
using from '@capire/xflights/srv/data-service';
```

<details> <summary> Using the shell's "here document" technique </summary>

  You can also create those two files from the command line as follows:
  ```shell
  cat > xflights-api-shortcut/package.json << EOF
  {
    "name": "@capire/xflights-data",
    "dependencies": {
      "@capire/xflights": "*"
    }
  }
  EOF
  ```

  Take the same approach for the `index.cds` file:
  ```shell
  cat > xflights-api-shortcut/index.cds << EOF
  using from '@capire/xflights/srv/data-service';
  EOF
  ```

</details>
With that in place, change our API package dependency in the workspace root as follows:

```shell
npm add ./xflights-api-shortcut
```

Check the effect of that → note how `@capire/xflights-data` dependencies now link to `./xflights-api-shortcut`:

```shell
npm ls @capire/xflights-data
```

```zsh
works@ ~/cap/works
├── @capire/xflights-data@ -> ./xflights-api-shortcut
└─┬ @capire/xtravels@1.0.0 -> ./xtravels
  └── @capire/xflights-data@ deduped -> ./xflights-api-shortcut≤
```

Start the *xtravels* application → and note the sources loaded from *./xflights-api-shortcut*, and the information further below about the `sap.capire.flights.data` service now being _served_, not _mocked_ anymore:

```shell
cds watch xtravels
```

```zsh
[cds] - loaded model from 20 file(s):

  xtravels/srv/travel-service.cds
  xtravels/db/schema.cds
  xtravels/db/xflights.cds
  xflights-api-shortcut/index.cds
  xflights/srv/data-service.cds
  xflights/db/schema.cds  
  ...
```

```zsh
[cds] - serving sap.capire.flights.data {
  at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
  decl: 'xflights/apis/data-service/services.csn:3',
}
```

Which means we've streamlined our workflows as follows:

- Before: ( *change* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )
- Step 1: ( *change* → *export* ) → ( *consume* )
- Step 2: ( *change* ) → ( *consume* )





## Intrinsic Extensibility 

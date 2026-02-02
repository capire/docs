
# CAP-Level Service Integration
The *'Calesi'* Pattern {.subtitle}

Integrating remote services - from other applications, third-party services, or platform services - is a fundamental aspect of cloud application development. CAP provides an easy and platform-agnostic way to do so: Remote services represented as CAP services, which you can consume _as if they were local_, while the CAP runtimes manage the communication and resilience details under the hood. Not the least, CAP mocks remote services automatically for local inner-loop development and testing.
{.abstract}


> [!tip] The <i>'Calesi'</i> Pattern – Guiding Principles
>
> 1. Remote services are proxied by CAP services, ... → *everything's a CAP service*
> 2. consumed in protocol-agnostic ways → *... as if they were local*
> 3. mocked out of the box → *fast-track inner-loop development*
> 4. with varying implementations → *evolution w/o disruption*
> 5. extensible through event handlers → *intrinsic extensibility*
>
> => Application developers stay at CAP level -> *Focused on Domain*


[toc]:./
[[toc]]



## Introduction & Overview

### As If They Were Local

Service integration is much about consuming remote services from other applications, third-party services, or platform services. CAP greatly simplifies this by allowing to call remote services _as if they were local_. Let's see how this works:

1. Clone the bookshop sample, and start the server in a terminal:

   ```shell
   git clone https://github.com/capire/bookshop
   cds watch bookshop
   ```

2. Start *cds repl* in a second terminal and run this code:

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
](assets/remoting.drawio.svg)

Remote CAP services can be consumed using the same high-level, uniform APIs as for local services – i.e., **_as if they were local_**. `cds.connect` automatically constructs remote proxies, which translate all local requests into protocol-specific ones, sent to remote services. Thereby also taking care of all connectivity, remote communication, principal propagation, as well as generic resilience.

> [!note] Model Free
>
> Note that in the exercise above, the consumer side didn't even have any information about the service provider, except for the URL endpoint and protocols served, which it got from the service binding. In particular no API/service definitions at all – neither in *CDS*, *OData*, nor *OpenAPI*.

The remainder of this guide goes beyond such simple scenarios
and covers all the aspects of CAP-level service integration in detail.




### The XTravels Sample

In this guide we'll use the _XTravels_ sample application as our running example. It's a modernized adaptation of the renowned [ABAP Flight reference sample](https://help.sap.com/docs/abap-cloud/abap-rap/abap-flight-reference-scenario), reimplemented using CAP and split into two microservices:

- The [*@capire/xflights*](https://github.com/capire/xflights) service provides flight-related master data, such as *Flights*, *Airports*, *Airlines*, and *Supplements* (like extra luggage, meals, etc.). It exposes this data via a CAP service API.

- The [*@capire/xtravels*](https://github.com/capire/xtravels) application allows travel agents to plan travels on behalf of travellers, including bookings of flights. The application obtains *Customer* data from a SAP S/4HANA system, while it consumes *Flights*, *Airports*, and *Airlines* from *@capire/xflights*, as indicated by the green and blue areas in the screenshot below.

![XTravels application interface showing a travel request form. The interface displays customer information including name, email, and address fields highlighted in green, sourced from S/4HANA. Below that, a flight booking section shows departure and arrival airports, dates, and times highlighted in blue, sourced from the XFlights service. The layout demonstrates data federation from multiple backend systems presented in a unified user interface.
](assets/xtravels-screenshot.png)

The resulting entity-relationship model looks like that:

![Architecture diagram showing three systems: XFlights on the left containing Flights, Airlines, and Airports entities in light blue, XTravels in the center containing Travels, Bookings, and Supplements entities in darker blue, and S/4HANA on the right containing Customers entity in gray. Arrows connect Bookings to Flights, Travels to Customers, and Bookings to Supplements, illustrating data relationships between the systems in a federated service integration pattern.
](assets/xtravels-sample.drawio.svg)

From a service integration perspective, this sample mainly shows a data federation scenario, where the application consumes data from different upstream systems (XFlights and S/4HANA) – most frequently in a readonly fashion – to display it together with the application's local data.

### Workflow Overview

The graphic below shows the flow of essential steps for service integration, which the following sections walk you through in detail:

![Workflow diagram showing five numbered steps of CAP-level service integration. Service Provider box on left contains step 1 Service Definition in blue and Domain Models in gray. Packaged API box in center shows step 2 Service Interface in light gray. Service Consumer box on right displays step 4 Consumption Views in light blue and step 5 Own Models in blue. Arrows connect the components left to right. Below, numbered list describes: 1 Expose Service Interfaces as usual, 2 Export APIs using cds export and npm publish, 3 Import APIs using cds import or npm add, 4 Add Consumption Views defining what to consume, 5 Use with own models as if they were local.
](assets/overview.drawio.svg)


#### Getting Started...

Let's dive into the details of CAP-level service integration, using the XTravels sample as our running example. Clone both repositories as follows to follow along:

```sh
mkdir -p cap/samples
cd cap/samples
git clone https://github.com/capire/xflights
git clone https://github.com/capire/xtravels
```


## Providing CAP-level APIs

In case of CAP service providers, as for [*@capire/xflights*](https://github.com/capire/xflights) in our [sample scenario](#the-xtravels-sample), you define [CAP services](../services/index) for all inbound interfaces, which includes (private) interfaces to your application's UIs, as well as public APIs to any other remote consumers.


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

Let's have a closer look at the denormalized view for _Flights_, which basically flattens the association to `FlightConnection`. The projection `{flights.*,*}` shown in line 3 above, is a simplified version of the following actual definition found in `srv/data-service.cds`:

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

Use `cds export` to generate APIs for given [service definitions](#defining-service-apis). For example, run that within the _cap/samples/xflights_ folder for the service definition we saw earlier, which would print some output as shown below:

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

By default, output goes to an `./apis/<service>` subfolder, where `<service>` is the `.cds` file basename. Use the `--to` option to specify a different output folder.

#### Exported Service Definitions

The key ingredient of the generated output is the `services.csn` file, which contains a cleansed, ***interface-only*** part  of your service definition. It includes the _inferred elements signature_ of served entities but removes all projections to underlying entities and their dependencies.

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

In addition to the generated `services.csn` file, an `index.cds` file was added, which you can modify as needed. It won't be overridden on subsequent runs of `cds export`.


### Packaged APIs

The third generated file is `package.json`:

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

You can modify this file. `cds export` won't overwrite your changes. In our xflights/xtravels sample, we changed the package name to `@capire/xflights-data`.

> [!tip] Yet Another CAP Package (YACAP)
> The generated output is a complete CAP package. You can add additional files to the *./apis* subfolder: models in *.cds* files, data in *.csv* files, I18n bundles, or even *.js* or *.java* files with custom logic for consumers.



#### Adding Initial Data and I18n Bundles

You can use these `cds export` options to add I18n bundles and initial data, which generates files next to the `.csn` file:

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

The `.csv` data comes from the source application's initial data, filtered and transformed for the exposed entities, including denormalizations and calculated fields. The application actually reads it via an instance of that service.



#### Plug & Play Config

Use the `--plugin` option to turn the package into a CAP plugin and benefit from CAP's plug & play configuration features in consuming apps:

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

On the consumer side, like [*@capire/xtravels*](https://github.com/capire/xtravels) in our [sample scenario](#the-xtravels-sample), we import packaged APIs as provided before using `npm add`, or other APIs from non-CAP sources using `cds import` as outlined below.



### Packaged APIs

Packaged APIs provided by CAP service providers are imported to consuming applications like that:

```shell
npm add @capire/xflights-data
```

This makes the exported models with all accompanying artifacts available in the target project's `node_modules` folder. In addition, it adds a respective package dependency to the consuming application's *package.json* like this:

::: code-group
```json [package.json]
{...
  "dependencies": { ...
    "@capire/xflights-data": "0.1.12"
  }
}
```
:::

This allows us to update imported APIs later on using standard commands like `npm update`.



### OData APIs

You can also `cds import` APIs from other sources, such as OData APIs for customer data from SAP S/4 HANA systems:

1. Get an [_OData EDMX_](https://api.sap.com/api/API_BUSINESS_PARTNER/overview) source, e.g., from [*SAP Business Accelerator Hub*](https://api.sap.com):

   ::: details Detailed steps through SAP Business Accelerator Hub ...
      - Open https://api.sap.com in your browser
      - Navigate to
      \> [_SAP S/4HANA Cloud Public Edition_](https://api.sap.com/products/SAPS4HANACloud)
         \> [_APIs_](https://api.sap.com/products/SAPS4HANACloud/apis)
         \> [_OData V2_](https://api.sap.com/products/SAPS4HANACloud/apis/ODATA)
      - Find and open [_Business Partner (A2X)_](https://api.sap.com/api/API_BUSINESS_PARTNER/overview)
      - Switch to the *API Specification* subtab.
      - Click the download icon next to *OData EDMX* to download the `.edmx`  file.
   :::

2. Import that to the current project:

```shell
cds import ~/Downloads/API_BUSINESS_PARTNER.edmx
```
This copies the specified *.edmx* file into the `srv/external/` subfolder of your project, and generates a `.csn` file with the same basename next to it:

```zsh
srv/external
├── API_BUSINESS_PARTNER.csn
└── API_BUSINESS_PARTNER.edmx
```

> Run `cds import` with option `--as cds` to generate a human-readable `.cds` file instead of `.csn`.

Further, it adds a [service binding](./service-bindings) stub to your _package.json_, which we'll learn about later.


> [!tip] Import from other APIs
> You can use `cds import` in the same way as for OData to import SAP data products, [_OpenAPI_](../protocols/openapi) definitions, [_AsyncAPI_](../protocols/asyncapi) definitions, or from [_ABAP RFC_](../../plugins/#abap-rfc). For example:
> ```shell
> cds import --data-product ...
> cds import --odata ...
> cds import --openapi ...
> cds import --asyncapi ...
> cds import --rfc ...
> ```
> [Learn more about `cds import` in the tools guides.](../../tools/apis/cds-import){.learn-more}


### Reuse Packages

Instead of importing the same APIs repeatedly in each project, you can import them once and share them as reusable packages. These packages use the same techniques as `cds export` and provide the same plug & play convenience.

For the _XTravels_ sample, we did so with the [`@capire/s4`](https://github.com/capire/s4) sample package, which we created as follows.


1. We started a new CAP project – get the outcome from Github to follow along:

   ```shell
   git clone https://github.com/capire/s4.git
   code s4
   ```

 2. We imported the [OData API](https://api.sap.com/api/API_BUSINESS_PARTNER/overview) as [outlined above](#odata-apis).

    ```shell
    cds import ~/Downloads/API_BUSINESS_PARTNER.edmx
    ```

2. Edited the `cds import`-generated `package.json` to look like that:
   ::: code-group
   ```json :line-numbers [package.json]
   {
      "name": "@capire/s4",
      "version": "1.0.0",
      "cds": {
         "requires": {
            "sap.capire.s4.business-partner": {
               "service": "API_BUSINESS_PARTNER",
               "kind": "odata-v2"
            }
         }
      }
   }
   ```
   :::

3. Added the following files to expose the imported API in a CAP-idiomatic way:

   ::: code-group
   ```js [cds-plugin.js]
   // just a tag file for plug & play configuration in consuming apps
   ```
   :::

   ::: code-group
   ```cds :line-numbers [srv/business-partners.cds]
   using from './srv/external/API_BUSINESS_PARTNER';
   annotate API_BUSINESS_PARTNER with @cds.external:2;
   ```
   :::

   ::: code-group
   ```cds :line-numbers [index.cds]
   // Entry point to allow imports like: using from '@capire/s4';
   using from './srv/business-partners';
   ```
   :::

4. Added some initial data using `cds add data`.
   ```shell
   cds add data -o ./srv/external/data -f A_BusinessPartner
   ```

5. Finally published the package to [_Github Packages_](https://github.com/features/packages).
   ```shell
   npm publish
   ```

In the consuming project [*@capire/xtravels*](https://github.com/capire/xtravels) we then simply added this package in the same way as we added the `@capire/xflights-data` package before:

```shell
npm add @capire/s4
```

> [!tip] Pre-built Integration Packages
> In effect, pre-built integration packages apply the same best practice techniques as the `cds export` command does when generating [Packaged APIs](#packaged-apis). Such packages can be reused in any CAP project by a simple `npm add` command, thereby avoiding the need to re-import raw API definitions in each consuming project from scratch. Last but not least, they allow central version management based _npm_ and _Maven_.





## Integrating Models

With imported APIs, you can now use them in your own models. For example, the XTravels application combines customer data from SAP S/4HANA with travels and flight bookings from xflights. With the integrated models, you can already run the application, as CAP [mocks integrations automatically](#mocked-out-of-the-box). For real integration, you'll need [custom code](#integration-logic), which we'll cover later.

> [!tip] <i>AI Agents 'capire' CAP</i>
> We can use AI agents to help us analysing and understanding our models. Actually, the following sections are based on a response by *Claude Sonnet* to the question: *"Find and explain all references"*, with the entity definition for the `Flights` consumption view selected as context.


### Consumption Views

Imported APIs often contain more entities and elements than you need. So as a next step we first create *Consumption Views* to capture what you actually want to use, focusing on entities and elements you need close access to.

Create two new files `apis/capire/xflights.cds` and `apis/capire/s4.cds`:

::: code-group
```cds :line-numbers [apis/capire/xflights.cds]
using { sap.capire.flights.data as x } from '@capire/xflights-data';
namespace sap.capire.xflights;

@federated entity Flights as projection on x.Flights {
  ID, date, departure, arrival, modifiedAt,
  airline.icon     as icon,
  airline.name     as airline,
  origin.name      as origin,
  destination.name as destination,
}

@federated entity Supplements as projection on x.Supplements {
  ID, type, descr, price, currency, modifiedAt,
}
```
:::
::: code-group
```cds :line-numbers [apis/capire/s4.cds]
using { API_BUSINESS_PARTNER as S4 } from '@capire/s4';
namespace sap.capire.s4;

@federated entity Customers as projection on S4.A_BusinessPartner {
  BusinessPartner as ID,
  PersonFullName  as Name,
  LastChangeDate || 'T' || LastChangeTime || 'Z' as modifiedAt,
} where BusinessPartnerCategory == 1; // 1 = Person
```
:::

Noteworthy aspects here are:

- We map names to match our domain, for example by renaming the imported entity from `A_Business_Partner` to `Customers`, choose simpler names for the elements we want to use, and combine date and time fields into a single `modifiedAt` timestamp in ISO 8601 format.

- For the `Flights` entity we also flatten data from associations directly into the `Flights` consumption view. This is another [denormalization](#using-denormalized-views) to make life easier for us in the xtravels app.

- The namespaces `sap.capire.s4` and `sap.capire.xflights` reflect the source systems but differ from the original namespaces to avoid name clashes.

- We annotate both views with `@federated` to trigger data federation, covered in the next chapters.


> [!tip] Always use Consumption Views
>
> Even though they are optional, it's a good practice to always define consumption views on top of imported APIs.  They declare what you need, enabling automated data federation. They also map imported definitions to your domain by renaming, flattening, or restructuring.

> [!warning] Protocol-specific Limitations
>
> Depending on the service provider and protocols, limitations apply to consumption views. In particular, OData doesn't support denormalization like we used for the `Flights` view. This works here because xflights also serves the HCQL protocol (see the `@hcql` annotation in its [definition](#defining-service-apis)), which is CAP's native protocol.



### Associations

With consumption views in place, you can now reference them from your models _as if they were local_, creating mashups of imported and local definitions.


  ::: code-group
  ```cds :line-numbers=1 [db/schema.cds]
  using { sap.capire.xflights as x } from '../apis/capire/xflights';
  ```
  :::
  ```cds :line-numbers=25
  entity Bookings { // ...
    Flight : Association to x.Flights;
  }
  ```
- Line 26 –  Each _Booking_ references a _Flight_ from the external xflights service, which allows us to display flight details alongside bookings.

#### Associations from Remote

  ::: code-group
  ```cds :line-numbers=1 [db/schema.cds]
  using { sap.capire.xflights as x } from '../apis/capire/xflights';
  ```
  :::
  ```cds :line-numbers=73
  extend x.Flights with columns {
    Bookings : Association to many Bookings on Bookings.Flight = $self
  }
  ```


- Line 74 – Adds a backlink from _Flights_ to _Bookings_ for bidirectional traversal.

::: details Limitations of Remote Extensions
Extensions to remote entities, as shown above, are only possible for elements which would not require changes to the remote service's actual data. This is the case for _virtual_ elements and _calculated_ fields, as well as **_unmanaged_** associations, as all foreign keys are local. It's not possible for regular elements or _managed_ associations, though.
:::


### Constraints

::: code-group
```cds :line-numbers=44 [srv/travel-constraints.cds]
annotate TravelService.Bookings with { ...
  Flight @mandatory {
    date @assert: (case
      when date not between $self.Travel.BeginDate and $self.Travel.EndDate
      then 'ASSERT_BOOKING_IN_TRAVEL_PERIOD'
    end);
  };
}
```
:::

- Line 46 – Adds a constraint to the _Flight.date_ element to ensure that the flight date of a booked _Flight_ falls within the travel period of the associated _Travel_.


### Serving UIs

::: code-group
```cds :line-numbers=1 [srv/travel-service.cds]
using { sap.capire.xflights as x } from '../apis/capire/xflights';
```
:::
```cds :line-numbers=16
@fiori service TravelService { ...
  @readonly entity Flights as projection on x.Flights;
}
```

- Line 17 – Exposes the _Flights_ entity in the _TravelService_ for UI consumption.
This is required as associations to non-exposed entities would be cut off, which would apply to the _Bookings_ -> _x.Flights_ association if we did not expose _x.Flights_.


#### Fiori Annotations

On top of the mashed up models we can add Fiori annotations as usual to serve Fiori UIs – again: _as if they were local_. For example, following are excerpts of Fiori annotations referring to the `A_BusinessPartner` entity imported from S/4 (via the `Customers` consumption view, and the association to that from the local `Travels` entity).

::: code-group
```cds [app/common/labels.cds]
annotate s4.Customers with @title: '{i18n>Customer}' { ...
  ID @title: '{i18n>Customer}' @Common.Text: Name;
}
```
:::
```cds
annotate our.Travels with { ...
  Customer @title: '{i18n>Customer}' @Common: {
    Text: (Customer.Name), TextArrangement: #TextOnly
  };
}
```

::: code-group
```cds [app/common/code-lists.cds]
annotate our.Travels { ...
  Customer @Common.ValueList: { CollectionPath: Customers, ... }
}
```
:::

::: code-group
```cds [app/travels/layouts.cds]
annotate TravelService.Travels with @UI: { ...
  SelectionFields: [ (Customer.ID), ...  ],
  LineItem: [ { Value: (Customer.ID), .... }, ...  ],
  FieldGroup #Tx: { Data: [ { Value: (Customer.ID) }, ...  ]}
}
```
:::
```cds
annotate TravelService.Bookings with @UI: { ...
  HeaderInfo: { Title: { Value: (Travel.Customer.Name) }, ...  },
  FieldGroup #GI: { Data: [ { Value: (Travel.Customer.ID) },  ... ]},
}
```

There are similar references to `Flights` entity from xflights in other parts of the Fiori annotations, which we omit here for brevity.


### Mocked Out of the Box

With mashed up models, you can run applications in _'airplane mode'_ without upstream services running. CAP mocks imported services automatically _in-process_ with mock data in the same _in-memory_ database as your own data.

1. Start the xtravels application locally using `cds watch` as usual, and note the output about the integrated services being mocked automatically:

    ```shell
    cds watch
    ```
    ```zsh
    [cds] - mocking sap.capire.s4.business-partner {
      at: [ '/odata/v4/s4-business-partner' ],
      decl: 's4/external/API_BUSINESS_PARTNER.csn:7'
    }
    ```zsh
    [cds] - mocking sap.capire.flights.data {
      at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
      decl: 'xflights/apis/data-service/services.csn:3'
    }
    ```
    ```

2. Open the Fiori UI in the browser -> it displays data from both, local and imported entities, seamlessly integrated as shown in the screenshot below (the data highlighted in green is mocked data from `@capire/s4`).

![XTravels Fiori list view showing a table of travel requests, with the Customer highlighted in green.](assets/xtravels-list.png)

> [!tip] Fast-track Inner-Loop Development → Spawning Parallel Tracks
>
> The mocked-out-of-the-box capabilities of CAP, with remoted services mocked in-process and a shared in-memory database, allows us to greatly speed up development and time to market. For real remote operations there is additional investment required, of course. But the agnostic nature of CAP-level Service Integration also allows you to spawn two working tracks running in parallel: One team to focus on domain and functionality, and another one to work on the integration logic under the hood.

We'll learn more about mocking and inner loop development in the [next chapter](./inner-loops).


#### Integration Logic Required

While everything just works nicely when mocked in-process and with a shared in-memory database, let's move closer to the target setup and use `cds mock` to run the services to be integrated in separate processes.

1. First run these commands **in two separate terminals**:

    ```shell :line-numbers=1
    cds mock apis/capire/xflights.cds
    ```
    ```shell  :line-numbers=2
    cds mock apis/capire/s4.cds
    ```

2. Start the xtravels server as usual **in a third terminal**, and note that it now _connects_ to the other services instead of mocking them:

    ```shell :line-numbers=3
    cds watch
    ```
    ```zsh
    [cds] - connect to sap.capire.s4.business-partner > odata {
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




## Integration Logic

This chapter walks you through the typical use cases and solution patterns that you should be aware of when implementing required integration logic. The following sections do that on the example of [CAP Node.js SDK](../../node.js/); the same principles and patterns apply to CAP Java, as documented in the [CAP Java SDK](../../java/) reference documentation.



### Connecting to Remote Services

It all starts with connecting to remote services, which we do like that in the xtravels project:

::: code-group

```js :line-numbers=21 [srv/travel-service.js]
const s4 = await cds.connect.to ('sap.capire.s4.business-partner')
const xflights = await cds.connect.to ('sap.capire.flights.data')
```

:::

The `cds.connect.to(<service>)` function used here is the single common way to address service instances. It's used for and works the same way for both, local as well as remote services:

- for **local** services, it returns the local service providers – i.e., instances of [`cds.ApplicationService`](../../node.js/app-services), or your application-specific subclases thereof.

- for **remote** services, it returns a remote service proxy – i.e., instances of [`cds.RemoteService`](../../node.js/remote-services), generically constructed by the client libs.

![Diagram illustrating CAP-level service integration showing two scenarios: Local services where Consumer connects to Service via CQL, and Remote services where Consumer connects to Proxy via CQL, Proxy connects to Protocol Adapter via OData, and Protocol Adapter connects to Service via CQL.
](assets/remoting.drawio.svg)

> [!tip] Agnostic to Location and Protocol
> Always use `cds.connect.to(<service>)` to connect to both local and remote services. Both inherit from the [`cds.Service`](../../node.js/core-services) base class, which constitutes the uniform interface for consuming CAP services – in turn agnostic to underlying protocols, and agnostic to whether its local or remote at all.


### Uniform, Agnostic APIs

The uniform and protocol-agnostic programming interface offered through [`cds.Service`](../../node.js/core-services) is centered around these methods:

- [`cds.connect.to (<service>)`](../../node.js/cds-connect) → connects to remote services, as shown above.
- [`srv.run (<query>)`](../../node.js/core-services#srv-run-query) → executes advanced, deep queries with remote services.
- [`srv.send (<request>)`](../../node.js/core-services#srv-send-request) → synchronous communication, for all kinds of services.
- [`srv.emit (<event>)`](../../node.js/core-services#srv-emit-event) → asynchronous communication, via messaging middlewares.
- [`srv.on (<event>)`](../../node.js/core-services#srv-on-event) → subscribe event handlers to events from other services.

Here are some typical usages found in the xflights/xtravels sample:

```js :line-numbers=1
await xflights.run (SELECT.from`Flights`.where`modifiedAt > ${latest}`)
await xflights.send ('POST','BookingCreated', { flight, date, seats })
await this.emit ('Flights.Updated', { flight, date, free_seats }) // this = xflights service
xflights.on ('Flights.Updated', async msg => { ... })
```
- Line 1 – queries the xflights service for updated flights since the last sync
- Line 2 – calls a custom action of the xflights service (synchronously).
- Line 3 – emits asynchronous events from the xflights service.
- Line 4 – subscribes an event handler to events from the xflights service.

The [`srv.send(<request>)`](../../node.js/core-services#srv-send-request) method – and its [_REST-style_ derivatives](../../node.js/core-services#rest-style-api) – is the most flexible option, as it allows to send all kinds of requests to all kinds of services – including non-CAP services, and non-OData services, down to very technical services, for which no API schema might exist at all.

The, [`srv.emit(<event>)`](../../node.js/core-services#srv-emit-event) method – with [`srv.on(<event>)`](../../node.js/core-services#srv-on-event) on subscribers' side – promotes asynchronous communication via events, which is most recommended for reasons of decoupling and scalability. It requires the target service to be connected via a messaging middleware, though.

The [`srv.run(<query>)`](../../node.js/core-services#srv-run-query) method – and its [_CRUD-style_ derivatives](../../node.js/core-services#crud-style-api) – is the most powerful option, and closest to the use cases of data-centric business applications. It requires the target service to support querying, though, like CAP application services, OData services, or GraphQL services.

> [!tip] Choosing the Right Method
> Choose the method that best fits your use case and the capabilities of the target service. Prefer `srv.run(<query>)` for its power and conceptual expressiveness with data-centric operations. Consider `srv.emit(<event>)` for decoupled, asynchronous communication whenever possible. Retreat to `srv.send(<request>)` for maximum flexibility only when needed.

> [!tip] Staying at CAP Level
> Always stay at CAP level when integrating services, using the uniform and protocol-agnostic [_Core Service APIs_](../../node.js/core-services) outlined above, combined with [_CQL_](../../cds/cql) as CAP's universal query language. This allows CAP to automate things like protocol translations, data federation, resilience for you, as well as mocking services out of the box, thereby promoting fast inner loops. Only retreat to lower levels when absolutely necessary.

### Testing with `cds repl`

We can use `cds repl` to experiment the options to send requests and queries to remote services interactively. Do so as follows...

From within the xtravels project's root folder `cap/samples/xtravels`, start by mocking the remote services in separate terminals, then start xtravels server within `cds repl` in a third terminal:

```shell :line-numbers=1
cds mock apis/capire/xflights.cds
```
```shell :line-numbers=2
cds mock apis/capire/s4.cds
```
```shell :line-numbers=3
cds repl ./
```

Within the REPL, connect to local and remote services:

```js
const TravelService = await cds.connect.to ('TravelService')
const xflights = await cds.connect.to ('sap.capire.flights.data')
const s4 = await cds.connect.to ('sap.capire.s4.business-partner')
```

Read data directly from the remote `A_BusinessPartner` entity.
```js
await s4.run (SELECT.from`A_BusinessPartner`.limit (3))
await s4.read`A_BusinessPartner`.limit (3) // shorthand // [!code focus]
```
> The variant on line 2 is a convenient shorthand for the one on line 1.

::: details See results output ...
```zsh
=> [
  {
    BusinessPartner: '000001',
    PersonFullName: 'Mrs. Theresia Buchholm',
    LastChangeDate: '2024-01-19',
    LastChangeTime: '21:48:32',
    BusinessPartnerCategory: '1'
  },
  {
    BusinessPartner: '000002',
    PersonFullName: 'Mr. Johannes Buchholm',
    LastChangeDate: '2024-01-08',
    LastChangeTime: '11:22:01',
    BusinessPartnerCategory: '1'
  },
  {
    BusinessPartner: '000003',
    PersonFullName: 'Mr. James Buchholm',
    LastChangeDate: '2022-11-04',
    LastChangeTime: '15:27:46',
    BusinessPartnerCategory: '1'
  }
]
```
:::

Read the same data via the `s4.capire.s4.Customers` consumption view:
```js
const { Customers } = cds.entities ('sap.capire.s4')
await s4.read (Customers) .limit (3) // [!code focus]
```
::: details See results output ...
```zsh
=> [
  { ID: '000001', Name: 'Mrs. Theresia Buchholm', modifiedAt: '2024-01-19' },
  { ID: '000002', Name: 'Mr. Johannes Buchholm', modifiedAt: '2024-01-08' },
  { ID: '000003', Name: 'Mr. James Buchholm', modifiedAt: '2022-11-04' }
]
```
Note how field names and structure are adapted to our domain.
:::

::: details See OData requests ...
Watch the log output in the second terminal to see the translated OData requests being received by the remote service, for example:

```zsh
[odata] - GET /odata/v4/s4-business-partner/A_BusinessPartner {
  '$top': '3'
}
```
```zsh
[odata] - GET /odata/v4/s4-business-partner/A_BusinessPartner {
  '$select': 'BusinessPartner,PersonFullName,LastChangeDate',
  '$top': '3'
}
```
:::

CRUD some data into remote `A_BusinessPartner` entity, still via the `s4.capire.s4.Customers` consumption view:
```js
await s4.insert ({ ID: '123', Name: 'Sherlock' }) .into (Customers)
await s4.create (Customers, { ID: '456', Name: 'Holmes' })
await s4.read`ID, Name` .from (Customers) .where`length(ID) <= 3`
await s4.update (Customers,'123') .with ({ modifiedAt: '2026-01-01' })
await s4.delete (Customers,'123')
await s4.delete (Customers) .where`ID = ${'456'}`
```

> [!tip] Always use Consumption Views
> Even when accessing remote services directly, always prefer doing so via consumption views as shown above. They map the remote definitions to your domain, and allow CAP to automatically translate queries accordingly. This includes renaming, flattening, restructuring, as well as filtering out unnecessary data.


### Modifying CQNs

Queries in CAP are represented as first-class [CQN](../../cds/cqn) objects under the hood. When querying remote services, we can inspect and modify those query objects prior to forwarding them to target services for execution.

Let's try that out in `cds repl`, which we [started before](#testing-with-cds-repl).

1. Construct and inspect an example of an inbound query:

```js
q1 = SELECT`ID, Name`.from (Customers) .where`length(ID) <= 3`
```
```zsh
=> cds.ql {
  SELECT: {
    from: { ref: [ 'sap.capire.s4.Customers' ] },
    columns: [
      { ref: [ 'ID' ] },
      { ref: [ 'Name' ] }
    ],
    where: [
      { func:'length', args: [ {ref:['ID']} ] },  '<=',  { val:3 }
    ],
  }
}
```

2. Create a clone of that query to modify it without changing the original one:
```js
q2 = cds.ql.clone (q1) // get a clone to keep q1 intact
```

3. Modify our cloned query as needed. For example, let's replace the existing where clause, and add an order by clause like this:
```js
q2.SELECT.where = cds.ql.predicate`contains (Name,'Astrid')`
q2.orderBy `Name asc`
```
```zsh
=> cds.ql {
  SELECT: { // ... as before ...,
    where: [
      { func: 'contains', args: [ {ref:['Name']}, {val:'Astrid'} ] } # [!code focus]
    ],
    orderBy: [ {ref:['Name'], sort: 'asc' } ] # [!code focus]
  },
}
```

4. Finally forward / run the modified query:
```js
await s4.run (q2)
```
::: details See results output ...
```zsh
=> [
  { ID: '000096', Name: 'Mrs. Astrid Detemple' },
  { ID: '000037', Name: 'Mrs. Astrid Gutenberg' },
  { ID: '000164', Name: 'Mrs. Astrid Hoffen' },
  { ID: '000399', Name: 'Mrs. Astrid Kramer' },
  { ID: '000087', Name: 'Mrs. Astrid Martin' },
  { ID: '000527', Name: 'Mrs. Astrid Sommer' },
  { ID: '000203', Name: 'Mrs. Astrid Waldmann' }
]
```
:::

> [!tip] Powerful Query Adaptation
> Modifying queries prior to forwarding them to remote services is a powerful technique to implement advanced integration scenarios. For example, you can adapt queries to the capabilities of target services, implement custom filtering, paging, or sorting logic, or even split and merge queries across multiple services.

::: details First-Class Query Objects
On a side note: We leverage key principles of [_first-class objects_](https://google.com/search?q=first+class+objects+programming) here, as known from functional programming and dynamic languages: As queries are represented as first-class CQN objects, we can construct and manipulate them programmatically at runtime, pass them as arguments, and return them from functions. And, not the least, this opens the doors for things like higher-order queries, query delegation – e.g. push down to databases –, and late materialization.
:::

> [!warning] Always Clone Before Modifying
> As always, great power comes with great responsibility: Ensure to [`cds.ql.clone`](../../node.js/cds-ql#cds-ql-clone) CQNs before modifying them, as they are shared across the entire request processing pipeline. Failing to do so may lead to unexpected side effects and hard-to-debug issues. And CAP runtimes can only optimize for _immutable_ CQNs.


### Data Federation

There are many scenarios where data from remote services needs to be in close access locally. For example, in the xtravels app we want to display lists of flight details alongside bookings in Fiori UIs. This requires joining data from the local `Bookings` entity with data from the remote `Flights` entity.

Relying on live calls to remote services per row is clearly not an option. Instead, we'd rather ensure that data required in close access is really available locally, so it can be joined with own data using SQL JOINs. This is what _data federation_ is all about.


#### Basic Implementation

Following would be a basic implementation for replicating flights data from the remote xflights service into local database tables of the xtravels app:

1. Annotate your consumption _views_ with `@cds.persistence.table` to turn them into _tables_ to persist replicated data locally:

::: code-group
```cds [db/schema.cds]
// turn into table to persist replicated data
annotate x.Flights with @cds.persistence.table;
```
:::

2. Implement logic to replicate updated data, for example like that:

```js [srv/data-replication.js]
const xflight = await cds.connect.to ('sap.capire.flights.data')
const {Flights} = cds.entities ('sap.capire.xflights')
let {latest} = await SELECT.one`max(modifiedAt) as latest`.from (Flights)
let touched = await xflight.read (Flights).where`modifiedAt > ${latest||0}`
if (touched.length) await UPSERT (touched).into (Flights)
```

#### Generic Implementation

While the above is a valid implementation for data replication, it is specific to the `Flights` entity, which means we would need to write similar code for each entity we want to replicate. Therefore, we actually implemented a more generic solution for data federation in xtravels, which automatically kicks in on any entity tagged with the `@federated` annotated, which we already used in our [consumption views](#consumption-views):

::: code-group
```cds [apis/capire/xflights.cds]
@federated entity Flights as projection on x.Flights { ... }
@federated entity Supplements as projection on x.Supplements { ... }
```
```cds [apis/capire/s4.cds]
@federated entity Customers as projection on S4.A_BusinessPartner { ... }
```
:::

Besides the advantages of reusability and maintainability, this also allows us to easily add new entities for data federation just by annotating them with `@federated`, without the need to write any custom code at all. The projections defined in such _`@federated` consumption views_ also declare exactly what data needs to be in close access, and what not, thereby avoiding overfetching.

Learn more about that generic solution in the [_CAP-level Data Federation_](data-federation) guide.

> [!tip] When to Use Data Federation
> Data federation is essential when remote data is needed in close access for joins with local data, filtering, or sorting operations. It drastically improves read performance and reduces latency, as well as overall load. It also increases resilience and high availability by reducing dependencies on other services.



### Delegation

Even with [data federation](#data-federation) in place, there are still several scenarios where we need to reach out to remote services on demand. Value helps are a prime example for that; for example, to select `Customers` from a drop-down list when creating new travels. Although we could serve that from replicated data as well, this would require replicating **_all_** relevant customer data locally, which is often overkill.

The code below shows how we simply delegate value help requests for `Customers` in xtravels to the connected S/4 service:

::: code-group
```js [srv/travel-service.js]
this.on ('READ', Customers, req => s4.run (req.query))
```
:::

The event handler intercepts all direct `READ` requests to the `Customers` entity, and just forwards the query as-is to the connected S/4 service.

::: details Try this in `cds repl` ...

```shell :line-numbers=1
cds mock apis/capire/s4.cds
```
```shell :line-numbers=2
cds repl ./
```

Within the `cds repl` session in the second terminal, run this:

```js
await TravelService.read`ID, Name`.from`Customers`.limit(3)
```

This issues a `READ` request to the local `TravelService.Customers` entity, which is intercepted by the above event handler, and delegated to the remote S/4 service. The result comes back translated to the structure of the `Customers` consumption view:

```zsh
=> [
  { ID: '000001', Name: 'Mrs. Theresia Buchholm' },
  { ID: '000002', Name: 'Mr. Johannes Buchholm' },
  { ID: '000003', Name: 'Mr. James Buchholm' }
]
```

See the log output of in the first terminal where we `cds mock`ed the S/4 service to observe the translated OData request being received by the remote service:

```zsh
[odata] - GET /odata/v4/s4-business-partner/A_BusinessPartner {
  '$select': 'BusinessPartner,PersonFullName',
  '$top': '3'
}
```
:::


#### Automatic Query Translation

Note that for the handler above, incoming requests always refer to:

- the [`TravelService.Customers`](#serving-uis) entity – which is a view on:
  - the [`sap.capire.s4.Customers`](#consumption-views) entity – which in turn is a view on:
    - the [`A_BusinessPartner`](#odata-apis) remote entity.

In effect, we are delegating a query to the S/4 service, which refers to an entity actually not known to that remote service. How could that work at all?

It works because we fuelled the CAP runtime with CDS models, so the generic handlers detect such situations, and automatically translate delegated queries into valid queries targeted to underlying remote entities – i.e. `A_BusinessPartner` in our example. When doing so, all column references in select clauses, where clauses, etc., are translated and delegated as well, and the results' structure transformed back to that of the original target – i.e., `TravelService.Customers` above.



### Navigation

Automatic translation of delegated queries, [as shown above](#automatic-query-translation), has limitations when navigations and expands are involved.
Let's explore those limitations and how to deal with them on the example of the _Bookings -> Flights_ association.

Try running the following query in `cds repl`, with the xflights service mocked in a separate process, as before:

```js
const { Bookings } = cds.entities ('sap.capire.travels')
```
```js
await SELECT.from (Bookings) .where`Flight.origin like '%Ken%'`
```

- With data federation in place, this would work (if all flight data had been replicated).
- Without data federation, though, this would fail with a runtime error.

For that to really work cross-service – that is, without data federation, or bypassing it – we'd have to split the query, manually dispatch the parts to involved services, and correlate results back, for example, like this:

```js
await SELECT.from (Bookings) .where`Flight.ID in ${(
  await xflights.read`ID`.from`Flights`.where`origin.name like '%Ken%'`
).map (f => f.ID)}`
```
::: details
The above can also be written like that, of course:
```js
const flights = await xflights.read`ID`.from`Flights`.where`origin.name like '%Ken%'`
const flightIDs = flights.map (f => f.ID)
await SELECT.from (Bookings) .where`Flight.ID in ${flightIDs}`
```
:::

> [!tip] What is 'Navigation'?
> The term 'navigation' commonly refers to traversing associations between entities in queries. In CAP, this is typically expressed using [path expressions](../../cds/cql#path-expressions) along (chains of) associations – e.g., `flight.origin.name` –, which can show up in all query clauses (_select_, _from_, _where_, _order by_, and _group by_).


### Expands

Similar to navigations, expands across associations also require special handling when we cannot serve them from federated data. Try running the following query in `cds repl`, with the xflights service mocked in a separate process, as before:

```js
await SELECT.from (Bookings) .columns`{
  Flight { ID, date, destination }
}` .where`exists Flight` .limit(3)
```
::: details See results output ...
```zsh
=> [
  { Flight: { ID: 'SW1537', date: '2023-08-04', destination: 'Miami International Airport' } },
  { Flight: { ID: 'SW1537', date: '2023-08-04', destination: 'Miami International Airport' } },
  { Flight: { ID: 'SW1537', date: '2023-08-04', destination: 'Miami International Airport' } }
]
```
:::

To achieve the same without data federation, we'd have to manually fetch nested data from the remote service for each row, and fill it into the outer results, for example like this:

```js
await SELECT.from(Bookings).columns`Flight_ID, Flight_date`.limit(3)
.then (all => Promise.all (all.map (async b => ({
  Flight: await xflights.read`ID, date, destination.name as destination`
    .from`Flights`.where`ID = ${b.Flight_ID} and date = ${b.Flight_date}`
}))))
```

We can do similar things for expands across associations from remote data to local ones, for example like that:

```js
const { Customers } = cds.entities ('sap.capire.s4')
const { Travels } = cds.entities ('sap.capire.travels')
await s4.read(Customers).columns`{ ID, Name }`
.then (all => Promise.all (all.map (async c => Object.assign (c, {
  Travels: await SELECT`ID`.from(Travels).where`Customer.ID = ${c.ID}`
}))))
```



### Outboxed Emits

Use [_transactional outbox_](../../guides/events/event-queues) for write operations, which you want to take place reliably, but don't need the results in your current execution context. As in this event hander example:

::: code-group
```js :line-numbers=30 [srv/travel-service.js]
const xflights_ = cds.outboxed (xflights) // [!code focus]
this.after ('SAVE', Travels, ({ Bookings=[] }) => {
  return Promise.all (Bookings.map (booking => {
    let { Flight_ID: flight, Flight_date: date } = booking
    return xflights_.send ('POST', 'BookingCreated', { flight, date }) // [!code focus]
  }))
})
```
:::

- Line 29 – We create an _outboxed_ version of the connected xflights service.
- Line 34 – We use that outboxed service to send events to the xflights service.

This creates ultimate resilience, as the events are stored in a local outbox table within the same transaction as the `SAVE` operation on `Travels`. A separate process then takes care of reliably forwarding those events to the xflights service, retrying in case of failures, etc.



## Learn More

- [CAP-level Data Federation](data-federation) – Explore different patterns and strategies for data federation in CAP applications.

- [Inner Loop Development](inner-loops) – Understand how to develop and test integrated applications efficiently using CAP's inner loop development features.

<!--
- [Service Bindings](service-bindings) – Learn how to configure connections to external services in a declarative way using service bindings.
-->

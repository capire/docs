
# Inner-Loop Development

CAP promotes fast inner-loop development by allowing us to easily swap production-grade services with local mocks during development, without any changes to CDS models nor implementations. Similar in the context of application service integration, imported APIs of remote services and applications can be mocked out of the box in consuming applications. This in turn greatly promotes decoupled parallel development of distributed teams working on different microservices.
{.abstract}

[[toc]]



## Preliminaries

### What is Inner Loop?

![inner-loop-turntable](assets/inner-loop-turntable.png){.ignore-dark style="width:50%; border-radius: 22px; float: right; margin-top: -3em"} 

Many of us likely remember that turntable thing in the playgrounds: stay close to the center – the inner loop –, and it rotates at ultimate speed, lean out and it slows down. 

We see similar effects when we have to run through full *code - build - deploy* cycles to see the effects of our work in cloud development. And it's not only the turnaround times for individual developers, it's also the runtime for tests, the operating costs induced by both, the impact on support (local setups allow to reproduce things, complex setups don't), up to severe resilience issues (whenever a cloud service isn't available development stops for whole teams). 

Here's a very rough comparison from a real world example:

| Aspect                            | Cloud-Based | Local Inner Loop |  Gain  |
|-----------------------------------|:-----------:|:----------------:|:------:|
| Turnaround times                  |   6+ min    |      2 sec       | > 100x |
| Test pipelines                    |   40+ min   |      4 min       | > 10x  |
| Support time to reproduce/resolve | hours, days |     minutes      | > 10x  |
| Resilience re service outages     |    poor     |     ultimate     |        |
| Operating costs / TCD             |    high     |       low        |        |



### The XTravels Sample

We'll use the same [XTravels sample](calesi.md#the-xtravels-sample) and setup as in the [_CAP-level Service Integration_](calesi.md) guide. If you haven't done so already, clone the required repositories to follow along:

```sh :line-numbers
mkdir -p cap/samples
cd cap/samples
git clone https://github.com/capire/xtravels 
git clone https://github.com/capire/xflights
git clone https://github.com/capire/s4
echo '{"workspaces":["xflights","xtravels","s4"]}' > package.json
npm install
```

[@capire/xtravels]: https://github.com/capire/xtravels
[@capire/xflights]: https://github.com/capire/xflights
[@capire/s4]: https://github.com/capire/s4

> [!note]
>
> Line 6 above turns the `cap/samples` folder into a root for `npm workspaces`. For the time being this simply optimizes the `npm install`. We'll revisit that in chapter [*Using `npm` Workspaces*](#using-npm-workspaces) below. 



## Mocked Out of the Box

Within the context of application service integration and microservice architecture, we'd need to mock remote services in a consuming app to reach inner loop. CAP greatly does that for us, based on: 

- A CDS service definition is all we need to serve a fully functional OData service
- APIs imported via `cds export` and `cds import` are CDS service definition
- ⇒ CAP can serve/mock remote APIs out of the box

Let's demonstrate that within the xtravels project...



### In-Process, Shared DB – `cds watch`

With mashed up models in place, we can run applications in _'airplane mode'_ without upstream services running. CAP mocks imported services automatically _in-process_ with mock data in the same _in-memory_ database as our own data.

1. Start the xtravels application locally using `cds watch` as usual, and note the output about the integrated services being mocked automatically:

   ```shell :line-numbers=1
   cds watch
   ```

   ```zsh
   [cds] - mocking sap.capire.s4.business-partner {
     at: [ '/odata/v4/s4-business-partner' ],
     decl: 's4/external/API_BUSINESS_PARTNER.csn:7'
   }
   ```

   ```zsh
   [cds] - mocking sap.capire.flights.data {
     at: [ '/odata/v4/data', '/rest/data', '/hcql/data' ],
     decl: 'xflights/apis/data-service/services.csn:3'
   }
   ```

2. Open the Fiori UI in the browser -> it displays data from both, local and imported entities, seamlessly integrated as shown in the screenshot below (the data highlighted in green is mocked data from `@capire/s4`).

![XTravels Fiori list view showing a table of travel requests, with the Customer highlighted in green.](assets/xtravels-list.png)



### Separate Processes – `cds mock`

###### cds-mock

We can also use `cds mock` to mock remote services in separate processes, which brings us closer to the target setup:

1. From within the xtravels project's root folder `cap/samples/xtravels`, start by mocking the remote services in separate terminals, then start xtravels server in a third terminal:

    ```shell :line-numbers=1
    cds mock apis/capire/xflights.cds
    ```
    ```shell :line-numbers=2
    cds mock apis/capire/s4.cds
    ```
    ```shell :line-numbers=3
    cds watch
    ```
    Note in the log output of the xtravels server that it now _connects_ to the other services instead of mocking them:
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



> [!tip] Mocking for Inner-Loop Development
> A service definition is all we need to serve fully functional CAP services via OData or HCQL. Hence, service APIs imported via `cds import` are automatically mocked by CAP runtimes during development. This allows us to develop and test integrated applications in fast inner loops, without the need to connect to real remote services.

> [!tip] Decoupled Development → Contracts First
>
> Local inner loops allow promote decoupled development of separate parts / applications / microservices in larger solution projects. Each team can focus on their local domain and functionality with the required remote services mocked for them based on imported APIs. These APIs are the contracts between the individual teams.

> [!tip] Fast-track Inner-Loop Development → Spawning Parallel Tracks
>
> The mocked-out-of-the-box capabilities of CAP, with remoted services mocked in-process and a shared in-memory database, allows us to greatly speed up development and time to market. For real remote operations there is additional investment required, of course. But the agnostic nature of CAP-level Service Integration also allows you to spawn two working tracks running in parallel: One team to focus on domain and functionality, and another one to work on the integration logic under the hood.



### Providing Mock Data 

There are different options to provide initial data, test data, and mock data:

- In case of `@capire/xflights-data`, we generated the package content using `cds export --data` option, which added `.csv` files next to the `.cds` files. 
- In case of `@capire/s4`, we explicitly added `.csv` files next to the `.cds` files. 
- In addition, we could add `.csv` files for imported entities in the consuming apps `db/data` or `test/data` folders.

In all cases, the `.csv` files are placed next to the `.cds` files, and hence they are automatically detected and loaded into the in-memory database.  

For Java, make sure to add the `--with-mocks` option to the `cds deploy` command used to generate the `schema.sql` in `srv/pom.xml`. This ensures that tables for the mocked remote entities are created in the database.

[Learn more about *Adding Initial Data*](../databases/initial-data) {.learn-more}





## Run with Real Services 

Instead of mocking required services by the imported APIs [using `cds mock` as shown above](#cds-mock), we can also run the real *xflights* service from its respective home folder which we [cloned already in the beginning](#the-xtravels-sample). We can combine that with `s4` still mocked from the imported API, as above.

Do so by running the following commands from within the `cap/samples` root folder in separate terminals, and in that order:

```shell :line-numbers=1
cd xtravels; cds mock apis/capire/s4.cds
```
```shell :line-numbers=2
cds watch xflights
```
```shell :line-numbers=3
cds watch xtravels
```

In the log output of the xtravels server we should see that it _connects_ to the other services, in the same way as above:
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

[Go on as above...](#cds-mock)



## Test-drive w/ `cds repl`

We can use `cds repl` to experiment the options to send requests and queries to remote services interactively. Do so as follows...

From within the xtravels project's root folder `cap/samples/xtravels`, start by mocking the remote services in separate terminals, then start xtravels server within `cds repl` (instead of `cds watch`) in a third terminal:

```shell :line-numbers=1
cd xtravels; cds mock apis/capire/s4.cds
```

```shell :line-numbers=2
cds watch xflights
```

```shell :line-numbers=3
cds repl xtravels
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

Read the same data via the `sap.capire.s4.Customers` consumption view:

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

CRUD some data into remote `A_BusinessPartner` entity, still via the `sap.capire.s4.Customers` consumption view:

```js
await s4.insert ({ ID: '123', Name: 'Sherlock' }) .into (Customers)
await s4.create (Customers, { ID: '456', Name: 'Holmes' })
await s4.read`ID, Name` .from (Customers) .where`length(ID) <= 3`
await s4.update (Customers,'123') .with ({ modifiedAt: '2026-01-01' })
await s4.delete (Customers,'123')
await s4.delete (Customers) .where`ID = ${'456'}`
```

Go on like that and try out similar requests with the other services, that is, `TravelService` and `xflights`. For the latter you might run into `401` errors, in that case run the following once in the REPL to run in privileged mode: 

```js
cds.User.default = cds.User.privileged
```






## Using `npm` Workspaces

So far we assumed we mainly wirked within the *xtravels* project, and we consumed thte APIs from xflights via `npm publish` / `npm install` . There might be situations where we would want to shortcut this process. For example, we might want to consume a very latest version of the xflights API, which is not yet published to the *npm* registry. Or we might even want to work on both projects simultaneously, and test our latest changes to *xflights* in *xtravels* in close loops. 

So, in essence, instead of exercising a workflow like that again and again:

- ( *develop* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )

... we can use *npm workspaces* technique to work locally and speed up things as follows (we did that already above, shown here again for local completeness):

```shell 
mkdir -p cap/samples; cd cap/samples
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

> [!tip]
>
> So, using `npm` workspaces we've streamlined our workflows as follows:
>
> - Before: ( *change* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )
> - After: ( *change* → *export* ) → ( *consume* )



## Using Proxy Packages

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



> [!tip]
>
> So, in total, we've streamlined our workflows as follows:
>
> - Before: ( *change* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )
> - Step 1: ( *change* → *export* ) → ( *consume* )
> - Step 2: ( *change* ) → ( *consume* )

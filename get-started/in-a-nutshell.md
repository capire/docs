---
notebook: true
status: released
uacp: This page is linked from the Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/29c25e504fdb4752b0383d3c407f52a6.html
impl-variants: true
---


# Getting Started in a Nutshell
Build Your First App with CAP {.subtitle}





[[toc]]



::: details Optionally clone sample from GitHub ...

The sections below describe a hands-on walkthrough, in which you'd create a new project and fill it with content step by step. Alternatively, you can fast forward and get the final sample content from GitHub as follows:

::: code-group

```sh [Node.js]
git clone https://github.com/capire/bookshop
cd bookshop
npm install
```

```sh [Java]
git clone https://github.com/sap-samples/cloud-cap-samples-java bookshop
```

Note: When comparing the code from the repo in GitHub to the snippets given in the sections below you will recognise additions showcasing enhanced features. So, what you find in there is a superset of what we describe in this getting started guide.

:::



## Jumpstart a Project {#jumpstart}



After you completed the [*Initial Setup*](./), you jumpstart a project as follows:

- Create a new project using `cds init`

   <span class="impl node">

   ```sh [Node.js]
   cds init bookshop
   ```

   </span>

   <span class="impl java">

   ```sh [Java]
   cds init bookshop --java --java:mvn -DgroupId=com.sap.capire
   ```

   </span>

- Open the project in VS Code

   ```sh
   code bookshop
   ```
   [Assumes you activated the `code` command on macOS as documented](/tools/cds-editors#vscode) {.learn-more}

   For Java development in VS Code you need to [install extensions](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-pack). {.learn-more .java}


- Run the following command in an [*Integrated Terminal*](https://code.visualstudio.com/docs/terminal/basics)

   <span class="impl node">

   ```sh [Node.js]
   cds watch
   ```

   </span>

   <span class="impl java">

   ```sh [Java]
   cd srv && mvn cds:watch
   ```

   </span>

   ::: details `cds watch` is waiting for things to come...

   ```log
   [dev] cds w

   cds serve all --with-mocks --in-memory?
   live reload enabled for browsers

         ___________________________

   No models found in db/,srv/,app/,schema,services. // [!code focus]
   Waiting for some to arrive... // [!code focus]

   ```

   So, let's go on feeding it...

   :::




## Capture Domain Models


Let's feed our project by adding a simple domain model. Start by creating a file named _db/schema.cds_ and copy the following definitions into it:

::: code-group

```cds [db/schema.cds]
using { Currency, managed, sap } from '@sap/cds/common';
namespace sap.capire.bookshop; // [!code focus]

entity Books : managed { // [!code focus]
  key ID : Integer;
  title  : localized String(111);
  descr  : localized String(1111);
  author : Association to Authors;
  genre  : Association to Genres;
  stock  : Integer;
  price  : Decimal(9,2);
  currency : Currency;
}

entity Authors : managed { // [!code focus]
  key ID : Integer;
  name   : String(111);
  books  : Association to many Books on books.author = $self;
}

/** Hierarchically organized Code List for Genres */
entity Genres : sap.common.CodeList { // [!code focus]
  key ID   : Integer;
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
}

```
:::

_Find this source also in the GitHub repos [for Node.js](https://github.com/capire/bookshop/tree/main/db/schema.cds), and [for Java](https://github.com/sap-samples/cloud-cap-samples-java/blob/main/db/books.cds)_{ .learn-more}
[Learn more about **Domain Modeling**.](../guides/domain-modeling){ .learn-more}
[Learn more about **CDS Modeling Languages**.](../cds/){ .learn-more}


### Deployed to Databases {#deployed-in-memory}

<span class="impl node">

As soon as you save the *schema.cds* file, the still running `cds watch` reacts immediately with new output like this:

```log
[cds] - connect to db > sqlite { url: ':memory:' }
/> successfully deployed to in-memory database.
```

This means that `cds watch` detected the changes in _db/schema.cds_ and automatically bootstrapped an in-memory _SQLite_ database when restarting the server process.

</span>

<span class="impl java">

As soon as you save your CDS file, the still running `mvn cds:watch` command reacts immediately with a CDS
compilation and reload of the CAP Java application. The embedded database of the started application will reflect the schema defined in your CDS file.

</span>

### Compiling Models {#cli}

We can optionally test-compile models individually to check for validity and produce a parsed output in [CSN format](../cds/csn). For example, run this command in a new terminal:

```sh
cds db/schema.cds
```

This dumps the compiled CSN model as a plain JavaScript object to stdout. <br>
Add `--to <target>` (shortcut `-2`) to produce other outputs, for example:

```sh
cds db/schema.cds -2 json
cds db/schema.cds -2 yml
cds db/schema.cds -2 sql
```

[Learn more about the command line interface by executing `cds help`.](../tools/cds-cli#cds-help){.learn-more}



## Providing Services {#services}


<span class="impl node">

After the recent changes, `cds watch` also prints this message:

```log
No service definitions found in loaded models.
Waiting for some to arrive...
```

</span>

<span class="impl java">

After the recent changes, the running CAP Java application is still not exposing any service endpoints.

</span>

So, let's go on feeding it with two service definitions for different use cases:

An `AdminService` for administrators to maintain `Books` and `Authors`.

A `CatalogService` for end users to browse and order `Books` under path `/browse`.

To do so, create the following two files in folder _./srv_ and fill them with this content:

::: code-group
```cds [srv/admin-service.cds]
using { sap.capire.bookshop as my } from '../db/schema';
service AdminService @(requires:'authenticated-user') { // [!code focus]
  entity Books as projection on my.Books;
  entity Authors as projection on my.Authors;
}
```
```cds [srv/cat-service.cds]
using { sap.capire.bookshop as my } from '../db/schema';
service CatalogService @(path:'/browse') { // [!code focus]

  @readonly entity Books as select from my.Books {*,
    author.name as author
  } excluding { createdBy, modifiedBy };

  @requires: 'authenticated-user'
  action submitOrder (book: Books:ID, quantity: Integer);
}
```
:::

*Find this source also on GitHub [for Node.js](https://github.com/capire/bookshop/tree/main/srv), and [for Java](https://github.com/sap-samples/cloud-cap-samples-java/blob/main/srv)*{.learn-more}

[Learn more about **Defining Services**.](../guides/providing-services){ .learn-more}



### Served via OData

<span class="impl node">

This time `cds watch` reacted with additional output like this:

```log
[cds] - serving AdminService {
  at: [ '/admin' ],
  decl: 'srv/admin-service.cds:2',
  impl: 'srv/admin-service.js'
}
[cds] - serving CatalogService {
  at: [ '/browse', '/rest/catalog', '/hcql/catalog' ],
  decl: 'srv/cat-service.cds:4',
  impl: 'srv/cat-service.js'
}
[cds] - server listening on { url: 'http://localhost:4004' }
```

As you can see, the two service definitions have been compiled and generic service providers have been constructed to serve OData requests on the listed endpoints _/admin_ and _/browse_.

</span>

<span class="impl java">

In case the CDS service definitions were compiled correctly the Spring Boot runtime is reloaded automatically and should output a log line like this:

```log
c.s.c.services.impl.ServiceCatalogImpl : Registered service AdminService
c.s.c.services.impl.ServiceCatalogImpl : Registered service CatalogService
```

As you can see in the log output, the two service definitions have been compiled and generic service providers have been constructed to serve requests on the listed endpoints _/odata/v4/AdminService_ and _/odata/v4/browse_.

::: warning Add the dependency to spring-boot-security-starter
Both services defined above contain security annotations that restrict access to certain endpoints. Please add the dependency to spring-boot-security-starter to the _srv/pom.xml_ in order to activate mock user and authentication support:

```sh
mvn com.sap.cds:cds-maven-plugin:add -Dfeature=SECURITY
```

:::

</span>


> [!tip]
>
>  CAP-based services are full-fledged OData services out of the box. Without adding any provider implementation code, they translate OData request into corresponding database requests, and return the results as OData responses.

[Learn more about **Generic Providers**.](../guides/providing-services){.learn-more}



### Generating APIs

We can optionally also compile service definitions explicitly, for example to [OData EDMX metadata documents](https://docs.oasis-open.org/odata/odata/v4.0/odata-v4.0-part3-csdl.html):

```sh
cds srv/cat-service.cds -2 edmx
```

Essentially, using a CLI, this invokes what happened automatically behind the scenes in the previous steps.
While we don't really need such explicit compile steps, you can do this to test correctness on the model level, for example.


### Generic *index.html*

<span class="impl node">

Open _<http://localhost:4004>_ in your browser and see the generic _index.html_ page:

![Generic welcome page generated by CAP that list all endpoints. Eases jumpstarting development and is not meant for productive use.](assets/welcome.png){style="width:450px; box-shadow: 1px 1px 5px #888888"}

> Note: User `alice` is a [default user with admin privileges](../node.js/authentication#mocked). Use it to access the _/admin_ service. You don't need to enter a password.

</span>

<span class="impl java">

Open _<http://localhost:8080>_ in your browser and see the generic _index.html_ page:

![Generic welcome page generated by CAP that list all endpoints. Eases jumpstarting development and is not meant for productive use.](./assets/welcome-java.png)

> Note: User `authenticated` is a [prepared mock user](../java/security#mock-users) which will be authenticated by default. Use it to access the _/admin_ service. You don't need to enter a password.

</span>





## Using Databases {#databases}

### SQLite In-Memory {.impl .node}

As [previously shown](#deployed-in-memory), `cds watch` automatically bootstraps an SQLite in-process and in-memory database by default — that is, unless told otherwise. While this **isn't meant for productive use**, it drastically speeds up development turn-around times, essentially by mocking your target database, for example, SAP HANA. {.impl .node}


### H2 In-Memory {.impl .java}

As [previously shown](#deployed-in-memory), `mvn cds:watch` automatically bootstraps an H2 in-process and in-memory database by default — that is, unless told otherwise. While this **isn't meant for productive use**, it drastically speeds up turn-around times in local development and furthermore allows self-contained testing. {.impl .java}

### Adding Initial Data

Now, let's fill your database with initial data by adding a few plain CSV files under _db/data_ like this:

::: code-group

```csvc [db/data/sap.capire.bookshop-Books.csv]
ID,title,author_ID,stock
201,Wuthering Heights,101,12
207,Jane Eyre,107,11
251,The Raven,150,333
252,Eleonora,150,555
271,Catweazle,170,22
```
```csvc [db/data/sap.capire.bookshop-Authors.csv]
ID,name
101,Emily Brontë
107,Charlotte Brontë
150,Edgar Allen Poe
170,Richard Carpenter
```
:::



::: details `cds add data` can help you with the file and record generation
Create empty CSV files with header lines only:

```sh
cds add data
```

Create CSV files that already include some sample data:

```sh
cds add data --records 10
```
[Find the full set of options here.](../tools/cds-cli.md#data){.learn-more}
:::


<span class="impl node">

After you've added these files, `cds watch` restarts the server with output, telling us that the files have been detected and their content has been loaded into the database automatically:

```log
[cds] - connect to db > sqlite { url: ':memory:' }
 > init from db/init.js
 > init from db/data/sap.capire.bookshop-Authors.csv
 > init from db/data/sap.capire.bookshop-Books.csv
 > init from db/data/sap.capire.bookshop-Books_texts.csv
 > init from db/data/sap.capire.bookshop-Genres.csv
/> successfully deployed to in-memory database.
```

</span>

<span class="impl java">

After you've added these files, `mvn cds:watch` restarts the server with output, telling us that the files have been detected and their content has been loaded into the database automatically:

```log
c.s.c.s.impl.persistence.CsvDataLoader   : Filling sap.capire.bookshop.Books from db/data/sap.capire.bookshop-Authors.csv
c.s.c.s.impl.persistence.CsvDataLoader   : Filling sap.capire.bookshop.Books from db/data/sap.capire.bookshop-Books.csv
```

</span>

[Learn more about **Using Databases**.](../guides/databases){.learn-more}


### Querying via OData

Now that we have a connected, fully capable SQL database, filled with some initial data, we can send complex OData queries, served by the built-in generic providers:

- _[…/Books?$select=ID,title](http://localhost:4004/browse/Books?$select=ID,title)_ {.impl .node}
- _[…/Authors?$search=Bro](http://localhost:4004/odata/v4/admin/Authors?$search=Bro)_ {.impl .node}
- _[…/Authors?$expand=books($select=ID,title)](http://localhost:4004/odata/v4/admin/Authors?$expand=books($select=ID,title))_ {.impl .node}
- _[…/Books?$select=ID,title](http://localhost:8080/odata/v4/browse/Books?$select=ID,title)_ {.impl .java}
- _[…/Authors?$search=Bro](http://localhost:8080/odata/v4/AdminService/Authors?$search=Bro)_ {.impl .java}
- _[…/Authors?$expand=books($select=ID,title)](http://localhost:8080/odata/v4/AdminService/Authors?$expand=books($select=ID,title))_ {.impl .java}

> Note: Use [_alice_](../node.js/authentication#mocked) as user to query the `admin` service. You don't need to enter a password. {.impl .node}

> Note: Use [_authenticated_](../java/security#mock-users) to query the `admin` service. You don't need to enter a password. {.impl .java}

[Learn more about **Generic Providers**.](../guides/providing-services){.learn-more}
[Learn more about **OData's Query Options**.](../advanced/odata){.learn-more}



### Persistent Databases {.impl .node}

Instead of in-memory databases we can also use persistent ones. For example, still with SQLite, add the following configuration:


::: code-group

```json [package.json]
{
  "cds": {
    "requires": {
      "db": {
          "kind": "sqlite",
          "credentials": { "url": "db.sqlite" } // [!code focus]
      }
    }
  }
}
```

:::

Then deploy:

```sh
cds deploy
```

The difference from the automatically provided in-memory database is that we now get a persistent database stored in the local file _./db.sqlite_. This is also recorded in the _package.json_.

::: details To see what that did, use the `sqlite3` CLI with the newly created database.
```sh
sqlite3 db.sqlite .dump
sqlite3 db.sqlite .tables
```
:::

[Learn how to install SQLite on Windows.](troubleshooting#how-do-i-install-sqlite-on-windows){.learn-more}

:::details You could also deploy to a provisioned SAP HANA database using this variant.
```sh
cds deploy --to hana
```
:::

[Learn more about deploying to SAP HANA.](../guides/databases){.learn-more .impl .node}



## Serving UIs {#uis}


You can consume the provided services, for example, from UI frontends, using standard AJAX requests.
Simply add an _index.html_ file into the _app/_ folder, to replace the generic index page.


### SAP Fiori UIs {#fiori}

CAP provides out-of-the-box support for SAP Fiori UIs, for example, with respect to SAP Fiori annotations and advanced features such as search, value helps and SAP Fiori Draft.

![Shows the famous bookshop catalog service in an SAP Fiori UI.](assets/fiori-app.png)

[Learn more about **Serving Fiori UIs**.](../advanced/fiori){.learn-more}


### Vue.js UIs {#vue .impl .node}

Besides Fiori UIs, CAP services can be consumed from any UI frontends using standard AJAX requests.
For example, you can [find a simple Vue.js app in the GitHub repo](https://github.com/capire/bookshop/tree/main/app/vue), which demonstrates browsing and ordering books using OData requests to [the `CatalogService` API we defined above](#services). {.impl .node}

![Shows the famous bookshop catalog service in a simple Vue.js UI.](assets/vue-app.png){style="margin:0" .impl .node .adapt}



## Adding Custom Logic



While the generic providers serve most CRUD requests out of the box, you can add custom code to deal with the specific domain logic of your application.



### Service Implementations

In Node.js, the easiest way to provide implementations for services is through equally named _.js_ files placed next to a service definition's _.cds_ file: {.impl .node}

<span class="impl node">

```zsh
bookshop/
├─ srv/
│ ├─ ...
│ ├─ cat-service.cds # [!code focus]
│ └─ cat-service.js # [!code focus]
└─ ...
```

[See these files also in the GitHub repo.](https://github.com/capire/bookshop/tree/main/srv){.learn-more}
[Learn more about providing service implementations **in Node.js**.](../node.js/core-services#implementing-services){.learn-more .impl .node}
[Learn also **how to do that in Java** using Event Handler Classes.](../java/event-handlers/#handlerclasses){.learn-more .impl .java}

You can have this _.js_ file created automatically with [`cds add handler`](../tools/cds-cli#handler). {.learn-more}

</span>

<span class="impl java">

In CAP Java, you can add custom handlers for your service as so called EventHandlers. As CAP Java integrates with Spring Boot, you need to provide your custom code in classes, annotated with `@Component`, for example. Use your favorite Java IDE to add a class like the following to the `srv/src/main/java/` folder of your application. {.impl .java}

::: code-group
```java [srv/src/main/java/com/sap/capire/bookshop/handlers/CatalogServiceHandler.java]
@Component
@ServiceName(CatalogService_.CDS_NAME)
public class CatalogServiceHandler implements EventHandler {
  // your custom code will go here
}
```
:::

::: tip
Place the code in your package of choice and use your IDE to generate the needed `import` statements.
:::

</span>



### Adding Event Handlers

Service implementations essentially consist of one or more event handlers.

<span class="impl node">

Copy this into _srv/cat-service.js_ to add custom event handlers:

::: code-group
```js [srv/cat-service.js]
const cds = require('@sap/cds')
class CatalogService extends cds.ApplicationService { init() {
  const { Books } = cds.entities('CatalogService')

  // Register your event handlers in here, for example:  // [!code focus]
  this.after ('each', Books, book => { // [!code focus]
    if (book.stock > 111) { // [!code focus]
      book.title += ` -- 11% discount!` // [!code focus]
    } // [!code focus]
  }) // [!code focus]

  return super.init()
}}
module.exports = CatalogService
```
:::

[Learn more about adding **event handlers** using `<srv>.on/before/after`.](../node.js/core-services#srv-on-before-after){.learn-more}

</span>

<span class="impl java">

Now that you have created the classes for your custom handlers it's time to add the actual logic. You can achieve this by adding methods annotated with CAP's `@Before`,  `@On`, or `@After` to your new class. The annotation takes two arguments: the event that shall be handled and the entity name for which the event is handled.

::: code-group
```java [srv/src/main/java/com/sap/capire/bookshop/handlers/CatalogServiceHandler.java]
  @After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
  public void addDiscountIfApplicable(List<Books> books) {
    for (Books book : books) {
      if (book.getStock() != null && book.getStock() > 111) {
        book.setTitle(book.getTitle() + " -- 11% discount!");
      }
    }
  }
```
:::

:::details Code including imports
::: code-group
```java [srv/src/main/java/com/sap/capire/bookshop/handlers/CatalogServiceHandler.java]
package com.sap.capire.bookshop.handlers;

import java.util.List;
import org.springframework.stereotype.Component;
import com.sap.cds.services.cds.CqnService;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.After;
import com.sap.cds.services.handler.annotations.ServiceName;
import cds.gen.catalogservice.Books;
import cds.gen.catalogservice.Books_;
import cds.gen.catalogservice.CatalogService_;

@Component
@ServiceName(CatalogService_.CDS_NAME)
public class CatalogServiceHandler implements EventHandler {
  @After(event = CqnService.EVENT_READ, entity = Books_.CDS_NAME)
  public void addDiscountIfApplicable(List<Books> books) {
    for (Books book : books) {
      if (book.getStock() != null && book.getStock() > 111) {
        book.setTitle(book.getTitle() + " -- 11% discount!");
      }
    }
  }
}
```
:::


[Learn more about **event handlers** in the  CAP Java documentation.](../java/event-handlers/#handlerclasses){.learn-more}

</span>



### Consuming Other Services

Quite frequently, event handler implementations consume other services, sending requests and queries, as in the completed example below.

<span class="impl node">

::: code-group
```js [srv/cat-service.js]
const cds = require('@sap/cds')
class CatalogService extends cds.ApplicationService { async init() {

  const db = await cds.connect.to('db') // connect to database service
  const { Books } = db.entities         // get reflected definitions

  // Reduce stock of ordered books if available stock suffices
  this.on ('submitOrder', async req => {
    const {book,quantity} = req.data
    const n = await UPDATE (Books, book)
      .with ({ stock: {'-=': quantity }})
      .where ({ stock: {'>=': quantity }})
    n > 0 || req.error (409,`${quantity} exceeds stock for book #${book}`)
  })

  // Add some discount for overstocked books
  this.after ('each','Books', book => {
    if (book.stock > 111) book.title += ` -- 11% discount!`
  })

  return super.init()
}}
module.exports = CatalogService
```
:::
</span>

<span class="impl java">

::: code-group
```java [srv/src/main/java/com/sap/capire/bookshop/handlers/SubmitOrderHandler.java]
@Component
@ServiceName(CatalogService_.CDS_NAME)
public class SubmitOrderHandler implements EventHandler {

  private final PersistenceService persistenceService;

  public SubmitOrderHandler(PersistenceService persistenceService) {
    this.persistenceService = persistenceService;
  }

  @On
  public void onSubmitOrder(SubmitOrderContext context) {
    Select<Books_> byId = Select.from(cds.gen.catalogservice.Books_.class).byId(context.getBook());
    Books book = persistenceService.run(byId).single().as(Books.class);
    if (context.getQuantity() > book.getStock())
      throw new IllegalArgumentException(context.getQuantity() + " exceeds stock for book #" + book.getTitle());
    book.setStock(book.getStock() - context.getQuantity());
    persistenceService.run(Update.entity(Books_.CDS_NAME).data(book));
    context.setCompleted();
  }
}
```
:::

:::details Code including imports
::: code-group
```java [srv/src/main/java/com/sap/capire/bookshop/handlers/CatalogService.java]
package com.sap.capire.bookshop.handlers;

import org.springframework.stereotype.Component;
import com.sap.cds.ql.Select;
import com.sap.cds.ql.Update;
import com.sap.cds.services.handler.EventHandler;
import com.sap.cds.services.handler.annotations.On;
import com.sap.cds.services.handler.annotations.ServiceName;
import com.sap.cds.services.persistence.PersistenceService;
import cds.gen.catalogservice.Books;
import cds.gen.catalogservice.Books_;
import cds.gen.catalogservice.CatalogService_;
import cds.gen.catalogservice.SubmitOrderContext;

@Component
@ServiceName(CatalogService_.CDS_NAME)
public class SubmitOrderHandler implements EventHandler {

  private final PersistenceService persistenceService;

  public SubmitOrderHandler(PersistenceService persistenceService) {
    this.persistenceService = persistenceService;
  }

  @On
  public void onSubmitOrder(SubmitOrderContext context) {
    Select<Books_> byId = Select.from(cds.gen.catalogservice.Books_.class).byId(context.getBook());
    Books book = persistenceService.run(byId).single().as(Books.class);
    if (context.getQuantity() > book.getStock())
      throw new IllegalArgumentException(context.getQuantity() + " exceeds stock for book #" + book.getTitle());
    book.setStock(book.getStock() - context.getQuantity());

    persistenceService.run(Update.entity(Books_.CDS_NAME).data(book));

    context.setCompleted();
  }
}


```
:::

</span>

[Find this source also in the GitHub repo.](https://github.com/capire/bookshop/tree/main/srv/cat-service.js){ .learn-more .impl .node target="_blank"}
[Find this source also in the GitHub repo.](https://github.com/sap-samples/cloud-cap-samples-java/blob/main/srv/src/main/java/my/bookshop/handlers/CatalogServiceHandler.java#L166){ .impl .java .learn-more target="_blank"}
[Learn more about **connecting to services** using `cds.connect`.](../node.js/cds-connect){ .learn-more .impl .node}
[Learn more about **connecting to services** using `@Autowired`, `com.sap.cds.ql`, etc.](../java/services){.learn-more .impl .java}
[Learn more about **reading and writing data** using `cds.ql`.](../node.js/cds-ql){ .learn-more .impl .node}
[Learn more about **reading and writing data** using `cds.ql`.](../java/working-with-cql/query-api){ .learn-more .impl .java}
[Learn more about **using reflection APIs** using `<srv>.entities`.](../node.js/core-services#entities){ .learn-more .impl .node}
[Learn more about **typed access to data** using the CAP Java SDK.](../java/cds-data#typed-access){ .learn-more .impl .java}

**Test this implementation**, [for example using the Vue.js app](#vue), and see how discounts are displayed in some book titles. {.impl .node}

### Sample HTTP Requests

Test the implementation by submitting orders until you see the error messages. Create a file called _test.http_ and copy the request into it.

<span class="impl node">

::: code-group

```http [test.http]
### Submit Order
POST http://localhost:4004/browse/submitOrder
Content-Type: application/json
Authorization: Basic alice:

{
  "book": 201,
  "quantity": 2
}
```

:::

</span>

<span class="impl java">

::: code-group

```http [test.http]
### Submit Order
POST http://localhost:8080/odata/v4/browse/submitOrder
Content-Type: application/json
Authorization: Basic authenticated:

{
  "book": 201,
  "quantity": 2
}
```

:::

</span>


## Summary

With this getting started guide we introduced many of the basics of CAP, such as:

- [Domain Modeling](../guides/domain-modeling)
- [Providing Services](../guides/providing-services)
- [Consuming Services](../guides/using-services)
- [Using Databases](../guides/databases)
- [Serving UIs](../advanced/fiori)

Visit the [***Cookbook***](../guides/) for deep dive guides on these topics and more. Also see the reference documentations for [***CDS***](../cds/), as well as [***Node.js***](../node.js/) and [***Java***](../java/) Service SDKs and runtimes.

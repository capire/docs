
# Inner-Loop Development

## Mocked Out of the Box

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

> [!tip] Mocking for Inner-Loop Development
> A service definition is all we need to serve fully functional OData services. Hence, service APIs imported via `cds import` are automatically mocked by CAP runtimes during development. This allows us to develop and test integrated applications in fast inner loops, without the need to connect to real remote services.\
> See also: [_Inner-Loop Development_](#inner-loop-development) section further below.

> [!tip] Decoupled Inner-Loop Development
> CAP runtimes automatically mock imported service APIs during development, allowing us to develop and test integrated applications in fast inner loops, without the need to connect to real remote services. This decouples inner-loop development from external dependencies, speeding up development and increasing resilience.  



## Providing Mock Data 

There are different options to provide initial data, test data, and mock data:

- In case of `@capire/xflights-data`, we generated the package content using `cds export --data` option, which added `.csv` files next to the `.cds` files. 
- In case of `@capire/s4`, we explicitly added `.csv` files next to the `.cds` files. 
- In addition, we could add `.csv` files for imported entities in the consuming apps `db/data` or `test/data` folders.

In all cases, the `.csv` files are placed next to the `.cds` files, and hence they are automatically detected and loaded into the in-memory database.  

For Java, make sure to add the `--with-mocks` option to the `cds deploy` command used to generate the `schema.sql` in `srv/pom.xml`. This ensures that tables for the mocked remote entities are created in the database.

[Learn more about *Adding Initial Data*](../databases/initial-data) {.learn-more}

## Using `cds mock`

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

This is because the CAP runtime now detected that services with that name are served by different processes within our local binding environment now, so we don't mock them in-process any longer.



## Test in `cds repl`



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




## Using Workspaces

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

Which means we've streamlined our workflows as follows:

- Before: ( *change* → *export* → *publish* ) → *npmjs.com* → ( *update* → *consume* )
- Step 1: ( *change* → *export* ) → ( *consume* )
- Step 2: ( *change* ) → ( *consume* )

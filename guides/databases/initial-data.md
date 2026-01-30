# Adding Initial Data

You can add `.csv` files to fill your database with initial data and test data. The runtime automatically loads these files whenever you bootstrap a database, run `cds watch` in development, or deploy and upgrade for production.
{.abstract}

[[toc]]


## Using `cds add data`

Use `cds add data` to generate empty `.csv` files, with column headers based on the entities in your CDS model. For example, if you run this in the [*@capire/bookshop*](../../get-started/bookshop) sample project, you can see the following output:

```shell
cds add data
```
```zsh
Adding facet: data

  creating db/data/sap.capire.bookshop-Authors.csv
  creating db/data/sap.capire.bookshop-Books.csv
  creating db/data/sap.capire.bookshop-Books.texts.csv
  creating db/data/sap.capire.bookshop-Genres.csv
  creating db/data/sap.capire.bookshop-Genres.texts.csv

Successfully added features to your project
```

By default, the command generates the files in the _db/data_ folder of your project structure:

```zsh
cap/bookshop/
├── db/
│ ├── data/
│ │ └── # generated .csv files
...
```

You can also specify other folders by providing the `--out` option, for example:

```shell
cds add data -o test/data
```

Each file contains a CSV header line reflecting the structure of the entity to which it corresponds.

## Editing `.csv` Files

Fill these files with initial data by editing them in your preferred editor. For example, the content of _db/data/sap.capire.bookshop-Books.csv_ looks like this:

::: code-group

```csvc [db/data/sap.capire.bookshop-Books.csv]
ID,title,author_ID,stock
201,Wuthering Heights,101,12
207,Jane Eyre,107,11
251,The Raven,150,333
252,Eleonora,150,555
271,Catweazle,170,22
```

:::


You can also use `cds add data` with the `--records` option to add generic data:

```shell
cds add data --records 10
```

> [!tip] AI-Generated Data
> For more realistic domain-specific data, you can use AI tools, like CoPilot in VS Code, to assist you in that. This works particularly well for small to medium-sized datasets. Moreover, CDS models provide domain models that are easy to reason about, with strong typing information, meaning that AIs can generate better fitting data samples.



The following table shows common rules that apply to text content in `.csv` files:

| Condition                                                        | Handling                    |
|------------------------------------------------------------------|-----------------------------|
| If texts contain commas, or line breaks, or trailing whitespaces | -> enclose in double quotes |
| If texts contain double quotes                                   | -> escape by doubling them  |
| Numeric content should be treated as texts                       | -> enclose in double quotes |
| Boolean values should be treated as text                         | -> enclose in double quotes |

## Data Loading Order

CAP loads CSV files in **alphabetical order by filename**. When tables have foreign key relationships, ensure parent tables load before child tables to avoid constraint violations.

**Example:**
```
db/data/
├── sap.capire.bookshop-Authors.csv       # Loads first (parent)
└── sap.capire.bookshop-Books.csv         # Loads second (references Authors)
```

The filename prefix ensures correct order: `Authors` loads before `Books` alphabetically. If you encounter foreign key violations, verify your file naming follows dependency order.

> [!tip] Large Datasets
> For datasets with thousands of rows, consider using database-specific bulk loading tools instead of CSV files. The CSV mechanism loads all data in a single transaction, which can cause memory issues and long startup times.

## Initial vs Test Data

You need to distinguish between _(real) initial data_ meant for production (configuration, code lists) and _test data_ meant for development and testing purposes only. CAP supports this by organizing CSV files in two locations:

```zsh
cap/bookshop/
├── db/
│ ├── data/
│ │ └── # .csv files for initial data
│ ...
├── test/
│ ├── data/
│ │ └── # .csv files for test data
...
```

The following table describes the purpose and deployment scope of each location:

| Location        | Purpose             | Deployed...          |
|-----------------|---------------------|----------------------|
| **`db/data`**   | (real) initial data | always, dev and prod |
| **`test/data`** | test data           | in development only  |

::: details Bookshop data is actually test data...
Note that the initial data provided in the [_@capire/bookshop_](../../get-started/bookshop) sample is actually test data, and hence we would typically place it in the _test/data_ folder. But for simplicity, it's placed in _db/data_, also because the whole purpose of that project is to be a _sample_.
::::

> [!danger] Don't let users modify productive initial data
> Otherwise this [data might get overridden on SAP HANA](./hana#csv-data-gets-overridden).


### Custom Folders

You can also configure other folders to read data from in different profiles. Use config option <Config>cds.requires.db.data</Config> to do so. The default configuration is as follows, which you can override in your `package.json` or `.cdsrc.yaml` file as appropriate:

::: code-group
```json [package.json]
"cds": {
  "requires": {
    "db": {
      "[development]": { "data": [ "db/data", "test/data" ] },
      "[production]": { "data": [ "db/data" ] }
    }
  }
}
```
```yaml [.cdsrc.yaml]
cds:
  requires:
    db:
      '[development]': { data: [ db/data, test/data ] }
      '[production]': { data: [ db/data ] }
```
:::

Use `cds env` to check which configuration is active in your current profile, e.g.:
```shell
cds env requires.db.data --profile development
```


## Next to `.cds` Files

In addition to the [configured](#custom-folders) folders for initial data and test data (that is, `db/data` and `test/data` by default), you can place `.csv` files into `data` folders anywhere next to your CDS model source files. For example:

```zsh
myproject/
├── db/
│ ├── data/*.csv
│ └── schema.cds
├── srv/
│ ├── data/*.csv
│ └── some-service.cds
...
```

The runtime automatically loads all `db/data/*.csv` and `srv/data/*.csv` files located in a `data` folder next to `.cds` model sources.

This is especially useful for remote service definitions imported with `cds import` (by default into `srv/external/`), allowing you to serve mock data for external services.


## From Reuse Packages

The [_in-the-neighborhood-of-models_](#next-to-cds-files) technique enables reuse packages that provide initial data.

An example of such a content reuse package is [*@capire/common*](https://github.com/capire/common), which showcases how to provide ISO reuse data for `Countries`, `Currencies`, and `Languages` code lists, as defined in [`@sap/cds/common`](../../cds/common). It essentially consists of these files as content:

```zsh
@capire/common
├── cds-plugin.js
├── data
│   ├── sap.common-Countries.csv
│   ├── sap.common-Countries_texts.csv
│   ├── sap.common-Currencies.csv
│   ├── sap.common-Currencies_texts.csv
│   ├── sap.common-Languages.csv
│   └── sap.common-Languages_texts.csv
├── index.cds
└── package.json
```

Install such packages via `npm` or `mvn`. Their content will reside under `node_modules` folders or Maven `target` folders.
When packages include reuse models (like `index.cds` above), the runtime automatically discovers and loads CSV files from the adjacent `data` folder into the consuming application's database.

> [!tip] How to 'enable' reuse packages
>
> The `@capire/common` package uses the `cds-plugin.js` technique, to provide plug-and-play configuration [in its `package.json`](https://github.com/capire/common/blob/bc92ae532d902022bf6c1dff70cce892fd0fd350/package.json#L9-L16) like that:
>
> ```json
> "cds": {
>   "requires": {
>     "@capire/common/data": {
>       "model": "@capire/common"
>     }
>   }
> }
> ```
>
> Without such plugin configuration, add a `using from '@capire/common';` clause to one of your CDS files.


## Plug-and-Play Reuse

You can consume reuse packages, such as the `@capire/common` one described above, in any CAP project by simply installing them via `npm` or `mvn`, as shown in the [`@capire/bookstore`](https://github.com/capire/bookstore) sample project:

```json [package.json]
{
  "name": "@capire/bookstore",
  "version": "1.2.3",
  "dependencies": {
    "@capire/common": "^1.0.0", // [!code focus]
    "@sap/cds": "..."
  }
}
```

When you run `cds watch`, the runtime automatically picks up the `@capire/common/index.cds` model file and all CSV files in its `data` folder, as shown in the following output:

```zsh
[cds] - loaded model from 27 file(s):

  app/services.cds
  srv/mashup.cds
  node_modules/@capire/common/index.cds # [!code focus]
  ...
```
```zsh
[cds] - connect to db > sqlite { url: ':memory:' }
  > init from node_modules/@capire/common/data/sap.common-Languages_texts.csv # [!code focus]
  > init from node_modules/@capire/common/data/sap.common-Languages.csv # [!code focus]
  > init from node_modules/@capire/common/data/sap.common-Currencies_texts.csv # [!code focus]
  > init from node_modules/@capire/common/data/sap.common-Currencies.csv # [!code focus]
  > ...
/> successfully deployed to in-memory database.
```

> [!tip] Installation is sufficient
> The great thing with plug-and-play configuration is that a mere `npm install` in a consuming project suffices to have the `@capire/common/index.cds` file loaded together with the application’s models, and hence also all data from accompanying `.csv` files.

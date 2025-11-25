---
shorty: cds.reflect
synopsis: >
  Find here information about reflecting parsed CDS models in CSN representation.
status: released
---

# Reflecting CDS Models

{{$frontmatter?.synopsis}}

<!--- % assign m = '<span style="color:grey"> m</span>' %} -->
<!--- % include links-for-node.md %} -->
<!--- % include _toc levels="2,3" %} -->

[def]: ../cds/csn#definitions
[defs]: ../cds/csn#definitions



[[toc]]



## cds. linked ([csn](../cds/csn)) {#cds-linked .method}
[`cds.linked`]: #cds-linked

Method `cds.linked` (or `cds.reflect` which is an alias to the same method) turns a given parsed model into an instance of [class `LinkedCSN`](#linked-csn), and all definitions within into instances of [class `LinkedDefinition`](#any), recursively.

Declaration:

```tsx
function* cds.linked (csn: CSN | string) => LinkedCSN
```

A typical usage is like that:

```js
let csn = cds.load('some-model.cds')
let linked = cds.linked(csn) // linked === csn
```

Instead of a already compiled CSN, you can also pass a string containing CDL source code:

```js
let linked = cds.linked`
  entity Books {
  	key ID: UUID;
  	title: String;
  	author: Association to Authors;
  }
  entity Authors {
  	key ID: UUID;
  	name: String;
  }
`
```

The passed in model gets **modified**, and the returned linked model is actually the modified passed-in csn.

The operation is **idempotent**, that is, you can repeatedly invoke it on already linked models with zero overhead.





## LinkedCSN {#linked-csn .class}
[reflected model]: #linked-csn
[linked model]: #linked-csn
[`LinkedCSN`]: #linked-csn

Models passed through [`cds.linked`] become instances of this class.

### . is_linked {.property}

A tag property which is `true` for linked models. {.indent}

### . definitions {.property}

The [CSN definitions](../cds/csn#definitions) of the model, turned into an instance of [`LinkedDefinitions`].  {.indent}

### . services {.property}

Convenient shortcut to access all *[service](../cds/cdl#services)* definitions in a model. The returned value is an array of all service definitions, with additional non-enumerable properties to access the service definitions by name.

Example:

```js
let m = cds.linked`
  service CatalogService { ... }
  service AdminService { ... }
`

// Object nature
let { CatalogService, AdminService } = m.services

// Array nature
for (let each of m.services) console.log (each.name)
```


### . entities {.property}

These are convenient shortcuts to access all *[entity](../cds/cdl#entities)* definitions in a model. The returned value is a function that allows to specify a namespace to fetch all matching entity definitions, with initial properties for all entity definitions in the model.

Example:

```js
let m = cds.linked`
  namespace my.bookshop;
  entity Books {...}
  entity Authors {...}
`
// Function nature
let { Books, Authors } = m.entities ('my.bookshop')


// Object nature (uses the model's top-level namespace)
let { Books, Authors } = m.entities

// Array nature
for (let each of m.entities) console.log (each.name)
//> my.bookshop.Books
//> my.bookshop.Authors
```



### each() {#each .method }

```tsx
function* lm.each (
   filter : string | def => true/false,
   defs?  : linked_definitions
)
```


Fetches definitions matching the given filter, returning an iterator on them.

```js
let m = cds.reflect (csn)
for (let d of m.each('entity')) {
  console.log (d.kind, d.name)
}
```

The first argument **_filter_** specifies a filter to match definitions, which can be one of:

- a `string` referring to a _kind_ of definition
- a `function` returning `true` or `false`

Derived kinds are supported, for example, `m.each('struct')` matches structs
as well as entities; kind `'any'` matches all.

The second optional argument **_[defs]_** allows to specify the definitions to fetch in, defaults to `this.definitions`.



### all() {#all .method }

```tsx
function lm.all (
   filter : string | def => true/false,
   defs?  : linked_definitions
)
```

Convenience shortcut to [`[... model.each()]`](#each), for example, the following are equivalent:

```js
m.all('entity')        //> using shortcut
[...m.each('entity')]  //> using spread operator
```



### find() {#find .method }

```tsx
function lm.find (
   filter : string | def => true/false,
   defs?  : linked_definitions
)
```

Convenience shortcut to fetch definitions matching the given filter, returning the first match, if any. For example:

```js
let service = m.find('service')
```

The implementation uses to [`.each()`](#each) as follows:

```js
for (let any of m.each('service'))  return any
```



### foreach() {#foreach .method }

```tsx
function lm.foreach (
  filter  : def => true/false | string,
  visitor : def => {},
  defs?   : linked_definitions
)
```

Calls the visitor for each definition matching the given filter. `foreach` iterates through the passed in defs only, `forall` in addition walks through all nested element definitions hierarchically.

* `filter` / `kind` — the filter or kind used to match definitions [&rarr; see _.each(x)_](#each)
* `visitor` — the callback function
* `defs` — the definitions to fetch in, default: `this.definitions`

Examples:

```js
// print the names of all services
let m = cds.reflect(csn)
m.foreach ('service', s => console.log(s.name))
```
```js
// print the names of all Associations in Books element
let { Books } = m.entities()
m.foreach ('Association', a => console.log(a.name), Books.elements)
```





## LinkedDefinitions {.class #iterable}

[`LinkedDefinitions`]: #iterable

All objects of a linked model containing CSN definitions are instances of this class.

For example, that applies to:

- *`cds.model` [.definitions](#definitions), [.services](#services), [.entities](#entities)*
- *`cds.service` [.entities](#entities-1), [.events](#events), [.actions](#actions-1)*
- *`cds.entity`  [.keys](#keys), [.associations](#associations), [.compositions](#compositions), [.actions](#actions)*
- *`cds.struct` [.elements](#elements)* (hence also *`cds.entity` .elements*)
- *`cds.Association` [.foreignKeys](#foreignkeys)*

Instances of `LinkedDefinitions` allow both, object-style access, as well as array-like access.
For example:

```js
let linked = cds.linked (model)
let { Books, Authors } = linked.entities // object-like
let [ Books, Authors ] = linked.entities // array-like
```

> Note: Orders of definitions could change, so you should always prefer object destructuring over array destructuring.


The array-like nature also allows using these shortcuts in `for..of` loops, of course. Which means, you can do that:

```js
for (let each of linked.definitions) console.log (each.name)
```

... instead of iterating definitions using `for..in` loops like that:

```js
for (let each in linked.definitions) {
  let d = linked.definitions [each]
  console.log (d.name)
}
```

Each entry in an instance of `LinkedDefinitions` is a [`LinkedDefinition`].



## LinkedDefinition {.class #any}

[`LinkedDefinition`]: #any

All [`cds.linked`] definitions are instances of this class, or subclasses thereof. It is accessible through [`cds.linked.classes.any`](#cds-linked-classes).

### . is_linked {.property}

A tag property which is `true` for all linked definitions. {.indent}

### . name {.property}

The linked definition's fully qualified name as a non-enumerable property. {.indent}

### . kind {.property}

The linked definition's resolved kind as a non-enumerable property.
One of:

- `'context'`
- `'service'`
- `'entity'`
- `'type'`
- `'aspect'`
- `'event'`
- `'element'`
- `'annotation'`

... as documented in the [CSN specification](../cds/csn#definitions).



#### *instanceof*

You can use JavaScript's standard `instanceof` operator in combination with the built-in classes to check a linked definition's type:

```js
let { Foo } = cds.linked(csn).entities
if (Foo instanceof cds.entity) console.log ("it's an entity")
```





## cds. service {.class}

All *[service](../cds/cdl#services)* definitions in a linked model are instances of this class.

```tsx
class cds.service extends cds.context {...}
```

### . is_service {.property}

A tag property which is `true` for linked entity definitions. {.indent}

### . entities {.property alt="The following documentation on actions also applies to entities. "}

### . events {.property alt="The following documentation on actions also applies to events. "}

### . actions {.property}

These properties are convenience shortcuts to access a service definition's exposed [*entity*](../cds/cdl#entities), [*type*](../cds/cdl#types), [*event*](../cds/cdl#events), [*action* or *function*](../cds/cdl#actions) definitions. <br>Their values are [`LinkedDefinitions`].
 {.indent}



## cds. entity {.class }

All entity definitions in a linked model are instances of this class.

```tsx
class cds.entity extends cds.struct {...}
```

> As `cds.entity` is a subclass of [`cds.struct`](#cds-struct) it also inherits all methods from that.

### . is_entity {.property}

A tag property which is `true` for linked entity definitions.
{.indent}

### . keys {.property alt="The following documentation on actions also applies to keys. "}


### . associations {.property alt="The following documentation on actions also applies to associations. "}

### . compositions {.property alt="The following documentation on actions also applies to compositions. "}

### . actions {.property}

These properties are convenient shortcuts to access an entity definition's declared [*keys*](../cds/cdl#entities), *[Association](../cds/cdl#associations)* or *[Composition](../cds/cdl#associations)* elements, as well as [*bound action* or *function*](../cds/cdl#bound-actions) definitions. <br>
Their values are [`LinkedDefinitions`].
{.indent}


### . texts {.property}

If the entity has *[localized](../guides/localized-data)* elements, this property is a reference to the respective `.texts` entity. If not, this property is undefined
{.indent}

### . drafts {.property}

If draft is enabled, a definition to easily refer to *[draft](../advanced/fiori#draft-support)* data for the current entity is returned.
{.indent}



## cds. struct {.class }

This is the base class of *[struct](../cds/cdl#structured-types)* elements and types, *[aspects](../cds/cdl#aspects)*, and *[entities](../cds/cdl#entities)*.

```tsx
class cds.struct extends cds.type {...}
```

### . is_struct {.property}

A tag property which is `true` for linked struct definitions (types and elements). <br>
It is also `true` for linked entity definitions, that is, instances of as [`cds.entity`](#cds-entity). {.indent}

### . elements {.property}

The entity's declared elements as [documented in the CSN Specification](../cds/csn#entity-definitions) <br>as an instance of [`LinkedDefinitions`]. { .indent}



## cds. Association {.class}

All linked definitions of type `Association` or `Composition`, including elements, are instances of this class. Besides the properties specified for [Associations in CSN](../cds/csn#associations), linked associations provide the following reflection properties...


### . _target {.property}

A reference to the association's resolved linked target definition. {.indent}


### . isAssociation {.property}

A tag property which is `true` for all linked Association definitions, including Compositions. {.indent}

### . isComposition {.property}

A tag property which is `true` for all linked Composition definitions. {.indent}

### . is2one / 2many {.property}

Convenient shortcuts to check whether an association definition has to-one or to-many cardinality. { .indent}

### . keys {.property}

The declared or derived foreign keys. As specified in [CSN spec](../cds/csn#assoc-keys) this is a *projection* of the association target's elements. {.indent}

### . foreignKeys {.property}

The effective foreign keys of [*managed* association](../cds/cdl#managed-associations) as linked definitions. <br>The value is an instance of [`LinkedDefinitions`].
{.indent}






## cds. linked .classes {#cds-linked-classes .property}

[`cds.linked.classes`]: #cds-linked-classes


This property gives you access to the very roots of `cds`'s type system. When a model is passed through [`cds.linked`] all definitions effectively become instances of one of these classes.
In essence they are defined as follows:

```js
class any {...}
class context extends any {...}
cds.service = class service extends context {...}
cds.type = class type extends any {...}
              class scalar extends type {...}
                class boolean extends scalar {...}
                class number extends scalar {...}
                class date extends scalar {...}
                class string extends scalar {...}
cds.array  = class array extends type {...}
cds.struct = class struct extends type {...}
cds.entity = class entity extends struct {...}
cds.event = class event extends struct {...}
cds.Association = class Association extends type {...}
cds.Composition = class Composition extends Association {...}
```

> A few prominent ones of the above classes are available through top-level shortcuts as indicated by the `cds.<classname> =` prefixes in the above pseudo code, find more details on these in the following sections.

For example, you can use these classes as follows:

```js
let m = cds.linked`
   entity Books { author: Association to Authors; }
   entity Authors { key ID: UUID; }
`)
let { Books, Authors } = m.entities
let isEntity = Books instanceof cds.entity
let keys = Books.keys
let { author } = Books.elements
if (author.is2many) ...
```



#### mixin() {.method}

Provided a convenient way to enhance one or more of the builtin classes with additional methods.
Use it like that:

```js
const cds = require ('@sap/cds')

// simplistic csn2cdl enablement
cds.linked.classes .mixin (
  class type {
    toCDL(){ return `${this.kind} ${this.name} : ${this.typeAsCDL()};\n` }
    typeAsCDL(){ return `${this.type.replace(/^cds\./,'')}` }
  },
  class struct {
    typeAsCDL() { return `{\n${ Object.values(this.elements).map (
      e => `  ${e.toCDL()}`
    ).join('')}}`}
  },
  class entity extends cds.struct {
    typeAsCDL() { return (
      this.includes ? this.includes+' ' : ''
    ) + super.typeAsCDL() }
  },
  class Association {
    typeAsCDL(){ return `Association to ${this.target}` }
  },
)

// test drive
let m = cds.linked`
  entity Books : cuid { title:String; author: Association to Authors }
  entity Authors : cuid { name:String; }
  aspect cuid : { key ID:UUID; }
`
m.foreach (d => console.log(d.toCDL()))
```





## cds. builtin. types {#cds-builtin-types .property}
[`cds.builtin.types`]: #cds-builtin-types


This property gives you access to all prototypes of the builtin classes as well as to all linked definitions of the [builtin pre-defined types](../cds/types). The resulting object is in turn like the `definitions` in a [`LinkedCSN`].

Actually, at runtime CDS is in fact bootstrapped out of this using core [CSN](../cds/csn) object structures and [`cds.linked`] techniques. Think of it to be constructed as follows:

```js
cds.builtin.types = cds.linked`
  using from './roots';
  context cds {
    type UUID         : String(36);
    type Boolean      : boolean;
    type Integer      : number;
    type UInt8        : Integer;
    type Int16        : Integer;
    type Int32        : Integer;
    type Int64        : Integer;
    type Integer64    : Integer;
    type Decimal      : number;
    type Double       : number;
    type Date         : date;
    type Time         : date;
    type DateTime     : date;
    type Timestamp    : date;
    type String       : string;
    type Binary       : string;
    type LargeString  : string;
    type LargeBinary  : string;
    type Map          : struct;
  }
`.definitions
```

With `./roots` being this in-memory CSN:

```js
const { any, context, service ,
  type, scalar, string, number, boolean, date,
  array, struct, entity, event, aspect
  Association, Composition
} = cds.linked.classes

const roots = module.exports = {definitions:{
  any: new any,
  context: new context ({type:'any'}),
  type: new type ({type:'any'}),
    scalar: new scalar ({type:'type'}),
      string: new string ({type:'scalar'}),
      number: new number ({type:'scalar'}),
      boolean: new boolean ({type:'scalar'}),
      date: new date ({type:'scalar'}),
    array: new array ({type:'type'}),
    struct: new struct ({type:'type'}),
      entity: new entity ({type:'struct'}),
      event: new event ({type:'struct'}),
      aspect: new aspect ({type:'struct'}),
    Association: new Association ({type:'type'}),
      Composition: new Composition ({type:'Association'}),
  service: new service ({type:'context'}),
}}
```
> Indentation indicates inheritance.

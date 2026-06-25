---
synopsis: >
  API to introspect CDS Query Language (CQL) statements in Java.
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Introspecting CQL Statements
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}


## Introduction

Handlers of [CQN-based services](../cqn-services/#cdsservices) often need to understand the incoming CQN statements.

The statement analysis can be done in two different ways. Depending on the complexity of the statement it can be done using:

- CQN Analyzer: A specialized API to extract filter values from filter predicates of queries, and to analyze the structure and filters of references
- CQN Visitor: A general purpose API, to traverse CQN token trees such as expressions, predicates, values etc.

### CqnAnalyzer vs. CqnVisitor

The `CqnAnalyzer` allows for analysis and extraction of element values for most of the queries, but it comes with some limitations. The main rule here is:

::: tip
The value of an element reference in a `where` and `filter` predicate must be unambiguously identified.
:::

This implies the following:

- The operator of comparison predicate must be either `eq` or `is`:

```java
Select.from("bookshop.Book").where(b -> b.get("ID").eq(42));
```

- Only the conjunction `and` is used to connect predicates:

```java
Select.from("bookshop.Book")
	.where(b -> b.get("ID").eq(42).and(b.get("title").is("Capire")));
```

This rule also applies to all segments of all references of the query, be it simple query or the one with path expression:

```java
Select.from("bookshop.Book",
	b -> b.filter(b.get("ID").eq(41))
		.to("author").filter(a -> a.get("Id").eq(1)));
```

### When to Use What

Use `CqnAnalyzer` when element references of the query are:
 - Unambiguously mapped to a value by: a comparison predicate using `eq` or `is`, used in `byId`, or a `matching` clause
 - Used in conjunction (`and`) predicates

Use `CqnVisitor` when element references of the query are:
- Compared with `lt`, `gt`, `le`, `ge`, `ne`, `isNot` operator
- Used within `in`
- Negated with `not`
- Used in `search`
- Used in functions
- Used in subqueries
- Referencing elements of an associated entity


## CqnAnalyzer

The [CQL](../../cds/cql) introspection API allows to analyze [CQL](../../cds/cql) statements and extract values and information on the CDS entities in references.

The [CqnAnalyzer](https://javadoc.io/doc/com.sap.cds/cds4j-api/latest/com/sap/cds/ql/cqn/CqnAnalyzer.html) can be constructed from a [CDS model](../reflection-api#the-cds-model):

```java
import com.sap.cds.ql.cqn.CqnAnalyzer;

CdsModel cdsModel = context.getModel();
CqnAnalyzer cqnAnalyzer = CqnAnalyzer.create(cdsModel);
```

Furthermore, the static `isCountQuery(cqn)` method can be used to check if a [CQL](../../cds/cql) query only returns a single count:

```java
// cqn: Select.from("Books").columns(CQL.count().as("bookCount"));
boolean isCount = CqnAnalyzer.isCountQuery(cqn);  // true
```

### Usage

Given the following CDS model and CQL query:

```cds
entity Orders {
  key OrderNo : String;
  Items       : Composition of many OrderItems on Items.parent = $self;
  ...
}
entity OrderItems {
  key ID : Integer;
  book   : Association to Books;
  ...
}
```

[Find this source also in **cap/samples**.](https://github.com/sap-samples/cloud-cap-samples-java/blob/5396b0eb043f9145b369371cfdfda7827fedd039/db/schema.cds#L31-L36){.learn-more}


```sql
--CQL query
SELECT from Orders[OrderNo = '42']:items[ID = 1]
```

the corresponding CQN statement can be analyzed using the `analyze` method of the `CqnAnalyzer`:

```java
CqnStatement cqn = context.getCqn();

AnalysisResult result = cqnAnalyzer.analyze(cqn.ref());
```

### Resolving CDS Entities

Based on the `AnalysisResult`, information on the CDS entities can be accessed through the [Reflection API](../reflection-api):
<!-- TODO incorrect link? -->

```java
CdsEntity order = result.rootEntity();   // Orders
CdsEntity item  = result.targetEntity(); // OrderItems
```

### Extracting Filter Values

A non-complex filter predicate might map (restrict) some element to a particular _filter value_. If some filter values can be _unambiguously_ determined, the `CqnAnalyzer` can extract these filter values and return them as a `Map`. A filtered data set will contain only data that matches the filter values.

Examples:

```sql
WHERE name = 'Sue'
WHERE name = 'Bob' AND age = 50
WHERE name = 'Alice' AND (age = 25 OR age = 35)
WHERE name = 'Alice' AND age = 25 OR name = 'Alice' AND age = 35
```

The first example above maps `name` to `Sue`. The second example maps `name` to 'Bob' and `age` to 50. In the third example only `name` is unambigously mapped to 'Alice' but a value for `age` can't be extracted. The fourth example is equivalent to the third.

The key values of the entities can be extracted as a map using the `rootKeys` and `targetKeys` method of the `AnalysisResult` object:

```java
Map<String, Object> rootKeys = result.rootKeys();
String orderNo = (String) rootKeys.get("OrderNo"); // 42

Map<String, Object> targetKeys  = result.targetKeys();
Integer itemId = (Integer) targetKeys.get("ID");   // 1
```

To extract all filter values of the target entity including non-key values, the `targetValues` method can be used:

```java
Map<String, Object> filterValues = result.targetValues();
```

For `CqnSelect`, `CqnUpdate`, and `CqnDelete`, values can also be extracted from the statement's `where` condition:

```sql
--CQL query
SELECT from Orders[OrderNo = '42'].items where ID = 3 and status = 'open'
```

```java
CqnSelect select = context.getCqn();
AnalysisResult result = cqnAnalyzer.analyze(select);

Map<String, Object> targetKeys = result.targetKeys();
Integer itemId = (Integer) targetKeys.get("ID");   // 3

Map<String, Object> filterValues = result.targetValues();
String status = (String) filterValues.get("status");   // 'open'
```

### Using the Iterator

The methods prefixed with `root` and `target` access the first respectively last segment of the CQN statement's reference.
If the reference has more than two segments, such as:

```sql
--CQL query
SELECT from Orders[OrderNo = '42']:items[ID = 1].book
```

the segment `items` can be analyzed using an iterator:

```java
Iterator<ResolvedSegment> iterator = result.iterator();
CdsEntity order = iterator.next().entity();
CdsEntity item  = iterator.next().entity();
CdsEntity book  = iterator.next().entity();
```

or a reverse iterator starting from the last segment:

```java
Iterator<ResolvedSegment> iterator = result.reverse();
CdsEntity book  = iterator.next().entity();
CdsEntity item  = iterator.next().entity();
CdsEntity order = iterator.next().entity();
```

In the same way, also the filter values for each segment can be extracted using the `values` and `keys` method instead of the `entity` method.

## CqnVisitor

`CqnVisitor` interface is part of a public API, which allows to traverse CQN token trees such as expressions, predicates, values etc. It follows the Visitor design pattern.

When a visitor is passed to a token's `accept` method, it is traversed through the token's expression tree. Generally the `accept` methods of the token's children are called first (depth-first). Afterwards the `visit` method that is most specific to the token is invoked. Classes implementing the `CqnVisitor` interface may override the default `visit` method to perform arbitrary operations.

### Fields of Application

It is a powerful tool, which can be handy to introspect the complex queries and its compound parts. It can be used to analyze the information about:
- Element references
- Expand associations
- Connective predicates (`and`, `or`)
- Comparison predicates with binary (`gt`, `lt`, `ne`, etc.) and unary (`not`) operators
- `search` and `in` predicates
- Functions and expressions
- Literals and parameters

### Usage

In the following example, the `CqnVisitor` is used to evaluate whether the data matches a given filter expression.

#### Data

```java
List<Map<String, Object>> books = new ArrayList<>();
books.add(ImmutableMap.of("title", "Catweazle", "stock", 3));
books.add(ImmutableMap.of("title", "The Raven", "stock", 42));
books.add(ImmutableMap.of("title", "Dracula", "stock", 66));
```

#### Filter

```java
Predicate titles = CQL.get("title").in("Catweazle", "The Raven");
Predicate stock = CQL.get("stock").gt(10);

// title IN ('Catweazle', 'The Raven') AND stock > 10
Predicate filter = CQL.and(titles, stock);
```

The `filter` consists of three predicates, substituting the following tree:

```zsh
                                       AND
                    ┌───────────────────┴───────────────────┐
                    IN                                      GT
        ┌───────────┴───────────┐                   ┌───────┴───────┐
      title        ['Catweazle', 'The Raven']     stock             10
```

which corresponds to the following CQN token tree (numbers in brackets show the visit order):

```txt
                            CqnConnectivePredicate (8)
                  ┌───────────────────┴───────────────────┐
            CqnInPredicate (4)                  CqnComparisonPredicate (7)
      ┌───────────┴───────────┐               ┌───────────┴───────────┐
CqnElementRef (1)     CqnLiteral (2, 3)  CqnElementRef (5)      CqnLiteral (6)
```

#### Visitor

As already mentioned, the `CqnAnalyzer` is not suitable to analyze such a predicate, as neither the element `title` nor `stock` is uniquely restricted to a single value.

To overcome this issue a `CqnVisitor` is to be implemented to evaluate whether the `data` meets the filter expression. The visitor has access to the `data` that is checked. To respect the depth-first traversal order, it uses a `stack` to store intermediate results:

```java
class CheckDataVisitor implements CqnVisitor {
    private final Map<String, Object> data;
    private final Deque<Object> stack = new ArrayDeque<>();

    CheckDataVisitor(Map<String, Object> data) {
        this.data = data;
    }

    boolean matches() {
        return (Boolean) stack.pop();
    }
    ...
}
```

On the leaf-level, the stack is used to store the concrete values from both data payload and filter expression:

```java
@Override
public void visit(CqnElementRef ref) {
    Object dataValue = data.get(ref.displayName());
    stack.push(dataValue);
}

@Override
public void visit(CqnLiteral<?> literal) {
    stack.push(literal.value());
}
```

When visiting the predicates, the values are popped from the stack and evaluated based on the predicate type and comparison operator. The `Boolean` result of the evaluation is pushed to the stack:

```java
@Override
public void visit(CqnInPredicate in) {
    List<Object> values = in.values().stream()
            .map(v -> stack.pop()).collect(toList());
    Object value = stack.pop();
    stack.push(values.stream().anyMatch(value::equals));
}

@Override
public void visit(CqnComparisonPredicate comparison) {
    Comparable rhs = (Comparable) stack.pop();
    Comparable lhs = (Comparable) stack.pop();
    int cmp = lhs.compareTo(rhs);
    switch (comparison.operator()) {
    case EQ:
        stack.push(cmp == 0);
        break;
    case GT:
        stack.push(cmp > 0);
        break;
    // ...
    }
}
```

The `visit` method of the `CqnConnectivePredicate` pops the `Boolean` evaluation results from the stack, applies the corresponding logical operator, and pushes the result to the stack:

```java
@Override
public void visit(CqnConnectivePredicate connect) {
    Boolean rhs = (Boolean) stack.pop();
    Boolean lhs = (Boolean) stack.pop();
    switch (connect.operator()) {
    case AND:
        stack.push(lhs && rhs);
        break;
    case OR:
        stack.push(lhs || rhs);
        break;
    }
}
```

The whole process can be considered as a reduce operation when traversing the tree from bottom to top.

To evaluate whether given `data` matches the filter expression, an instance `v` of the visitor is created. Afterwards the filter's accept method traverses its expression tree with the visitor, which evaluates the expression during the traversal:

```java
for (Map<String, Object> book : books) {
    CheckDataVisitor v = new CheckDataVisitor(book);
    filter.accept(v);
    System.out.println(book.get("title") + " " +
            (v.matches() ? "match" : "no match"));
}
```

The output will be:

```txt
Catweazle	no match
The Raven	match
Dracula		no match
```

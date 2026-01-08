---
# layout: cds-ref
shorty: Expressions Draft
synopsis: >
  Parts to add later in a different PR
status: draft
---



## binding parameter { #binding-parameter }

<div class="diagram" v-html="bindingParameter"></div>

TODO: Remove for first version?

💡 string and numeric literal as well as `?` are parsed as `ref`



### theoretical background

CAP did not re-invent when it comes to expressions.
It rather builds upon well-known concepts from relational databases and SQL.

In the [final chapter](#foundation) of this guide, we provide some theoretical background.

## Scientific Background {#foundation}

Every entity defines a set of all possible instances:
$${ b \in \text{Books} }$$

A simple select query on Books returns the complete set → all books.
Filters progressively narrow down the set:

$$\text{highstock} = \{ b \in \text{Books} \mid b.\text{stock} > 100 \}$$

With the infix filter notation, we write it as `Books[stock > 100]`.
An association defines a relationship between two sets:

$$\text{books} = \{ (a,b) \in \text{Books} \times \text{Authors} \mid b.\text{author\_id} = a.\text{id} \}$$

We can select this set using the path expression `Authors:books` in the [from clause](#in-from-clause).
The same can be applied to navigate via a path expression in the [select list](#path-navigation) or [where clause](#in-where-clause) using `books`.
Filtering authors by `Authors where exists books[stock > 100]` can be expressed as:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{Books}( b.\text{author\_id} = a.\text{id} \land b.\text{stock} > 100 ) \}$$

Using the previously defined $\text{books}$, we can simplify it to:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{books}( b.\text{stock} > 100 ) \}$$

Using the $\text{highstock}$ set, we can further simplify it to:

$$\{ a \in \text{Authors} \mid \exists \space b \in \text{books} \cap \text{highstock} \}$$

So in conclusion, the expression filters for the intersection of the two sets $\text{books}$ (via association) and $\text{highstock}$ (via infix filter).





<div class="diagram">
<div v-html="setsIntersection"></div>
</div>





<div class="diagram">
<div v-html="setsLeftjoin"></div>
</div>


<div class="diagram">
<div v-html="setsExpand"></div>
</div>

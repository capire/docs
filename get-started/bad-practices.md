---
status: released
---

# Bad Practices

[[toc]]



## Questionable Prior Arts <UnderConstruction/>

### DAOs, DTOs, Active Records <UnderConstruction/>

- → see [Best Practices / Passive Data](best-practices#data)

### Object-Relational Mappers <UnderConstruction/>

- → see [Best Practices / Querying](best-practices#querying)

### BO-centric Frameworks <UnderConstruction/>

... which bypass or are in conflict with CAP's [key design principles](bad-practices.md), for example:

- ORM techniques like Spring repositories
- Active Records, DAOs

These would be in conflict with CAP's focus on stateless services processing passive data, as well as with the querying-based approach to read and write data.

### Determinations & Validations <UnderConstruction/>

- This might be a special thing if you come from a background where these terms were prominently positioned, accompanied by corresponding frameworks.
- Quite likely that is an SAP background, as we didn't find the term "determination" used outside of these SAP circles in that context.
- CAP is actually an offspring of a performance firefighting taskforce project, which identified such frameworks and their overly fragmented and fine-granular element level approach as one of a few root causes for framework-induced performance overheads.
- Hence CAP intentionally does not offer element-level call-level validation or determination framework, and strongly discourages combining your use of CAP with such.
- CAP does provide declarative element-level validations though → these are advisable, as we can optimize the implementations behind the scenes, which is just not possible in the imperative call-level frameworks.
-

### Sticking to DIY (or NIH) <UnderConstruction/>

Such as...

- Low-level http or OData requests
- Low-level integration with message brokers
- Database-specific things without need
- Non-CAP client libraries for BTP services

Doing so would spoil the party, for example regarding rapid local development at minimized costs, fast test pipelines, and late-cut µ services.
It would also expose your projects to risks of disruptions by changes in those rather volatile technologies.

### Always done it this way <UnderConstruction/>

- and CAP is different... for a reason, or more... ;-)



## Abstracting from CAP <UnderConstruction/>

- CAP already provides abstractions from the underlying database, the protocols, the deployment target, the client technology, and more.
- CAP is also an implementation of Hexagonal Architecture, which is an abstraction of the same kind.
- So, abstracting from CAP would be abstracting from an abstraction, which is a bad idea in general, and certainly will ensure that you won't benefit from the full power of CAP, any longer.

### Squared Hexagons <UnderConstruction/>

- As documented in the best practices guide, CAP is not only very much in line with Hexagonal Architecture, it actually *is an implementation* of it.
- So there's little need to invest into the outer hexagon → focus on the inner one
- Yet, we saw projects insisting on doing Hexagonal Architecture their own way, or maybe the very way that was discussed in some other paper, done with some other framework ...
- ... Hexagonal Arch ** 2 = ?

### Same for DDD... <UnderConstruction/>

- Focus on Domain is exactly what domain-driven design is also striving for... and there are some many commonalities in concepts and approaches.
- Yet, we saw projects insisting on doing DDD a very specific way, for example using Active Records, Spring repositories, etc.... → things [we list as bad practices above](#daos-dtos-active-records)




## Code Generators

### The Swagger Textbook

Alternative frameworks or toolsets follow code generation approaches. Swagger does so for example: One write OpenAPI documents in YAML in the [Swagger Editor](https://editor.swagger.io), and have a server package generated, for example for Node.js, which, as the included readme tells us *"... leverages the mega-awesome [swagger-tools](https://github.com/apigee-127/swagger-tools) middleware which does most all the work."* → it does so as follows:

<span class="centered">

| Feature                              |       Swagger        |          CAP          |
|--------------------------------------|:--------------------:|:---------------------:|
| Lines of code for service definition | **~555**{.h3}{.red}  | **~11**{.h3} {.green} |
| Lines of code for implementation     | **~500**{.h3} {.red} |  **0**{.h3} {.green}  |
| Size of framework library            |     16 MB {.red}     |    10 MB {.green}     |
| CRUDQ served on DB, including...     |                      |        &check;        |
| Deep Reads & Writes                  |                      |        &check;        |
| Deep Hierarchies                     |                      |        &check;        |
| Aggregations                         |                      |        &check;        |
| Pagination                           |                      |        &check;        |
| Sorting                              |                      |        &check;        |
| Search                               |                      |        &check;        |
| Filtering                            |                      |        &check;        |
| Primary Keys                         |                      |        &check;        |
| Access Control                       |                      |        &check;        |
| Localized Data                       |                      |        &check;        |
| Managed Data                         |                      |        &check;        |
| Media Data                           |                      |        &check;        |
| Temporal Data                        |                      |        &check;        |
| Fiori Draft Handling                 |                      |        &check;        |
| Exclusive Locking                    |                      |        &check;        |
| Conflict Detection (via ETags)       |                      |        &check;        |
| Data Replication (upcoming)         |                      |        &check;        |
| Data Privacy                         |                      |        &check;        |
| ...                                  |                      |        &check;        |

</span>

While code generators also have you writing less code yourself, the code is still there (to cover all that CAP covers, we could extrapolate the 500 lines of code to end up in ~5,000, maybe 50,000 ...?). To mention only the most critical consequence out of this: **No single points to fix**, as you simply can't fix code generated in the past.

::: details CDS-based service definitions vs OpenAPI documents ...

Even if we'd ignore all the other things, there still remains the difference between writing ~11 lines of concise and comprehensible CDS declarations, or ~333 lines of YAML. While the former allows to involve and closely collaborate with domain experts, the latter certainly doesn't. (And technocratic approaches like Hexagonal Architecture or Domain-Driven Design the way it's frequently done by developers don't really help either.)

:::

### Code-Generating AI <UnderConstruction/>

- Don't confuse "[*Generative AI*](https://en.wikipedia.org/wiki/Generative_artificial_intelligence)" with '*Code-generating AI*' ...
- Even though it's AI-generated the usual drawbacks for generated code apply:
  - **No single points to fix** all that code that was generated last year
  - One off approach → doesn't help much in evolutionary, iterative development
  - ...

- There's a different between a GPT-generated one-off thesis and long-lived enterprise software, which needs to adapt and scale to new requirements.

## Overly Generic Approaches <UnderConstruction/>

### The 'ODatabase' Anti Pattern <UnderConstruction/>

- Assume you have a domain model with 123 entities
- Then the easiest thing is to add a single service with 123 1:1 projections...?
- As all the rest can be done by CAP's and OData's powerful query languages, right?
- → that service is the exact opposite of a use case-oriented facade
- if you want that, don't use CAP, don't use any layered architecture at all ...s
- just connect your client directly to a SQL database in a two tier model ;-)



### Tons of Glue Code <UnderConstruction/>

- as stated, while CAP cares about the vast majority of non-functional requirements, qualities, wire protocols, low-level stuff... so that you, as an application developer should be able to put primary focus on domain.
- if you still find yourself lost in a high ratio of glue code, something has certainly gone wrong




## Microservices Mania <UnderConstruction/>

Avoid eager fragmentation into microservices. Instead, start with a monolith and cut out microservices later, when you really need them. This is what we call "late-cut microservices".

See also...

- [Microservices Mania: Are Moduliths the Saner Path to Scalable Architecture?](https://blog.payara.fish/microservices-mania-are-moduliths-the-saner-path-to-scalable-architecture)
- [Mainstream Microservices Mania Challenges Increasing with Adoption](https://www.f5.com/de_de/company/blog/mainstream-microservices-mania-challenges-increasing-with-adoption)
- [What is Better: Modular Monolith vs. Microservices](https://medium.com/codex/what-is-better-modular-monolith-vs-microservices-994e1ec70994)
- [Architecture Style: Modulith vs. Microservices](https://dzone.com/articles/architecture-style-modulith-vs-microservices)
- [Death by a Thousand Microservices](https://www.reddit.com/r/programming/comments/18crnmz/death_by_a_thousand_microservices/).



## Ignorance

When writing these guides we frequently wonder whether it is worth the effort, because we likely have to understand and to accept that we're living in times of ...

- Too long; didn't read (TL;DR)
- Too busy (→ an [anti pattern on it's own](./assets/too-busy) \;-)
- Not required, as we've AI now
- I don't need to read that, as I already know (better) ...

If against all odds you are indeed just reading these lines, please leave a trace about that in [blue sky](https://bsky.app) with this content (including link):

*[I read it! ☺️](#ignorance) <br/>
#sapcap*
{.indent}

... to let the others out there know that there's hope, and some hi, left... \:-)

And in case you are just reading these lines, because of these posts, we strongly encourage you to read these new guides, even if (you think) you already know CAP:

- *[Introduction – What is CAP?](about) → Value Propositions*
- *[Best Practices](best-practices) → Key Concepts & Rationales*
- *[Anti Patterns](bad-practices) → Do's and **don'ts***

And after you did that, would be great if you'd leave another trace about that in [blue sky](https://bsky.app) with this content (including link):

*[I really read it! 🤓](#ignorance) <br/>
#sapcap*
{.indent}

... as a motivation for us to keep on writing, and that it is worth the effort.

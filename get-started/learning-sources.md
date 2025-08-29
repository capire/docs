---
status: released

---

# Learning Sources



[[toc]]



## This Documentation

This documentation — named _'capire'_, italian for understand — is the primary source of information for the SAP Cloud Application Programming Model.

It's organized as follows:

| Section                                                                                  | Description                                                                                                        |
|------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| [Getting&nbsp;Started](./) <br/> [Cookbook](../guides/) <br/> [Advanced](../advanced/)   | **Task-oriented guides** that walk you through the most common tasks and advanced topics in CAP-based development. |
| [CDS](../cds/) <br/> [Java](../java/) <br/> [Node](../node.js/) <br/> [Tools](../tools/) | **Reference docs** for respective areas.                                                                           |
| [Plugins](../plugins/)                                                                   | **Curated list of plugins** that extend the capabilities of the CAP framework.                                     |
| [Releases](../releases/)                                                                 | The place where you can stay up to date with the most recent information about new features and changes in CAP.        |


### Node/Java Toggles


### Feature Status Badges

Within the docs, you find badges that indicate the status of a feature, or API.
Here's a list of the badges and their meanings:

| Badge                                   | Description                                                                                                                                                        |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| <Since version="1.2.3" of="@sap/..." /> | The marked feature is available with the given version or higher                                                                                                   |
| <Alpha />                               | Alpha features are experimental. They may never be generally available. If released subsequently, the APIs and behavior might change                               |
| <Beta />                                | Beta features are planned to be generally available in subsequent releases, however, APIs and their behavior are not final and may change in the general release   |
| <Concept />                             | Concept features are ideas for potential future enhancements and an opportunity for you to give feedback. This is not a commitment to implement the feature though |
| <Internal />                            | SAP specific features, processes, or infrastructure. Examples are _Deploy with Confidence_, _SAP product standards_, or _xMake_                                    |


### CAP Notebooks Integration





## Sample Projects

In here, we collected several interesting sample projects for you. Not all of them are maintained by the CAP team, not all of them cover CAP in its entirety, but they are well-prepared sources we can recommend for your learning. From the short description we provide for every resource, you're hopefully able to tell if that fits to the need you're currently having.

<style scoped>
  main .vp-doc a:has(> img) {
    display: inline-flex;
    align-items: center;
    transition: opacity 0.2s;
   }
   main .vp-doc a.node img {
      content: url(../assets/logos/nodejs.svg);
      height:3em;
      display:inline;
      margin:0 0.2em;
      padding-top:11px;
   }
   main .vp-doc a.java img {
      content: url(../assets/logos/java.svg);
      height:3em;
      display:inline;
      margin:0 0.2em;
      padding-bottom:5px;
   }main .vp-doc a.github img {
      content: url(../assets/logos/github.svg);
      height:3em;
      display:inline;
      margin:0 0.2em;
      padding-bottom:5px;
   }
   main .vp-doc a:has(> img):hover {
      opacity: 0.7;
   }
   main .vp-doc a:has(> img):not(:last-child) {
      margin-right: 1em;
   }
   main .vp-doc blockquote {
      position: absolute;
      margin-top: -50px;
      right: 0px;
      border: none;
   }
   h3 + blockquote + p {
      padding-left: 22px;
      padding-right: 111px;
   }
</style>


### Bookshop by capire {.github}

> [![]()](https://github.com/sap-samples/cloud-cap-samples-java){.java}
> [![]()](https://github.com/sap-samples/cloud-cap-samples){.node}

The bookshop sample is our original sample provided by the CAP team and featured in the [getting started guides](../get-started/in-a-nutshell).
It's available in both Node.js and Java. The Node.js variant contains additional samples besides bookshop that demonstrate various features of CAP.


### Incidents Mgmt {.github}

> [![]()](https://github.com/cap-java/incidents-app){.java}
> [![]()](https://github.com/cap-js/incidents-app){.node}

A reference sample application for CAP and the SAP BTP Developer Guide.


### CAP SFlight {.github}

> [![]()](https://github.com/sap-samples/cap-sflight){.java}
> [![]()](https://github.com/capire/xtravels){.node}

This sample is a CAP adaptation of the popular [SFLIGHT](https://blog.sap-press.com/what-is-sflight-and-the-flight-and-booking-data-model-for-abap) sample app in ABAP. It's a great source for how to add SAP **Fiori** applications to a CAP project, including adding UI test suites on various stacks.


### Star Wars App {.github}

> [![]()](https://github.com/SAP-samples/cloud-cap-hana-swapi){.node}

SWAPI - the Star Wars API. This sample is based upon the sample at [swapi.dev](https://swapi.dev) which in turn was based upon [swapi.co](https://swapi.dev/about). The original source can be found at https://github.com/Juriy/swapi.

The projects described previously have fallen out of maintenance but still offered the opportunity for a fun yet challenging learning experience from a non-trivial data model. The many bi-directional, many-to-many relationships with the data provide a good basis for an SAP Cloud Application Programming Model and Fiori Draft UI sample. {.indent}


### BTP SusaaS App {.github}

> [![]()](https://github.com/SAP-samples/btp-cap-multitenant-saas){.node}

The Sustainable SaaS (SusaaS) sample application has been built in a partner collaboration to help interested developers, partners, and customers in developing multitenant Software as a Service applications using CAP and deploying them to the SAP Business Technology Platform (SAP BTP).



### Partner Reference App {.github}

> [![]()](https://github.com/SAP-samples/partner-reference-application){.node}

The Partner Reference Application repository provides you with a “golden path” to becoming a SaaS provider of multitenant applications based on the SAP Business Technology Platform (SAP BTP).
The guidance covers building, running, and integrating scalable full-stack cloud applications. It includes an ERP-agnostic design that lets you deliver your application as a side-by-side extension to consumers using any SAP solution, such as SAP S/4HANA Cloud, SAP Business One, and SAP Business ByDesign.

By using BTP services and the SAP Cloud Application Programming Model (CAP), your application meets SAP standards for enterprise-class business solutions. It offers a harmonized user experience and seamless integration, including:
- centralized identity and access management,
- a common launchpad,
- cross-application front-end navigation,
- and secure back-channel integration.

The repository includes the “Poetry Slam Manager” application as a ready-to-run example. It also provides tutorials on how to build the application from scratch using an incremental development approach.
Based on this sample application, you find the bill of materials and a sizing example. This addresses the question "Which BTP resources do I need to subscribe to and in what quantities?" and serves as a basis for cost calculation.

<span id="prdstdcap" />

## Open Source Projects

- Plugins by SAP + CAP Teams
- Plugins by Community
- ...


## Learning Journeys

- [Getting started with SAP Cloud Application Programming Model](https://learning.sap.com/learning-journeys/getting-started-with-sap-cloud-application-programming-model) (Beginner)
- [Building side-by-side extensions on SAP BTP](https://learning.sap.com/learning-journeys/build-side-by-side-extensions-on-sap-btp) (Intermediate)

## SAP Discovery Center Missions
- [Develop a Full-Stack CAP Application Following the SAP BTP Developer's Guide](https://discovery-center.cloud.sap/missiondetail/4327/4608/)
- [Develop a Side-by-Side CAP-Based Extension Application Following the SAP BTP Developer's Guide](https://discovery-center.cloud.sap/missiondetail/4426/4712/)
- [Implement Observability in a Full-Stack CAP Application Following SAP BTP Developer's Guide](https://discovery-center.cloud.sap/missiondetail/4432/4718/)


## Tutorials

- [TechEd 2023 Hands-On Session AD264 – Build Extensions with CAP](https://github.com/SAP-samples/teched2023-AD264/)
- [TechEd 2022 Hands-On Session AD264 – Verticalization, Customization, Composition](https://github.com/SAP-archive/teched2022-AD264)
- [Build a Business Application Using CAP for Node.js](https://developers.sap.com/mission.cp-starter-extensions-cap.html)
- [Build a Business Application Using CAP for Java](https://developers.sap.com/mission.cap-java-app.html)
- [CAP Service Integration CodeJam](https://github.com/sap-samples/cap-service-integration-codejam) by DJ Adams



## Videos

- [The Art and Science of CAP](https://www.youtube.com/playlist?list=PL6RpkC85SLQAe45xlhIfhTYB9G0mdRVjI) <br> by DJ Adams and Daniel Hutzel
- [Back to basics: CAP Node.js](https://www.youtube.com/playlist?list=PL6RpkC85SLQBHPdfHQ0Ry2TMdsT-muECx) <br> by DJ Adams
- [Hybrid Testing and Alternative DBs](https://youtu.be/vqub4vJbZX8?si=j5ZkPR6vPb59iBBy) <br> by Thomas Jung
- [Consume External Services](https://youtu.be/rWQFbXFEr1M) <br> by Thomas Jung
- [Building a CAP app in 60 min](https://youtu.be/zoJ7umKZKB4) <br> by Martin Stenzig
- [Integrating an external API into a CAP service](https://youtu.be/T_rjax3VY2E) <br> by DJ Adams



## Blogs

- [Surviving and Thriving with the SAP Cloud Application Programming Model](https://community.sap.com/t5/tag/CAPTricks/tg-p/board-id/technology-blog-sap)  <br> by Max Streifeneder (2023)
- [Multitenant SaaS applications on SAP BTP using CAP? Tried-and-True!](https://community.sap.com/t5/technology-blogs-by-sap/multitenant-saas-applications-on-sap-btp-using-cap-tried-and-true/ba-p/13541907) <br> by Martin Frick (2022)

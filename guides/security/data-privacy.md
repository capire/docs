---
synopsis: >
    This guide discusses how CAP helps applications to comply with data privacy regulations imposed by various laws and standards.
status: released
---



# Data Privacy

{{ $frontmatter.synopsis }}

::: warning
SAP does not give any advice on whether the features and functions provided to facilitate meeting data privacy obligations are the best method to support company, industry, regional, or country/region-specific requirements. Furthermore, this information should not be taken as advice or a recommendation regarding additional features that would be required in specific IT environments. Decisions related to data protection must be made on a case-by-case basis, considering the given system landscape and the applicable legal requirements.
:::

[[toc]]




## Introduction to Data Privacy


Data protection is associated with numerous legal requirements and privacy concerns, such as the EU's [General Data Protection Regulation](https://en.wikipedia.org/wiki/General_Data_Protection_Regulation). In addition to compliance with general data protection and privacy acts regarding [personal data](https://en.wikipedia.org/wiki/Personal_data), you need to consider compliance with industry-specific legislation in different countries/regions.

CAP supports applications in their obligations to comply to data privacy regulations, by automating tedious tasks as much as possible based on annotated models. That is, CAP provides easy ways to designate personal data, as well as out-of-the-box integration with SAP BTP services, which enable you to fulfill specific data privacy requirements in your application. This relieves application developers of these tedious tasks and related efforts.

![Shows with which solutions CAP annotations can be used out of the box, as described in the following table.](./assets/data-privacy/Data-Privacy.drawio.svg){style="zoom:111%;"}

> For general information about data protection and privacy (DPP) on SAP BTP, see the SAP BTP documentation under [Data Protection and Privacy](https://help.sap.com/docs/btp/sap-business-technology-platform/data-protection-and-privacy).




### In a Nutshell

The most essential requests you have to answer are those in the following table. The table also shows the basis of the requirement and the corresponding discipline for the request:

| Question / Request                          | Obligation                                      | Solution                            |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| *What data about me do you have stored?*    | [Right of access](#right-of-access)             | [Personal Data Management](dpp-pdm.md)  |
| *Please delete all personal data about me!* | [Right to be forgotten](#right-to-be-forgotten) | [Data Retention Management](dpp-drm.md) |
| *When was personal data stored/changed?*    | [Transparency](#transparency)                   | [Audit Logging](dpp-audit-logging.md)   |



<span id="intro" />





## Annotating Personal Data

The first and frequently only task to do as an application developer is to identify entities and elements (potentially) holding personal data using `@PersonalData` annotations. These are used to automate CAP-facilitated audit logging, personal data management, and data retention management as much as possible.

[Learn more in the *Annotating Personal Data* chapter](dpp-annotations) {.learn-more}



## Automatic Audit Logging {#transparency}

The **Transparancy** obligation, requests to be able to report with whom data stored about an individual is shared and where that came from (for example, [EU GDPR Article 15(1)(c,g)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504&qid=1692819634946#tocId22)).

The [SAP Audit Log Service](https://help.sap.com/docs/btp/sap-business-technology-platform/audit-logging-in-cloud-foundry-environment) stores all audit logs for a tenant in a common, compliant data store and allows auditors to search through and retrieve the respective logs when necessary.

[Learn more in the *Audit Logging* guide](dpp-audit-logging) {.learn-more}



## Personal Data Management { #right-of-access }

The [**Right of Access** to personal data](https://en.wikipedia.org/wiki/Right_of_access_to_personal_data) "gives people the right to access their personal data and information about how this personal data is being processed".

The [SAP Personal Data Manager](https://help.sap.com/docs/personal-data-manager) allows you to inform individuals about the data you have stored regarding them.

[Learn more in the *Personal Data Management* guide](dpp-pdm) {.learn-more}



## Data Retention Management { #right-to-be-forgotten }

The [**Right to be Forgotten**](https://en.wikipedia.org/wiki/Right_to_be_forgotten) gives people "the right to request erasure of personal data related to them on any one of a number of grounds [...]".

The [SAP Data Retention Manager](https://help.sap.com/docs/data-retention-manager) allows you to manage retention and residence rules to block or destroy personal data.

<!-- [Learn more in the *Data Retention Management* guide](drm) {.learn-more} -->





## Personal Data stored by CAP

CAP doesn't store or manage any personal data on its own with some exceptions, which are mandatory to operate the applications properly:

- Log outputs on verbose level might contain personal data such as user names and IP addresses. 
Connect an adequate logging service to meet compliance requirements such as [SAP Application Logging Service](https://help.sap.com/docs/application-logging-service/sap-application-logging-service/sap-application-logging-service-for-cloud-foundry-environment).

- Draft-enabled entities store user information for the time periods when drafts are created or modified.

- When using the [managed](../domain-modeling#managed-data) aspect, you decided to store metadata such as who created or modified an entity instance.

- Messages temporarily written to transaction outbox might contain personal data. 
If necessary, applications can process these messages by standard CAP functionality (CDS model `@sap/cds/srv/outbox`).

Also refer to related guides of most important platform services: 

[SAP Cloud Identity Services - Configuring Privacy Policies](https://help.sap.com/docs/IDENTITY_AUTHENTICATION/6d6d63354d1242d185ab4830fc04feb1/ed48466d770f4519aa23bba754851fbd.html){.learn-more}
[SAP HANA Cloud - Data Protection and Privacy](https://help.sap.com/docs/HANA_CLOUD_DATABASE/c82f8d6a84c147f8b78bf6416dae7290/ad9588189e844092910103f2f7b1c968.html){.learn-more}

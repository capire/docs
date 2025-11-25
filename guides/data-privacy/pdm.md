---
label: Personal Data Management
shorty: PDM
synopsis: >
  Use the SAP Personal Data Manager (PDM) with a CAP application.
breadcrumbs:
  - Cookbook
  - Data Privacy
  - PDM
status: released
---



# Personal Data Management

{{ $frontmatter.synopsis }}

:::warning To follow this cookbook hands-on you need an enterprise account.
The SAP Personal Data Manager service is currently only available for [enterprise accounts](https://discovery-center.cloud.sap/missiondetail/3019/3297/). An entitlement in trial accounts is not possible.
:::

SAP BTP provides the [*SAP Personal Data Manager (PDM)*](https://help.sap.com/docs/PERSONAL_DATA_MANAGER) which allows administrators to respond to the question "What data of me do you have?". To answer this question, the PDM service needs to fetch all personal data using an OData endpoint. That endpoint has to be provided by the application as follows.

[[toc]]

## Annotate Personal Data

First identify entities and elements (potentially) holding personal data using `@PersonalData` annotations, as explained in detail in the [*Annotating Personal Data* chapter](annotations) of these guides.

> We keep using the [Incidents Management reference sample app](https://github.com/cap-js/incidents-app).

## Provide a Service Interface to SAP Personal Data Manager

SAP Personal Data Manager needs to call into your application to read personal data so you have to define a respective service endpoint, complying to the interface required by SAP Personal Data Manager.
Following the CAP principles, we recommend adding a new dedicated CAP service that handles all the personal data manager requirements for you. This keeps the rest of your data model clean and enables reuse, just as CAP promotes it.



### CAP Service Model for SAP Personal Data Manager

Following the [best practice of separation of concerns](../domain-modeling#separation-of-concerns), we create a dedicated service for the integration with SAP Personal Data Manager:

::: code-group
```cds [srv/pdm-service.cds]
using {sap.capire.incidents as db} from '../db/schema';

@requires: 'PersonalDataManagerUser' // security check
service PDMService @(path: '/pdm') {

  // Data Privacy annotations on 'Customers' and 'Addresses' are derived from original entity definitions
  entity Customers                as projection on db.Customers;
  entity Addresses                as projection on db.Addresses;
  entity Incidents                as projection on db.Incidents

  // create view on Incidents and Conversations as flat projection
  entity IncidentConversationView as
      select from Incidents {
              ID,
              title,
              urgency,
              status,
          key conversation.ID        as conversation_ID,
              conversation.timestamp as conversation_timestamp,
              conversation.author    as conversation_author,
              conversation.message   as conversation_message,
              customer.ID            as customer_ID,
              customer.email         as customer_email
      };

  // annotate new view
  annotate PDMService.IncidentConversationView with @(PersonalData.EntitySemantics: 'Other') {
      customer_ID @PersonalData.FieldSemantics: 'DataSubjectID';
  };

  // annotations for Personal Data Manager - Search Fields
  annotate Customers with @(Communication.Contact: {
        n    : {
            surname: lastName,
            given  : firstName
        },
        bday : dateOfBirth,
        email: [{
          type   : #preferred,
          address: email}]
    });

  };


```
:::

::: tip
Make sure to have [indicated all relevant entities and elements in your domain model](annotations).
:::



### Provide Flat Projections

As an additional step, you have to create flat projections on the additional business data, like transactional data.

In our model, we have `Incidents` and `Conversations`, which are connected via a composition. Since SAP Personal Data Manager needs flattened out structures, we define a helper view `IncidentConversationView` to flatten this out.

We have to then add data privacy-specific annotations to this new view as well. The `IncidentConversationView` as transactional data is marked as `Other`. In addition, it is important to tag the correct field, which defines the corresponding data subject, in our case that is `customer_ID @PersonalData.FieldSemantics: 'DataSubjectID';`



### Annotating Search Fields

In addition, the most important search fields of the data subject have to be annotated with the corresponding annotation `@Communication.Contact`.

To perform a valid search in the SAP Personal Data Manager application, you will need _Surname_, _Given Name_, and _Email_ or the _Data Subject ID_. Details about this annotation can be found in
[Communication Vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Communication.md).

Alternatively to the tuple _Surname_, _Given Name_, and _Email_, you can also use _Surname_, _Given Name_, and _Birthday_ (called `bday`), if available in your data model. Details about this can be found in
[SAP Personal Data Manager - Developer Guide](https://help.sap.com/docs/personal-data-manager/4adcd96ce00c4f1ba29ed11f646a5944/v4-annotations?q=Contact&locale=en-US).



### Restrict Access Using the `@requires` Annotation

To restrict access to this sensitive data, the `PDMservice` is protected by the `@requires: 'PersonalDataManagerUser'` annotation. Calling the `PDMservice` externally without the corresponding permission is forbidden. The Personal Data Manager service calls the `PDMservice` with the needed role granted. This is configured in the _xs-security.json_ file, which is explained later.

[Learn more about security configuration and the SAP Personal Data Manager.](https://help.sap.com/docs/PERSONAL_DATA_MANAGER/620a3ea6aaf64610accdd05cca9e3de2/4ee5705b8ded43e68bde610223722971.html#loio8eb6d9f889594a2d98f478bd57412ceb){.learn-more}




At this point, you are done with your application. Let's set up the SAP Personal Data Manager and try it out.


<span id="before-pdm" />

## Connecting SAP Personal Data Manager

Next, we will briefly detail the integration to SAP Personal Data Manager.
A more comprehensive guide, incl. tutorials, is currently under development.
For further details, see the [SAP Personal Data Manager Developer Guide](https://help.sap.com/docs/personal-data-manager/4adcd96ce00c4f1ba29ed11f646a5944/what-is-personal-data-manager).

### Activate Access Checks in _xs-security.json_

Because we protected the `PDMservice`, we need to establish the security check properly. In particular, you need the _xs-security.json_ file to make the security check active. The following _xs-security.json_ is from our sample.

```json
{
  "xsappname": "incidents-mgmt",
  "tenant-mode": "shared",
  "scopes": [
    {
      "name": "$XSAPPNAME.PersonalDataManagerUser",
      "description": "Authority for Personal Data Manager",
      "grant-as-authority-to-apps": [
        "$XSSERVICENAME(pdm)"
      ]
    }
  ]
}
```

Here you define that your personal data manager service instance, called `pdm`, is allowed to access your CAP application granting the `PersonalDataManagerUser` role.



### Add `@sap/xssec` Library

To make the authentication work, you have to enable the security strategy by installing the `@sap/xssec` package:

```sh
npm install @sap/xssec
```

[Learn more about authorization in CAP using Node.js.](../../node.js/authentication#jwt){.learn-more}

### Build and Deploy Your Application

The Personal Data Manager can't connect to your application running locally. Therefore, you first need to deploy your application. In our sample, we added two manifest files using `cds add cf-manifest` and SAP HANA configuration using `cds add hana`.

The general deployment is described in detail in [Deploy Using Manifest Files](../deployment/to-cf).

Make a production build:

```sh
cds build --production
```

Deploy your application:

```sh
cf create-service-push
```



### Subscribe to SAP Personal Data Manager Service

[Subscribe to the service](https://help.sap.com/docs/PERSONAL_DATA_MANAGER/620a3ea6aaf64610accdd05cca9e3de2/ef10215655a540b6ba1c02a96e118d66.html) from the _Service Marketplace_ in the SAP BTP cockpit.

![A screenshot of the tile in the cockpit for the SAP Personal Data Manager service.](assets/pdmCockpitCreate.png){width="300"}

Follow the wizard to create your subscription.



### Create Role Collections

SAP Personal Data Manager comes with the following roles:

Role Name | Role Template
----------|------
PDM_Administrator | PDM_Administrator
PDM_CustomerServiceRepresentative | PDM_CustomerServiceRepresentative
PDM_OperatorsClerk | PDM_OperatorsClerk

All of these roles have two different _Application Identifiers_.
::: tip
Application identifiers with **!b** are needed for the UI, and identifiers with **!t** are needed for executing the Postman collection.
:::

[Learn more about defining a role collection in SAP BTP cockpit](https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/4b20383efab341f181becf0a947a5498.html){.learn-more}



### Create a Service Instance

You need a configuration file, like the following, to create a service instance for the Personal Data Manager.

`pdm-instance-config.json`
```json
{
  "xs-security": {
    "xsappname": "incidents-mgmt",
    "authorities": ["$ACCEPT_GRANTED_AUTHORITIES"]
  },
  "fullyQualifiedApplicationName": "incidents-mgmt",
  "appConsentServiceEnabled": true
}


```

Create a service instance using the SAP BTP cockpit or execute the following command:

```sh
cf create-service personal-data-manager-service standard incidents-mgmt-pdm -c ./pdm-instance-config.json
```



### Bind the Service Instance to Your Application.

With both the application deployed and the SAP Personal Data Manger service set up, you can now bind the service instance of the Personal Data Manager to your application. Use the URL of your application in a configuration file, such as the following example, which you need when binding a service instance.

`pdm-binding-config.json`
```json
{
  "fullyQualifiedApplicationName": "incidents-mgmt",
  "fullyQualifiedModuleName": "incidents-mgmt-srv",
  "applicationTitle": "PDM Incidents",
  "applicationTitleKey": "PDM Incidents",
  "applicationURL": "https://incidents-mgmt-srv.cfapps.eu10.hana.ondemand.com/", // get the URL from the CF CLI command: cf apps
  "endPoints": [
    {
      "type": "odatav4",
      "serviceName": "pdm-service",
      "serviceTitle": "Incidents Management",
      "serviceTitleKey": "IncidentsManagement",
      "serviceURI": "pdm",
      "hasGdprV4Annotations": true,
      "cacheControl": "no-cache"
    }
  ]
}
```

Here the `applicationURL`, the `fullyQualifiedModuleName`, and the `serviceURI` have to be those of your Cloud Foundry deployment and your CAP service definition (_services-manifest.yaml_).

Bind the service instance using the SAP BTP cockpit or execute the following command:

```sh
cf bind-service incidents-mgmt-srv incidents-mgmt-pdm -c ./pdm-binding-config.json
```



## Using the SAP Personal Data Manager Application

Open the SAP Personal Data Manager application from the _Instances and Subscriptions_ page in the SAP BTP cockpit.

![To open the application, open the three dot menu and select "Go to Application".](assets/pdmCockpit.png){width="500"}

In the personal data manager application you can search for data subjects with _First Name_, _Last Name_, and _Date of Birth_, or alternatively with their _ID_.

![A screenshot of the SAP Personal Data Manager application.](assets/pdmApplication.png){width="500"}
---
synopsis: >
  The Data Retention Management (DRM) guide is under construction. It will cover concepts and implementation details for managing the retention and deletion of personal data in compliance with data privacy regulations.
# status: released
---



# Data Retention Management

Under construction.



<!-- Build that as own guide as soon as it's ready

## Retention Manager

Goal – find out which personal data has to be deleted at a certain point in time.

When?
Find out the correct time for deletion.

What?
Find out the correct amount of data to be deleted.


To support this, we'll invent some new CDS annotation to mark all possible candidates for 'End of Business' indicating time fields in each legal ground (like Consent, Order etc.).

This new CDS annotation for "End of Business" indicators will serve as input for the retention manager.

An additional configuration at the customer site per type of transactional document defines the actual retention time (like 2 years, 5 years, etc.).
Finally, the retention manager searches all candidates (of natural persons) for possible deletion (across all object types).

Finally, the search results will be cross checked:
Check all legal grounds, if deletion of certain data really is allowed.                                                                (One active Legal ground is sufficient to stop the deletion!)

CDS could support this process by building certain queries - based on annotations - to find out which legal ground is invalid at a certain point in time (tt.mm.yyyy) and no other legal ground (of the same type) per person (DataSubject) exists.

Static implementation for such queries already exists. We try to bring this on a dynamic meta-data-driven level with help of CDS annotations and CDS queries.
 
## Consent Repository

The consent repository is already built with help of CAP and therefore with CDS and with full OData support.

See the [Concent Management Documentation](https://github.../foundation-apps/ConsentManagementDocumentation) for more details.

## Central Business Partner

To reuse the Business Partner from an SAP S/4HANA system, a central Business Partner service is created. If your application makes use of this Business Partner service, you only have to annotate the relation to the Business Partner and your application can make use of the service. In addition, all settings that are necessary to integrate all DPP processes will be performed automatically.

-->

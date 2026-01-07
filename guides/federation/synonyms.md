# HANA Synonyms

HANA synonyms provide a way to create alternative names for database objects, such as tables or views, in external databases. This allows CAP applications to seamlessly integrate with external data sources by referencing these synonyms within their own database schema. This guide covers the usage of HANA synonyms in CAP applications, including how to create and manage synonyms, and how to use them to access external database objects.
{.abstract}

## Creating HANA Synonyms
To create a HANA synonym, you can use the following SQL syntax:

```sql
CREATE SYNONYM <synonym_name> FOR <external_object>;
```   
Where `<synonym_name>` is the name you want to assign to the synonym, and `<external_object>` is the fully qualified name of the external database object you want to reference.
## Using HANA Synonyms in CAP Applications
Once you have created a synonym, you can use it in your CAP application's CDS models and queries just like any other database object. For example, you can define an entity in your CDS model that references a synonym:   
```cds
entity ExternalData @(cds.persistence.table: 'SYNONYM_NAME') {
  key ID : UUID;
  Name   : String;         
  Description : String;
}
```
In this example, the `ExternalData` entity references the `SYNONYM_NAME`
synonym, allowing you to access the external database object through the CAP application's data model.
## Managing HANA Synonyms
You can manage HANA synonyms using standard SQL commands. For example, to drop a synonym, you can use the following command:
```sql
DROP SYNONYM <synonym_name>;
```
To view the details of a synonym, you can query the HANA system views, such as `SYNONYMS`:
```sql
SELECT * FROM SYS.SYNONYMS WHERE SYNONYM_NAME = '<synonym_name>';
```   
This will provide information about the synonym, including the external object it references and its schema.
## Best Practices
- Ensure that the external database objects referenced by synonyms are accessible and have the necessary permissions for your CAP application to interact with them.
- Regularly review and update synonyms to reflect any changes in the external database schema.
- Use meaningful names for synonyms to improve code readability and maintainability.
By leveraging HANA synonyms, CAP applications can effectively integrate with external databases, enabling seamless data access and manipulation across different data sources.   

## Further Reading
- [HANA Virtual Tables](virtual-tables.md)
- [Service-level Replication](service-level-replication.md)
- [HANA Data Products](data-products.md)  

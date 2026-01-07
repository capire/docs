# HANA Virtual Tables

HANA virtual tables allow CAP applications to access and manipulate data stored in external databases as if it were part of the CAP application's own database. This guide describes how to set up and use HANA virtual tables in CAP applications, including configuration steps, usage patterns, and best practices for performance optimization.
{.abstract}

## Prerequisites
- A CAP application with a HANA database.
- Access to an external database that supports virtual tables (e.g., another HANA database).
- Appropriate privileges to create virtual tables in the HANA database.
## Setting Up HANA Virtual Tables

## Step 1: Configure the External Data Source
1. In your HANA database, create a remote data source that points to the external database. You can do this using the HANA Studio or the HANA Cockpit.
2. Provide the necessary connection details, such as the host, port, user credentials, and database name.   
## Step 2: Create Virtual Tables
1. Once the remote data source is configured, you can create virtual tables in your HANA database that reference the tables in the external database.
2. Use the following SQL command to create a virtual table:
   ```sql
   CREATE VIRTUAL TABLE <virtual_table_name> AT <remote_data_source_name>.<external_table_name>;
   ```
3. Replace `<virtual_table_name>`, `<remote_data_source_name>`, and `<external_table_name>` with the appropriate names.
## Step 3: Access Virtual Tables in CAP Applications
1. In your CAP application, define an entity in your CDS model that corresponds to the virtual table.
2. Use the entity in your service definitions and handlers just like any other entity in your CAP application.
3. You can perform CRUD operations on the virtual table entity, and CAP will handle the communication with the external database.
## Best Practices
- Monitor the performance of queries against virtual tables, as they may be slower than local tables due to network latency.
- Use appropriate indexing and optimization techniques on the external database to improve query performance.
- Consider using caching strategies in your CAP application to reduce the number of calls to the external database.
- Ensure that the external database is highly available to prevent disruptions in your CAP application.     
- Regularly review and update the connection settings for the remote data source to maintain security and performance.
## Conclusion
HANA virtual tables provide a powerful way to integrate external data sources into your CAP applications. By following the steps outlined in this guide, you can set up and utilize virtual tables effectively, enabling seamless access to distributed data.

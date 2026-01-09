# Database-Agnostic CDS Models
 
When designing your CDS models, it's best to stay database-agnostic to ensure portability across different database systems. This guide provides best practices and considerations for achieving database portability with CDS.
{.abstract}

[[toc]]

## Use Standard CDS Constructs

Stick to standard CDS constructs and avoid database-specific extensions or features. This ensures that your models can be deployed on any supported database without modification.
## Avoid Vendor-Specific Data Types
Use generic data types provided by CDS instead of vendor-specific types. For example, use `String` instead of `NVARCHAR` or `Integer` instead of `INT4`. This helps maintain compatibility across different database systems.
## Test with Multiple Databases
Regularly test your CDS models against different database systems during development. This helps identify any compatibility issues early on and ensures that your models work as expected across various databases.
## Use Database Profiles
Leverage CDS profiles to define database-specific configurations. This allows you to switch between different databases easily without changing your CDS models.
## Abstract Database Logic
If your application requires database-specific logic, consider abstracting it into separate services or layers. This keeps your CDS models clean and focused on the domain logic.
## Stay Updated with CDS Changes
Keep an eye on updates to the CDS language and tooling. New features or changes may impact database portability, so staying informed helps you adapt your models accordingly.
## Conclusion 
By following these best practices, you can ensure that your CDS models remain portable across different database systems, making your applications more flexible and easier to maintain.

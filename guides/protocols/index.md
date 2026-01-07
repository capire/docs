# Service Protocols in CAP

CAP supports multiple service protocols to expose your application data and functionality. This guide provides an overview of the available protocols and how to use them in your CAP applications.
## Available Protocols
CAP supports the following service protocols:
- **Core Data APIs**: CAP provides core data APIs that allow you to interact with your data models programmatically, regardless of the underlying protocol.
- **OData**: A widely used protocol for building and consuming RESTful APIs. CAP provides built-in support for OData v2 and v4, allowing you to easily expose your data models as OData services.
- **OpenAPI**: A specification for building APIs that allows you to define your API endpoints, request/response formats, and authentication methods. CAP can generate OpenAPI specifications for your services, enabling easy integration with other systems.
- **AsyncAPI**: A specification for defining asynchronous APIs, such as those using messaging protocols. CAP supports AsyncAPI for building event-driven applications and integrating with messaging systems.
## Using Protocols in CAP
To use a specific protocol in your CAP application, you typically need to configure your service definitions and handlers accordingly. Here are some general steps to get started:
1. **Define Your Data Model**: Use CDS (Core Data Services) to define your data models and entities.
2. **Create Service Definitions**: Define your services in CDS, specifying the entities and operations you want to expose.
3. **Configure Protocols**: Depending on the protocol you want to use, you may need to add specific annotations or configurations in your service definitions.
4. **Implement Service Handlers**: Write the necessary logic to handle requests and responses for your services.
5. **Deploy and Test**: Deploy your CAP application and test the exposed services using tools like Postman or Swagger UI.
## Further Reading
For more detailed information on each protocol and how to implement them in CAP, refer to the following guides:
- [Core Data APIs](core-data-apis.md)
- [OData APIs](odata.md)
- [OpenAPI](openapi.md)
- [AsyncAPI](asyncapi.md)
These guides provide step-by-step instructions, examples, and best practices for working with each protocol in your CAP applications.
## Conclusion
Leveraging the various service protocols supported by CAP allows you to build flexible and interoperable applications. Whether you are exposing RESTful APIs with OData, defining APIs with OpenAPI, or building event-driven applications with AsyncAPI, CAP provides the tools and capabilities to meet your integration needs.

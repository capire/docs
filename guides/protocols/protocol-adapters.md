# Protocol Adapters

CAP supports various protocols to expose and consume services. These protocols are implemented via protocol adapters that translate between the CAP programming model and the respective protocol.
You can find an overview of the supported protocols in the [Protocols](./index.md) guide.
{.abstract}

## Built-in Protocol Adapters
CAP comes with built-in protocol adapters for the most common protocols:
- **OData**: The OData protocol adapter is the default protocol adapter in CAP. It allows you to expose and consume services using the OData protocol, which is widely used for building RESTful APIs.
- **OpenAPI**: The OpenAPI protocol adapter allows you to expose and consume services using the OpenAPI specification, which is a standard for describing RESTful APIs.
- **AsyncAPI**: The AsyncAPI protocol adapter allows you to expose and consume services using the AsyncAPI specification, which is a standard for describing asynchronous APIs.
- **Core Data Services (CDS) APIs**: The CDS APIs protocol adapter allows you to expose and consume services using the CDS programming model.
## Custom Protocol Adapters
In addition to the built-in protocol adapters, CAP also allows you to create custom protocol adapters. This is useful if you need to support a protocol that is not supported by the built-in adapters.
To create a custom protocol adapter, you need to implement the `ProtocolAdapter` interface. This interface defines the methods that a protocol adapter must implement to translate between the CAP programming model and the respective protocol.

## Using Protocol Adapters
To use a protocol adapter in your CAP application, you need to register the adapter with the CAP runtime. You can do this by using the `cds.serve()` method and specifying the protocol adapter to use.
Here is an example of how to use the OData protocol adapter in a CAP application:
```javascript
const cds = require('@sap/cds');
cds.serve('my-service').from('srv/my-service').with('odata');
```
In this example, the `cds.serve()` method is used to expose the `my-service` service using the OData protocol adapter.


## Further Reading
- [Protocols Overview](./index.md)
- [Core Data APIs](./core-data-apis.md)
- [OData](./odata.md)
- [OpenAPI](./openapi.md)
- [AsyncAPI](./asyncapi.md)
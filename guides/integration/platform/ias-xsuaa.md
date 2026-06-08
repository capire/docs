# Identity & Authentication

The SAP Cloud Platform provides two main services for identity management and authentication: **SAP Identity Authentication Service (IAS)** and **SAP Authorization and Trust Management Service (XSUAA)**.
CAP applications can be configured to use either or both of these services for handling user authentication and authorization.
{.abstract}

## SAP Identity Authentication Service (IAS)

SAP IAS is a cloud-based identity provider that offers single sign-on (SSO) capabilities and identity federation.
It allows users to authenticate using various methods, including social logins, enterprise identity providers, and multi-factor authentication.

When integrated with CAP applications, IAS can serve as the primary identity provider, managing user identities and authentication flows. 

To integrate IAS with a CAP application, you typically need to configure the application to trust IAS as an identity provider and set up the necessary SSO protocols (e.g., SAML, OAuth2).
For more details on configuring IAS with CAP applications, refer to the [SAP IAS documentation](https://help.sap.com/viewer/product/SAP_IDENTITY_AUTHENTICATION/).
## SAP Authorization and Trust Management Service (XSUAA)
XSUAA is a service that provides authentication and authorization capabilities for applications running on SAP Business Technology Platform (BTP).
It manages user roles, permissions, and OAuth2 token issuance.
When a CAP application is integrated with XSUAA, it can leverage the service to authenticate users and enforce authorization policies based on roles defined in the XSUAA service instance.
To set up XSUAA with a CAP application, you need to create an XSUAA service instance, define roles and role collections, and configure the CAP application to use XSUAA for authentication and authorization.
For more information on configuring XSUAA with CAP applications, refer to the [SAP XSUAA documentation](https://help.sap.com/viewer/product/SAP_AUTHORIZATION_AND_TRUST_MANAGEMENT/).
## Integration Scenarios
CAP applications can be configured to use IAS, XSUAA, or both services depending on the requirements.
Common scenarios include:  
- **Using IAS for SSO and XSUAA for Authorization**: In this scenario, IAS handles user authentication and SSO, while XSUAA manages user roles and permissions within the CAP application.
- **Using XSUAA as the Primary Identity Provider**: In this case, XSUAA handles both authentication and authorization for the CAP application.
- **Federating Identities between IAS and XSUAA**: This involves configuring trust relationships between IAS and XSUAA to allow seamless authentication and authorization across services.
## Conclusion
Integrating IAS and XSUAA with CAP applications enhances security by providing robust identity management and authorization capabilities.
By leveraging these services, developers can ensure that their applications meet enterprise security standards while providing a seamless user experience.
For more detailed guidance on integrating these services with CAP applications, refer to the official SAP documentation and best practices.

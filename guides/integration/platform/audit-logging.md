# Integration with SAP Audit Logging Service
 
 The [SAP Audit Logging Service](https://help.sap.com/docs/SAP_AUDIT_LOGGING_SERVICE) enables you to record security-relevant events in your applications running on SAP Business Technology Platform (SAP BTP). This guide explains how to integrate your CAP application with the Audit Logging Service.
 
 ## Prerequisites
 
 To use the Audit Logging Service, ensure that:
 
 - Your SAP BTP subaccount has the Audit Logging Service instance created.
 - Your CAP application is bound to the Audit Logging Service instance using a service key.
 
 ## Setting Up Audit Logging in Your CAP Application
 
 1. **Install the Required Package**:
 
    Ensure that you have the `@sap/audit-logging` package installed in your CAP project:
 
    ```bash
    npm install @sap/audit-logging
    ```
 
 2. **Configure the Audit Logger**:
 
    In your application code, configure the audit logger using the service credentials from the service key:
 
    ```javascript
    const { AuditLogger } = require('@sap/audit-logging');
    const auditLogger = new AuditLogger({
      // Provide necessary configuration options here
    });
    ```
 
 3. **Log Events**:
 
    Use the audit logger to log security-relevant events in your application:
 
    ```javascript
    auditLogger.logEvent({
      eventType: 'USER_LOGIN',
      user: 'username',
      details: {
        // Additional event details
      }
    });
    ```
 
 ## Further Reading
 
 For more detailed information on configuring and using the SAP Audit Logging Service, refer to the [official documentation](https://help.sap.com/docs/SAP_AUDIT_LOGGING_SERVICE).
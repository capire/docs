# Adding Attachments to Your CAP Application
 
 You can use the Attachment Service provided by SAP Business Technology Platform to manage file attachments in your CAP applications. This guide explains how to integrate the Attachment Service into your CAP application.
 
 ## Prerequisites
 
 - A CAP project set up on SAP Business Technology Platform.
 - Access to the SAP Business Technology Platform Cockpit.
 - Basic knowledge of CAP and Node.js.
 
 ## Steps to Integrate Attachment Service
 
 1. **Enable Attachment Service**: In the SAP Business Technology Platform Cockpit, navigate to your subaccount and enable the Attachment Service.
 
 2. **Install Required Packages**: In your CAP project, install the necessary packages for working with attachments. You can use the following command:
 
    ```bash
    npm install @sap/cds-srv-attachments
    ```
 
 3. **Configure Attachment Service**: In your `package.json` file, add the Attachment Service configuration under the `cds` section:
 
    ```json
    "cds": {
      "requires": {
        "attachments": {
          "kind": "attachment-service"
        }
      }
    }
    ```
 
 4. **Define Attachment Entity**: In your CDS model, define an entity for attachments. For example:
 
    ```cds
    entity Attachments {
      key ID : UUID;
      Name   : String;
      Content: LargeBinary;
      MimeType: String;
    }
    ```
 
 5. **Implement Attachment Logic**: In your service implementation file (e.g., `srv/your-service.js`), implement the logic to handle attachment operations such as upload, download, and delete.
 
 6. **Test Your Application**: Run your CAP application and test the attachment functionality to ensure everything is working as expected.
 
 ## Conclusion
 
 By following these steps, you can successfully integrate the Attachment Service into your CAP application, allowing you to manage file attachments efficiently. For more detailed information, refer to the official SAP documentation on the Attachment Service.
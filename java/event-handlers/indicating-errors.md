---
synopsis: >
  Learn about the error handling capabilities provided by the CAP Java SDK.
status: released
uacp: Used as link target from Help Portal at https://help.sap.com/products/BTP/65de2977205c403bbc107264b8eccf4b/9186ed9ab00842e1a31309ff1be38792.html
---

# Indicating Errors
<style scoped>
  h1:before {
    content: "Java"; display: block; font-size: 60%; margin: 0 0 .2em;
  }
</style>

{{ $frontmatter.synopsis }}

## Overview

The CAP Java SDK provides two different ways to indicate errors:
- By throwing an exception: This completely aborts the event processing and rollbacks the transaction.
- By using the [Messages](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messages/Messages.html) API: This adds errors, warnings, info, or success messages to the currently processed request, but doesn't affect the event processing or the transaction.

The message texts for both exceptions and the Messages API can use formatting and localization.

## Exceptions

Any exception that is thrown by an event handler method aborts the processing of the current event and causes any active transaction to be rolled back.
To indicate further details about the error, such as a suggested mapping to an HTTP response code, the CAP Java SDK provides a generic unchecked exception class, called [ServiceException](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceException.html).
It's recommended to use this exception class, when throwing an exception in an event handler.

When creating a new instance of `ServiceException` you can specify an [ErrorStatus](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ErrorStatus.html) object, through which an internal error code and a mapping to an HTTP status code can be indicated.
An enum [ErrorStatuses](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ErrorStatuses.html) exists, which lists many useful HTTP error codes already.
If no such error status is set when creating the ServiceException, it defaults to an internal server error (HTTP status code 500).

```java
// default error status
throw new ServiceException("An internal server error occurred", originalException);
// specifying an error status
throw new ServiceException(ErrorStatuses.CONFLICT, "Not enough stock available");
// specifying an error status and the original exception
throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No book title specified", originalException);
```

The OData adapters turn all exceptions into an OData error response to indicate the error to the client.

## Messages

The [Messages](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messages/Messages.html) API allows event handlers to add errors, warnings, info, or success messages to the currently processed request. Adding info, warning or success messages doesn't affect the event processing or the transaction. For error messages by default a `ServiceException` is thrown at the end of the `Before` handler phase.

The `Messages` interface provides a logger-like API to collect these messages. Additional optional details can be added to the [Message](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messages/Message.html) using a builder API.
You can access the `Messages` API from the Event Context:

```java
context.getMessages().success("The order was successfully placed");
```

In Spring, you can also access it using Dependency Injection:

```java
@Autowired
Messages messages;

messages.warn("No book title specified");
messages.error("The book is no longer available").code("BNA").longTextUrl("/help/book-not-available");
```

The OData V4 adapter collects these messages and writes them into the `sap-messages` HTTP header by default.
However, when an OData V4 error response is returned, because the request was aborted by an exception, the messages are instead written into the `details` section of the error response.
Writing the messages into explicitly modeled messages properties isn't yet supported.

SAP Fiori uses these messages to display detailed information on the UI. The style how a message appears on the UI depends on the severity of the message.

::: warning User Input & Injection Vulnerabilities
Ensure proper validation of the message text and URL if they contain values ​​from user input.
:::

### Throwing a ServiceException from Error Messages { #throwing-a-serviceexception-from-messages}

It is also possible to throw a [ServiceException](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceException.html) from error messages. This can, for example, be useful to cancel a request after collecting multiple validation errors. The individual validation checks will collect error messages in the `Messages` API. After the validation checks have been run, you call the `throwIfError()` method. Only if error messages have been collected, this method cancels the request with a [ServiceException](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceException.html):

```java
// throw a ServiceException, if any error messages have been added to the current request
messages.throwIfError();
```

If there are any collected error messages, this method creates a [ServiceException](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceException.html) from _one_ of these error messages.
The OData adapter turns this exception into an OData error response to indicate the error to the client. The remaining error messages are written into the `details` section of the error response.

`Messages.throwIfError()` is automatically called at the end of the `Before` handler phase to abort the event processing in case of errors. It is recommended to use the Messages API for validation errors and rely on the framework calling `Messages.throwIfError()` automatically, instead of throwing a `ServiceException`.


## Formatting and Localization

Texts passed to both `ServiceException` and the `Messages` API can be formatted and localized.
By default, you can use [SLF4J's messaging formatting style](https://www.slf4j.org/api/org/slf4j/helpers/MessageFormatter.html) to format strings passed to both APIs.

```java
// message with placeholders
messages.warn("Can't order {} books: Not enough on stock", orderQuantity);
// on ServiceException last argument can always be the causing exception
throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid number: '{}'", wrongNumber, originalException);
```

You can localize these strings, by putting them into property files and passing the key of the message from the properties file to the API instead of the message text.

When running your application on Spring, the CAP Java SDK integrates with [Spring's support for handling text resource bundles](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.internationalization). This handling by default expects translated texts in a `messages.properties` file under `src/main/resources`.

The texts defined in the resource bundles can be formatted based on the syntax defined by `java.text.MessageFormat`.
When the message or exception text is sent to the client it's localized using the client's locale, as described [in the Localization Cookbook](../../guides/i18n#user-locale).

::: code-group
```properties [messages.properties]
my.message.key = This is a localized message with {0} parameters
```

```properties [messages_de.properties]
my.message.key = Das ist ein übersetzter Text mit {0} Parametern
```
:::


```java
// localized message with placeholders
messages.warn("my.message.key", paramNumber);
// localized message with placeholders and additional exception
throw new ServiceException(ErrorStatuses.BAD_REQUEST, "my.message.key", paramNumber, originalException);
```

### Translations for Validation Error Messages { #ootb-translated-messages }

CAP Java provides out-of-the-box translation for error messages that originate from input validation annotations such as `@assert...` or `@mandatory` and security annotations `@requires` and `@restrict`.

The error messages are optimized for UI scenarios and avoid any technical references to entity names or element names. Message targets are used where appropriate to allow the UI to show the error message next to the affected UI element.
You can disable these translated error messages by setting [<Config java>cds.errors.defaultTranslations.enabled: false</Config>](../developing-applications/properties#cds-errors-defaultTranslations-enabled).

### Provide custom error messages

By default, CAP Java provides error messages in several languages. If an error message or translation isn't sufficient for an application, it can be overwritten with a custom error message. Applications can provide the new error message under the respective error code in the application's `messages.properties` resource bundle under `src/main/resources`.

::: code-group
```properties [message.properties]
# Custom message for @mandatory
409003 = Please enter a value
```
:::

To know which error codes and messages are available by default, you can have a look at the Java enumeration `com.sap.cds.services.utils.CdsErrorStatuses` with your favorite IDE. This enumeration shows all available error codes and messages that are used by the CAP Java runtime.

## Target

When SAP Fiori interprets messages it can handle an additional `target` property, which, for example, specifies which element of an entity the message refers to. SAP Fiori can use this information to display the message along the corresponding field on the UI.
When specifying messages in the `sap-messages` HTTP header, SAP Fiori mostly ignores the `target` value.
Therefore, specifying the `target` can only correctly be used when throwing a `ServiceException` as SAP Fiori correctly handles the `target` property in OData V4 error responses.

A message target is always relative to an input parameter in the event context.
For CRUD-based events this is always the `cqn` parameter, which represents and carries the payload of the request.
For actions or functions, a message target can either be relative to the entity to which the action or function is bound (represented by the `cqn` parameter) or relative to a parameter of the action or function.
In case of actions and functions SAP Fiori also requires the message target to be prefixed with the action or function's binding parameter or parameter names.

When creating a message target, the correct parameter needs to be selected to specify what the relative message target path refers to.
By default a message target always refers to the CQN statement of the event. In case of CRUD events this is the targeted entity. In case of bound actions and functions this is the entity that the action or function was bound to.
As CRUD event handlers are often called from within bound actions or functions (e.g. `draftActivate`), CAP's OData adapter adds a parameter prefix to a message target referring to the `cqn` parameter only when required.

::: info
When using the `target(String)` API, which specifices the full target as a `String`, no additional parameter prefixes are added by CAP's OData adapter. The `target` value is used as specified.
:::

Let's illustrate this with the following example:

```cds
entity Books : cuid, managed {
    title  : localized String(111);
    descr  : localized String(1111);
    author : Association to Authors;
}

entity Authors : cuid, managed {
    name         : String(111);
    dateOfBirth  : Date;
    placeOfBirth : String;
    books        : Association to many Books
                       on books.author = $self;
}

entity Reviews : cuid, managed {
    book   : Association to Books;
    rating : Rating;
    title  : String(111);
    text   : String(1111);
}

service CatalogService {
    type Reviewer {
        firstName : String;
        lastName  : String;
    }
    entity Books as projection on my.Books excluding {
        createdBy,
        modifiedBy
    } actions {
        action addReview(reviewer : Reviewer, rating : Integer,
          title : String, text : String) returns Reviews;
    };
}
```

Here, we have a `CatalogService` that exposes et al. the `Books` entity and a `Books` bound action `addReview`.

### CRUD Events

Within a `Before` handler that triggers on inserts of new books a message target can only refer to the `cqn` parameter:

``` java
@Before
public void validateTitle(CdsCreateEventContext context, Books book) {
    // ...

    // event context contains the "cqn" key

    // implicitly referring to cqn
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget(b -> b.get("title"));

    // which is equivalent to explicitly referring to cqn
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget("cqn", b -> b.get("title"));

    // which is the same as using plain string
    // assuming direct POST request
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget("title");

    // which is the same as using plain string
    // assuming surrounding bound action request with binding parameter "in",
    // e.g. draftActivate
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget("in/title");
}
```

Instead of using the generic API for creating the relative message target path, CAP Java SDK also provides a typed API backed by the CDS model:

``` java
@Before
public void validateTitle(CdsCreateEventContext context, Books book) {
    // ...

    // implicitly referring to cqn
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget(Books_.class, b -> b.title());
}
```

This also works for nested paths with associations:

``` java
@Before
public void validateAuthorName(CdsCreateEventContext context, Books book) {
    // ...

    // using un-typed API
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No title specified")
        .messageTarget(b -> b.to("author").get("name"));

    // using typed API
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "No author name specified")
        .messageTarget(Books_.class, b -> b.author().name());
}
```

### Bound Actions and Functions


The same applies to message targets that refer to an action or function input parameter:

``` java
@Before
public void validateReview(BooksAddReviewContext context) {
    // ...

    // event context contains the keys "reviewer", "rating", "title", "text",
    // which are the input parameters of the action "addReview"

    // referring to action parameter "reviewer", targeting "firstName"
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid reviewer first name")
        .messageTarget("reviewer", r -> r.get("firstName"));

    // which is equivalent to using the typed API
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid reviewer first name")
        .messageTarget(BooksAddReviewContext.REVIEWER, Reviewer_.class, r -> r.firstName());

    // targeting "rating"
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid review rating")
        .messageTarget("rating");

    // targeting "title"
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid review title")
        .messageTarget("title");

     // targeting "text"
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid review text")
        .messageTarget("text");
}
```

If a message target refers to the `cqn` of the event context, for bound actions and functions that means, that the message target path is relative to the bound entity.

For the `addReview` action that is the `Books` entity, as in the following example:

``` java
@Before
public void validateReview(BooksAddReviewContext context) {
    // ...

    // referring to the bound entity `Books`
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid book description")
        .messageTarget(b -> b.get("descr"));

    // or (using the typed API, referring to "cqn" implicitly)
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid book description")
        .messageTarget(Books_.class, b -> b.descr());

    // which is the same as using plain string
    throw new ServiceException(ErrorStatuses.BAD_REQUEST, "Invalid book description")
        .messageTarget("in/descr");
}
```

::: tip
The previous examples showcase the target creation with the `ServiceException` API, but the same can be done with the `Message` API and the respective `target(...)` methods.
:::


## Error Handler { #errorhandler}

An [exception](#exceptions) thrown in an event handler will stop the processing of the request. As part of that, protocol adapters trigger the `ERROR_RESPONSE` event of the [Application Lifecycle Service](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/application/ApplicationLifecycleService.html). By default, this event combines the thrown exception and the [messages](#messages) from the `RequestContext` in a list to produce the error response. OData V4 and V2 protocol adapters will use this list to create an OData error response with the first entry being the main error and the remaining entries in the details section.

You can add event handlers using the `@After` phase for the `ERROR_RESPONSE` event to augment or change the error responses:
- Method `getException()` of [ErrorResponseEventContext](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/application/ErrorResponseEventContext.html) returns the exception that triggered the event.
- Method `getEventContexts()` of [ServiceException](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/ServiceException.html) contains the list of [event contexts](../event-handlers/#eventcontext), identifying the chain of processed events that led to the error. The first entry in the list is the context closest to the origin of the exception.

You can use the exception and the list of events contexts (with service, entity and event name) to selectively apply your custom error response handling. Some exceptions, however, may not be associated with a context and the list of contexts will be empty for them.

The list of messages available via `getResult().getMessages()` of the `ErrorResponseEventContext` contains the messages (see [Messages API](https://www.javadoc.io/doc/com.sap.cds/cds-services-api/latest/com/sap/cds/services/messages/Message.html)) the protocol adapter will use to generate the final error response. You can remove, reorder or add new messages to this list by using `Message.create()` . You can also override the resulting HTTP status with method `getResult().setHttpStatus()`. Use only statuses that indicate errors, meaning status code 400 or higher.

::: warning
Don't create new messages in the `Messages` of the `RequestContext` (also available through `context.getMessages()`). They will not be included in the response. Only the result provided by the `ErrorResponseEventContext` is considered by the protocol adapter.
:::

In case your implementation of the error handler throws an exception, returns no messages or sets a non-error HTTP status, the error response will default to a generic internal server error with HTTP status 500 and will not display any error details.

The following example of a simple error handler overrides the standard message text of authorization errors. Technically, it replaces the first message, that is the main error in OData, in the response with a new message that has a custom text, **only** for exceptions with error code `CdsErrorStatuses.EVENT_FORBIDDEN`.

```java
@Component
@ServiceName(ApplicationLifecycleService.DEFAULT_NAME)
public class SimpleExceptionHandler implements EventHandler {

  @After
  public void overrideMissingAuthMessage(ErrorResponseEventContext context) {
    if (context.getException().getErrorStatus().equals(CdsErrorStatuses.EVENT_FORBIDDEN)) {
        context.getResult().getMessages().set(0,
            Message.create(Message.Severity.ERROR,
            "You cannot execute this action"));
    }
  }
}
```

The second example shows how to override validation messages triggered by the annotation `@assert.range` for a certain entity. The exception [triggered by CAP](#throwing-a-serviceexception-from-messages) contains a reference to the event context that can be used to identify the target entity. The target of each message can be used to identify the affected field, but keep in mind that targets are always relative to the root entity of the request. That means in case of deep inserts or updates, you need to match not only the entity that has annotations but also the parent entities.

```java
@Component
@ServiceName(ApplicationLifecycleService.DEFAULT_NAME)
public class ExceptionServiceErrorMessagesHandler implements EventHandler {

  @After
  public void overrideValidationMessages(ErrorResponseEventContext context) {
    context.getException().getEventContexts().stream().findFirst().ifPresent(originalContext -> {
      if (Books_.CDS_NAME.equals(originalContext.getTarget().getQualifiedName())) { // filter by entity
        List<Message> messages = context.getResult().getMessages();
        for(int i=0; i<messages.size(); ++i) {
          Message message = messages.get(i);
          if (CdsErrorStatuses.VALUE_OUT_OF_RANGE.getCodeString().equals(message.getCode())) { // filter by error code
            if (Books.PRICE.equals(message.getTarget().getRef().targetSegment().id())) { // filter by target
              messages.set(i, Message.create(Message.Severity.ERROR, "The exceptional price is not in defined range!", message));
            } else if (Books.STOCK.equals(message.getTarget().getRef().targetSegment().id())) {
              messages.set(i, Message.create(Message.Severity.ERROR, "The exceptional stock of specified items is not available!", message));
            }
          }
        }
      }
    });
  }
}
```

::: tip
If you replace the message with a new one, make sure that you copy the code and target of the original. Otherwise, SAP Fiori clients may not be able to display them properly. Use method `Message.create(Severity severity, String text, Message message)` to create a new message and copy all additional attributes from the existing one.
:::

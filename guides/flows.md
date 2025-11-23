---
synopsis: >
  TODO
status: released
---

# Status-Transition Flows <Beta />

The flow feature makes it easy to define and manage state transitions in your CDS models.
It ensures transitions are explicitly modeled, validated, and executed in a controlled and reliable way.
In case of more complex requirements, you can extend the flows with custom event handlers.

[[toc]]



## Enabling Flows

Status-transition flows are part of the CAP Node.js core (`@sap/cds`).
Hence, there are no steps required to enable the feature.

To get started with the flow feature in CAP Java, simply add the [cds-feature-flow](https://central.sonatype.com/artifact/com.sap.cds/cds-feature-flow) dependency to your `srv/pom.xml` file:

```xml
<dependency>
  <groupId>com.sap.cds</groupId>
  <artifactId>cds-feature-flow</artifactId>
  <scope>runtime</scope>
</dependency>
```



## Modeling Flows

The following shows the simplest way to model a flow.
The flow is taken from [@capire/xtravels](https://github.com/capire/xtravels).
The annotations in the service model are enough to model the flow so it can be used.

![](./assets/flows/xtravels-flow-simple.svg)

```cds
service TravelService {

  entity Travels as projection on db.Travels
  // Define actions
  actions {
    action acceptTravel();
    action rejectTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  };

  // Define flow (+ status check for "deductDiscount")
  annotate Travels with @flow.status: Status actions {
    acceptTravel    @from: #Open  @to: #Accepted;
    rejectTravel    @from: #Open  @to: #Canceled;
    deductDiscount  @from: #Open;
  };

}
```


### Ingredients

Flows are made up of a _status element_ and a set of _flow actions_ that define the transitions between different states. 

#### `@flow.status`

To model a flow, one of the entity fields needs to be annotated with `@flow.status`. This field must be one of the following:

- A String enum consisting of keys and values
- A String enum with only symbols
- A Codelist entity with the key `code` if localization is needed (`code` must be one of the two above)

Use the following annotations on bound actions to model the transitions of the flow:

#### `@from`

- Defines valid entry states for the action
- Validates whether the entity is in a valid entry state before executing the action (the current state of the entity must be included in the states defined here)
- Can be a single value or an array of values (each element must be a value from the status enum)
- UI annotations to allow/disallow buttons and to refresh the page are automatically generated

#### `@to`

- Defines the desired target state of the entity after executing the action
- Changes the state of the entity to the value defined in this annotation after executing the action
- Must be a single value from the status enum

Both annotations are optional, but at least one is required to mark an action as a flow action. You can use either one or both, depending on the desired behavior. If you use both, you don't need to implement any handlers for the actions, as all generic handlers are registered automatically.


### Generic Handlers

No handler implementations are required for the actions, as the generic handlers are registered automatically.

#### `before`

From the `@from` annotation, a handler is registered that performs the check described above.
If the entity is not in a valid state, the request fails with a suitable error.

#### `on`

An empty handler is registered if none is provided. This ensures the request passes through the generic handler stack.

#### `after`

From the `@to` annotation, a handler is registered that changes the state of the entity to the desired target state.
This ensures that the state transition is consistently applied without requiring custom logic.


### `$flow.previous`

The following shows how to use the target state `$flow.previous`.
We need to expand on the simple example above by introducing a `Blocked` state with two possible previous states (the existing `Open` and the new `InReview`), as well as an action `unblockTravel` that will restore the respective state in the current workflow.
That is, if the `Blocked` state was transitioned to from `Open`, the action `unblockTravel` will transition back to `Open`.
The same applies for `InReview`.

![](./assets/flows/xtravels-flow-previous.svg)

```cds
service TravelService {

  entity Travels as projection on db.Travels
  // Define actions
  actions {
    action reviewTravel();
    action reopenTravel();
    action blockTravel();
    action unblockTravel();
    action acceptTravel();
    action rejectTravel();
    action deductDiscount( percent: Percentage not null ) returns Travels;
  };

  // Define flow incl. "unblockTravel" which transitions either to #Open or #InReview
  annotate Travels with @flow.status: Status actions {
    reviewTravel    @from: #Open               @to: #InReview;
    reopenTravel    @from: #InReview           @to: #Open;
    blockTravel     @from: [#Open, #InReview]  @to: #Blocked;
    unblockTravel   @from: #Blocked            @to: $flow.previous;
    acceptTravel    @from: #InReview           @to: #Accepted;
    rejectTravel    @from: #InReview           @to: #Canceled;
    deductDiscount  @from: #Open;
  };

}
```

To transition to the previous state, each entity with a flow that includes at least one transition to `$flow.previous` is automatically augmented with the necessary data structure to record the transitions.
Specifically, the entities are appended with the aspect `sap.common.FlowHistory`.



// HERE!!!



## Extending Flows

In case the offered functionality is not sufficient, it is possible to add custom handlers for the action.

Let's look at some use-cases for extending flows with custom event handlers:
- If the entry state validation depends on additional conditions, you could implement the logic in a custom `Before` handler. 
- If the action's return type is anything other than `void`, you must implement a custom `On` handler.
- If you have multiple target states depending on certain conditions, you must implement a custom `On` handler, and you must **not** use the `@flow.to` annotation.
- If you want to run logic like contacting an external system on a state transition, consider implementing a custom `On` handler for the respective action.

<span class="java">

REVISIT: Maybe change this example? Is this too complex for here?
  
Let's introduce a new requirement to see an action that will require a custom event handler to be implemented. The new requirement is that a customer withdraws from travelling, for example due to sickness. Withdrawing from travelling is only allowed for up to 24 hours before the travel begins.

The status transition diagram below visualizes the new state and transitions.
![Diagram showing SFlight travel status transitions. The diagram title is SFlight Travel Status Transitions. It illustrates the possible state changes for a travel booking: open can transition to accepted or canceled via actions acceptTravel and rejectTravel. Both transitions are labeled with their respective action names. From open or accepted, a withdrawTravel action can be triggered, leading to the withdrawn state. Withdrawn is visually highlighted in green, and the diagram notes that the flow is extended with the withdrawn state. The overall tone is informative and neutral, supporting understanding of state management in the SFlight sample application.](assets/providing-services/sflight-travel-status-withdrawn.drawio.svg){style="box-shadow: 1px 1px 5px #888888; width:350px;"}

Add the travel status `Withdrawn` and add the action `withdrawTravel` to the model.

::: details Updated CDS Model
```cds
type TravelStatusCode : String(1) enum {
  Open      = 'O';
  Accepted  = 'A';
  Canceled  = 'X';
  Withdrawn = 'W'; // added 
};

service TravelService {

  entity Travel as projection on my.Travel actions {
    /* other actions */
    @(flow: {
      from:[ Open, Accepted ],
    })
    action withdrawTravel(); // added
  };
}
```
:::

Note that the `withdrawTravel` action doesn't have the `@flow.to` annotation, because we will implement the transition in a custom handler:

::: details Custom handler for transition to 'Withdrawn'

```java
@Component
@ServiceName(TravelService_.CDS_NAME)
public class WithdrawTravelHandler implements EventHandler {

  private final PersistenceService persistenceService;

  public WithdrawTravelHandler(PersistenceService persistenceService) {
    this.persistenceService = persistenceService;
  }

  @Before(entity = Travel_.CDS_NAME)
  public void check24HoursBeforeTravel(final TravelWithdrawTravelContext context, CqnStructuredTypeRef travelRef) {
    Travel travel = ((ApplicationService) context.getService()).run(
        Select.from(travelRef).columns(Travel_.BEGIN_DATE)).first(Travel.class)
      .orElseThrow(() -> new ServiceException(ErrorStatuses.BAD_REQUEST, "TRAVEL_NOT_FOUND"));

    if (travel.beginDate().isBefore(LocalDate.now().minusDays(1))) {
      context.getMessages().error("Travel can only be withdrawn up to 24 hours before travel begins.");
    }
  }

  @On(entity = Travel_.CDS_NAME)
  public void onWithdrawTravel(final TravelWithdrawTravelContext context, CqnStructuredTypeRef travelRef) {
    boolean isDraftTarget =DraftUtils.isDraftTarget(
      travelRef,
      context.getModel().findEntity(travelRef.targetSegment().id()).get(),
      context.getModel());
    boolean isDraftEnabled = DraftUtils.isDraftEnabled(context.getTarget());
    var travel = Travel.create();
    travel.travelStatusCode(TravelStatusCode.WITHDRAWN);
    if (isDraftTarget) {
      ((DraftService) context.getService()).patchDraft(Update.entity(travelRef).data(travel));
    } else {
      AnalysisResult analysis = CqnAnalyzer.create(context.getModel()).analyze(travelRef);
      Map<String, Object> keys = analysis.targetKeyValues();
      if (isDraftEnabled) {
        keys.remove(Drafts.IS_ACTIVE_ENTITY);
      }
      persistenceService.run(Update.entity(context.getTarget()).matching(keys).data(travel));
    }
    context.setCompleted();
  }

}
```

:::

The custom `Before` handler retrieves the `BeginDate` of the travel entity from the database and validates whether it is within the allowed time frame, ensuring that the travel can only be withdrawn up to 24 hours before the current date.

The custom `On` handler implements the transition by updating the travel status to `Withdrawn`. It checks whether the entity is a draft or a non-draft entity and applies the appropriate update logic. For draft entities, it uses the `patchDraft` method to update the draft data, while for non-draft entities, it uses the `PersistenceService` to persist the changes. Finally, it marks the action as completed.

Technically, we could have used the `@flow.to` annotation and the default flow handler for the transition instead of implementing it here. However, in this case, omitting the annotation explicitly signals to developers that custom logic is implemented for the transition, ensuring they understand the intent behind the omission.

</span>

<span class="node">
As an example of extending flows with more complex, requirements, have a look at the following example, it only shows the difference to the previous example, the remaining parts are the same as before. The goal is to automatically reject a travel if the price exceeds a certain threshold.

![](assets/providing-services/conditional-flow.drawio.svg)

The target state of the action now depends on a condition. To model this, we can remove the `@flow.to` annotation from the action and implement a custom event handler that checks the condition and sets the target state accordingly.

::: details Updated CDS Model

```cds
service TravelService {
  entity Travel {
  /* ... */
  price : Integer //added 
  } actions {
    /* ... */
    @flow.from: #Open
    action acceptTravel(); // removed @flow.to annotation
  }
}
```
:::

::: details Custom handler for conditional transition

```js
this.on(acceptTravel, SimpleTravel, async (req) => {
  const currentTravel = await SELECT.one(req.subject);

  if (currentTravel.price > 4000) {
    await UPDATE(req.subject).with({
      TravelStatus: "Rejected",
    });
  } else {
    await UPDATE(req.subject).with({
      TravelStatus: "Accepted",
    });
  }
});
```
:::

</span>

In summary, the flow annotations can be used for all basic flows that should be modelled, when there is the need for more complex cases, they can be implemented with custom event handlers.

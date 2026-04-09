### The Bookstore Sample

The [*@capire/bookstore*](https://github.com/capire/bookstore) sample composes independent microservices into a composite application as follows:

- [*@capire/bookstore*](https://github.com/capire/bookstore) – a composite application which composes:
- [*@capire/bookshop*](https://github.com/capire/bookshop) – a standalone bookshop application
- [*@capire/reviews*](https://github.com/capire/reviews) – a reuse service to manage user reviews
- [*@capire/orders*](https://github.com/capire/orders) – a reuse service to manage orders 

![Diagram showing the bookstore application architecture with four hexagonal service components: a dark blue bookstore service at the top center, and three light blue services below it - bookshop at bottom center, orders at bottom right, and reviews at bottom left, representing a microservices composition pattern.
](assets/bookstore-sample.drawio.svg)

> [!note] Independent Microservices
> Each of the microservices are developed independently, and can be reused and composed in any applications. 
> Bookshop, Reviews and Orders services are all standalone CAP applications on their own, that know nothing about each other, with independent lifecycles. Only the Bookstore application composes them into a larger whole.

The illustration below zooms in to the flow of events and requests between the individual (micro) services, with the dashed lines representing asynchronous events, and the solid lines representing synchronous requests (read and write). Basically, the bookstore application follows an event-driven choreography pattern, with the following interactions:

- on _Bookshop.submitOrder_ -> _OrdersService.create (Order)_.
- on _OrdersService.Order.Changed_ -> _Bookshop.update (stock)_.
- on _ReviewsService.Ratings.Changed_ -> _Bookstore.update (averageRating)_.

![Diagram illustrating event-driven choreography in the bookstore application. Four hexagonal service components are arranged in a diamond pattern: Bookstore in dark blue at the center, Reviews in light blue at top left, Orders in light blue at top right, and Bookshop in light blue at bottom. Solid arrows indicate synchronous calls: Bookstore calls Read Reviews to Reviews service, Create Order to Orders service, and Update Stock to Bookshop service. Dashed arrows show asynchronous events: Reviews publishes Ratings Changed event to Bookstore, Orders publishes Order Changed event to Bookstore, and Bookshop publishes Submit Order event to Bookstore. This demonstrates a choreographed integration pattern where services communicate through a combination of direct calls and event-driven messaging.
](assets/bookstore-choreography.drawio.svg)


> [!tip] Integration Patterns
>
> From the descriptions of the sample scenarios above we can identify these general integration scenarios and patterns:
> * **(Master) Data Integration** scenarios, which frequently involve data replication via initial loads / delta loads, on-demand replication, or event-based replication.
> * **(Enterprise) Application Integration** scenarios, in which we commonly see a mix of (synchronous) calls to remote services, and (asynchronous) reaction on events. 
> * **Reuse & Composition of (Micro) Services** as in the *@capire/bookstore* sample.






### Feature-Centric Services

Let's have a look at another the reuse service definition from the [_@capire/reviews_](https://github.com/capire/reviews) sample, which is designed as a reuse service, which can be consumed by any application needing review functionality, such as the _bookstore_ sample. 

In contrast to data-centric services, such feature-centric services typically expose less entities, and more specialized custom events and actions.

Open `srv/review-service.cds` in VSCode, e.g., like that from the command line:

```shell
code reviews -g reviews/srv/review-service.cds
```
::: code-group
```cds :line-numbers [cap/samples/reviews/srv/review-service.cds]
using { sap.capire.reviews as my } from '../db/schema';

@odata @rest @hcql service ReviewsService {

  /** The central entity for reviews, add/change reviews */
  entity Reviews as projection on my.Reviews;

  /** Lightweight list of reviews without text and likes */
  @readonly entity ListOfReviews as projection on Reviews 
  excluding { text, likes };

  /** Summary of average ratings per reviewed subject. */
  @readonly entity AverageRatings as projection on Reviews {
    key subject,
    round(avg(rating),2) as rating  : my.Rating,
    count(*)             as reviews : Integer,
  } group by subject;

  /** Event emitted when a subject's average rating has changed. */
  event AverageRatings.Changed : AverageRatings;

  /** Entities and actions for liking and unliking reviews */
  @readonly entity Likes as projection on my.Likes;
  action like (review: Review);
  action unlike (review: Review);
  type Review : projection on my.Reviews { subject, reviewer }
}
```
:::
This service exposes the `Reviews` entity for full CRUD operations, as well as two readonly projections: `ListOfReviews` without the potentially large text and likes fields, and `AverageRatings` which provides aggregated average ratings per subject. Additionally, an event `AverageRatings.Changed` is defined to notify consumers when the average rating for a subject changes. Actions `like` and `unlike` are also provided to manage likes on reviews.



## 

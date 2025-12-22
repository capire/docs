---
synopsis: >
  Transactional Event Queues allow to schedule events and background tasks for asynchronous exactly once processing and withultimate resilience.
status: released
---

# Transactional Event Queues

{{ $frontmatter.synopsis }}

[[toc]]


## Event Queues: Concept

The _Outbox Pattern_ is a reliable strategy used in distributed systems to ensure that messages or events are consistently recorded and delivered, even in the face of failures. _Event Queues_ not only apply this pattern to _outbound_ messages, but also to _inbound_ messages and to _internal_ background tasks. So, event queues can be used for four different use cases:

* **Outbox** → for outbound calls to remote services
* **Inbox** → for asynchronously handling inbound requests
* **Background tasks** → e.g., scheduled periodically
* **Remote Callbacks** → implementing SAGA patterns

The core principle remains the same:

Instead of being sent directy to receivers, event messages are persisted in an _Event Queue_ table in the database -- **within the same transaction** as the triggering action, if applicable.

Later on, these event messages are read from the database and actually sent to the receiving services, hence **processed asynchronously** -- with retries, if necessary, so guaranteeing **ultimate resilience**.




## Outbox { #outbox }

Regarding the _outbox_, please see the following existing documentation:
- [Transactional Outbox](../../java/outbox) in CAP Java
- [Outboxing with `cds.queued`](../../node.js/queue) in CAP Node.js



## Inbox <Beta /> { #inbox }

Through the _inbox_, inbound messages can be accepted as asynchronous tasks.
That is, the messaging service persists the message to the database, acknowledges it to the message broker, and schedules its processing.

Simply configure your messaging service for Node.js as <Config>cds.requires.messaging.inboxed = true</Config> and for CAP Java as <Config java keyOnly>cds.messaging.services=[{"name": "messaging-name", "inbox": {"enabled": true}}]</Config>

**Inboxing moves the dead letter queue into your CAP app❗️**

With the inbox, all messages are acknowledged towards the message broker regardless of whether they can be processed or not.
Hence, failures need to be managed via the dead letter queue built on `cds.outbox.Messages`.

[Learn more about the dead letter queue in Node.js.](../../node.js/queue#managing-the-dead-letter-queue){.learn-more}
[Learn more about the dead letter queue in Java.](../../java/outbox#outbox-dead-letter-queue){.learn-more}

Inboxing is especially beneficial in case the message broker does not allow to trigger redelivery and/ or "fix" the message payload.



##  <i>  More to Come </i>

This documentation is not complete yet, or the APIs are not released for general availability.
Stay tuned to upcoming releases for further updates.

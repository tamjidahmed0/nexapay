# NexaPay Notification Service

Push notification delivery via Firebase Cloud Messaging.

## Responsibilities
- Receive notification events from RabbitMQ
- Send push notifications via Firebase Admin SDK
- Transaction alerts (money sent/received)

## Tech
- NestJS (RabbitMQ microservice)
- Firebase Admin SDK
- RabbitMQ (event consumer)
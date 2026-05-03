# NexaPay Gateway

HTTP entry point for all client requests. Routes traffic to downstream microservices via TCP transport.

## Responsibilities
- Session-based authentication (express-session + Redis)
- Request routing to user-service and payment-service
- Input validation

## Tech
- NestJS (HTTP)
- Redis (session store)
- TCP transport (microservice clients)

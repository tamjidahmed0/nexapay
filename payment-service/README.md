# NexaPay Payment Service

Core financial transaction engine.

## Responsibilities
- Wallet management (multi-currency)
- Internal transfers (same currency, P2P)
- Double-entry bookkeeping ledger
- Idempotency enforcement
- Fee calculation

## Tech
- NestJS (TCP microservice)
- PostgreSQL + Prisma
- Serializable transaction isolation

## Architecture Decisions
- Wallet + transaction in single service to avoid distributed saga complexity
- Outbox pattern for ledger eventual consistency
- HMAC-SHA256 for searchable encrypted fields
- Prisma `$transaction` with Serializable isolation for atomic balance updates

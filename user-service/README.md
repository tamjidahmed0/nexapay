# NexaPay User Service

Handles user identity, authentication, and encryption.

## Responsibilities
- User registration with OTP verification
- Login with session token issuance
- PII encryption (AES-256-GCM, envelope encryption)
- FCM token management

## Tech
- NestJS (TCP microservice)
- PostgreSQL + Prisma
- Redis (OTP store)
- AES-256-GCM envelope encryption

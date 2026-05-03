<p align="center">
  <img src="./assets/nexapay_logo.png" alt="NexaPay Logo" width="200"/>
</p>

<p align="center">
  <strong>Production-grade fintech microservices backend</strong><br />
  Built with NestJS · PostgreSQL · Redis · RabbitMQ · Docker
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" />
</p>

---

## Architecture

```
Client (Flutter)
      │
      ▼
  Gateway (HTTP :3000)
      │
      ├── TCP ──▶ User Service (:3001)
      │               └── PostgreSQL (user_db)
      │
      ├── TCP ──▶ Payment Service (:3002)
      │               └── PostgreSQL (payment_db)
      │
      └── RabbitMQ ──▶ Notification Service
                            └── Firebase FCM

Shared Infrastructure
  ├── Redis   — sessions · idempotency · OTP · FX quote locking
  └── RabbitMQ — async event bus
```

---

## Services

| Service | Transport | Port | Responsibility |
|---|---|---|---|
| `gateway` | HTTP | 3000 | API entry point, session auth, request routing |
| `user-service` | TCP | 3001 | Registration, login, PII encryption, FCM token |
| `payment-service` | TCP | 3002 | Wallets, transfers, ledger, fee calculation |
| `notification-service` | RabbitMQ | — | Push notifications via Firebase FCM |

---

## API Reference

### Auth — `/user`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/user/create` | ✗ | Register a new user |
| `POST` | `/user/verify-otp` | ✗ | Verify OTP and activate account |
| `POST` | `/user/login` | ✗ | Login and create session |

#### POST `/user/create`
```json
{
  "name": "Tamjid Ahmed",
  "email": "tamjid@example.com",
  "password": "securepassword",
  "phone": "01920284077",
  "nationalId": "1025456315"
}
```

#### POST `/user/verify-otp`
```json
{
  "email": "tamjid@example.com",
  "otp": "123456"
}
```

#### POST `/user/login`
```json
{
  "email": "tamjid@example.com",
  "password": "securepassword",
  "fcmToken": "firebase_device_token"
}
```

---

### Wallet — `/wallet`

> All wallet endpoints require authentication (session cookie).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/wallet/create` | Create a new wallet |
| `GET` | `/wallet/get-wallets` | Get all wallets for the authenticated user |
| `GET` | `/wallet/get-wallet/:walletId` | Get a specific wallet |
| `GET` | `/wallet/get-balances` | Get all wallet balances |
| `GET` | `/wallet/get-balance/:walletId` | Get balance for a specific wallet |
| `GET` | `/wallet/primary` | Get primary wallet balance |

#### POST `/wallet/create`
```json
{
  "currency": "BDT"
}
```

---

### Transaction — `/transaction`

> All transaction endpoints require authentication (session cookie).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/transaction/preview` | Preview transfer — returns fee, recipient info, total deducted |
| `POST` | `/transaction/internal` | Execute internal P2P transfer |
| `GET` | `/transaction/user` | Get paginated transaction history |
| `GET` | `/transaction/:id` | Get a single transaction by ID |

#### POST `/transaction/preview`
```json
{
  "amount": 500,
  "recipientIdentifier": "recipient@example.com",
  "currency": "BDT"
}
```
Response:
```json
{
  "recipient": {
    "name": "Komola",
    "identifier": "recipient@example.com"
  },
  "amount": 500,
  "currency": "BDT",
  "fee": 5,
  "totalDeducted": 505
}
```

#### POST `/transaction/internal`
```json
{
  "amount": 500,
  "currency": "BDT",
  "recipientIdentifier": "recipient@example.com",
  "idempotencyKey": "unique-uuid-v4",
  "note": "Lunch money"
}
```

#### GET `/transaction/user`
Query params:

| Param | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | — | Pagination cursor |
| `limit` | number | 20 | Results per page |

---

## Key Technical Decisions

### Atomic Transfers
Balance updates use Prisma `$transaction` with **Serializable isolation level** — prevents phantom reads and write skew on concurrent transfers without application-level locks.

### Idempotency
Every transfer requires an `idempotencyKey`. Duplicate requests within TTL return the cached response without re-executing the transaction.

### Envelope Encryption (PII)
Each sensitive field is encrypted with a unique **DEK** (Data Encryption Key), which is itself encrypted with the master **KEK** (Key Encryption Key). Stored as `v1:base64(json)` — no extra columns needed.

### Searchable Encrypted Fields
Phone numbers are stored both encrypted and as an HMAC-SHA256 hash — enabling exact-match lookups without exposing plaintext to the database.

### Double-Entry Ledger
Every transaction writes balanced ledger entries (debit + credit). A SHA-256 hash chain links entries for tamper detection.

### Session Auth
Express-session backed by Redis. Sessions are server-side revocable — critical for a fintech app where immediate invalidation on logout is required.

---

## Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- Node.js 20+

### 1. Clone

```bash
git clone https://github.com/tamjidahmed0/nexapay
cd nexapay
```

### 2. Setup environment files

```bash
cp .env.example .env
cp user-service/.env.example user-service/.env
cp payment-service/.env.example payment-service/.env
cp gateway/.env.example gateway/.env
cp notification-service/.env.example notification-service/.env
```

Fill in credentials in each `.env` file.

### 3. Start

```bash
docker compose up -d --build
```

Migrations run automatically on startup via `entrypoint.sh` in each service.

### 4. Verify

```bash
docker compose ps        # all services healthy
docker compose logs -f   # live logs
```

---

## Environment Variables

### Root `.env`
| Variable | Description |
|---|---|
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `USER_DB` | Database name for user-service |
| `PAYMENT_DB` | Database name for payment-service |
| `RABBITMQ_USER` | RabbitMQ username |
| `RABBITMQ_PASS` | RabbitMQ password |
| `RABBITMQ_URL` | `amqp://user:pass@rabbitmq:5672` |

### `gateway/.env`
| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `3000`) |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port |
| `SESSION_SECRET` | Session signing secret |

### `user-service/.env`
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port |
| `ENCRYPTION_MASTER_KEY` | 64-char hex key — `openssl rand -hex 32` |
| `PORT` | TCP port (default `3001`) |

### `payment-service/.env`
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port |
| `RABBITMQ_URL` | RabbitMQ connection URL |
| `PORT` | TCP port (default `3002`) |

### `notification-service/.env`
| Variable | Description |
|---|---|
| `RABBITMQ_URL` | RabbitMQ connection URL |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |

---

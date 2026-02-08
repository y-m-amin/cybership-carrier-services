# Cybership — Carrier Integration Service (UPS Rating)

This project implements a maintainable carrier-integration module in **TypeScript** that wraps the **UPS Rating API** and returns **normalized rate quotes**. It is designed to be extended over time to support additional carriers (FedEx/USPS/DHL) and additional operations (label purchase, tracking, address validation) without rewriting existing code.

> Live UPS credentials are **not required** to evaluate this project. All logic is validated through **stubbed integration tests** using realistic payloads based on UPS documentation.

---

## Features

- **Rate Shopping**: Accepts a clean internal `RateRequest` and returns normalized `RateResponse` quotes.
- **OAuth2 Client Credentials**: Token acquisition + caching/reuse + refresh on expiry.
- **Extensible design**:
  - Carriers implement a shared `Carrier` interface
  - `CarrierRegistry` + `ShippingService` provide a clear plug-in architecture for multiple carriers
- **Runtime validation**: Zod schemas validate domain input (and UPS response subsets) before processing.
- **Structured errors**: Meaningful `AppError` codes for timeouts, auth failures, rate limiting, upstream failures, malformed responses.
- **Integration tests**: End-to-end logic tests using `nock` (no real UPS calls needed).
- **CLI demo**: Run in mock mode (no creds) or real mode (with creds).

---

## Architecture Overview

### Goals
- Keep **domain models** independent of any carrier (UPS/FedEx/etc).
- Hide carrier request/response formats behind a clean interface.
- Reuse OAuth logic across carriers.
- Make it easy to add new carriers and new operations.
- Prove the logic end-to-end with stubbed integration tests.

### Key Layers

#### 1) Domain Layer (`src/domain/`)
Carrier-agnostic models, validation, and errors:
- `models.ts`: `RateRequest`, `RateResponse`, `RateQuote`, `Address`, `Package`, etc.
- `schemas.ts`: Zod schemas validating domain inputs before any external call
- `errors.ts`: `AppError` + stable `ErrorCode` union

#### 2) HTTP Layer (`src/http/`)
A thin, testable HTTP abstraction:
- `HttpClient.ts`: interface for request/response
- `AxiosHttpClient.ts`: axios-based implementation
- `MockHttpClient.ts`: used for CLI mock demos

#### 3) Auth Layer (`src/auth/`)
Reusable OAuth2 client-credentials implementation:
- `OAuthClient.ts`: token acquisition + transparent refresh
- `TokenCache.ts`: in-memory token caching with expiry handling

#### 4) Carrier Integrations (`src/carriers/`)
- `Carrier.ts`: shared interface (`getRates(req) => RateResponse`)
- `CarrierRegistry.ts`: registers carriers by name and resolves them
- `carriers/ups/*`: UPS-specific implementation and mapping

UPS implementation is isolated to `src/carriers/ups/`:
- `UpsCarrier.ts`: validate → auth → build request → call UPS → validate response → normalize
- `upsMapper.ts`: domain ↔ UPS payload mapping
- `upsSchemas.ts`: Zod schema for the UPS response subset used
- `upsEndpoints.ts`: builds `/rating/{version}/{requestoption}` URL

#### 5) Service Entry Point
- `ShippingService.ts`: carrier-agnostic entrypoint (`getRates({ carrier, request })`)
- `createShippingService.ts`: wires up registry + UPS carrier from environment configuration

This makes extensibility obvious:
- Add FedEx by implementing `Carrier` in `src/carriers/fedex/` and registering it in the registry.

---

## Configuration

All secrets and environment-specific values come from environment variables.

- Copy `.env.example` to `.env` and fill values if you want to run real mode.
- For evaluation, tests and `--mock` CLI mode do not require credentials.

---

## Running the Project

### Install
```bash
npm install
```

### Run tests

All logic is validated through integration tests using stubbed HTTP calls.
```bash
npm test
```
CLI Demo
Mock mode (no credentials required)

Prints sample UPS quotes using stubbed HTTP responses.
```bash
npm run cli -- --mock
```
Mock error scenarios (demonstrates structured error handling)
```bash
npm run cli -- --mock --mockError=429
npm run cli -- --mock --mockError=401
npm run cli -- --mock --mockError=500
npm run cli -- --mock --mockError=malformed
npm run cli -- --mock --mockError=timeout
```
Real mode (requires valid UPS OAuth credentials in .env)

```bash
npm run cli -- --fromZip=10001 --toZip=94105 --weight=2 --unit=LB
```

Force a specific service level (switches to Rate request option):

```bash
npm run cli -- --fromZip=10001 --toZip=94105 --weight=2 --unit=LB --service=03
```


## Test Strategy

Integration tests (under tests/integration/) stub external HTTP requests using nock and verify:

- Request payloads are correctly built from domain models

- Successful responses are parsed and normalized into internal types

- Auth token lifecycle works (acquisition, reuse, refresh on expiry)

- Error scenarios produce expected structured AppError results:

  - 401/403 → AUTH_ERROR

  - 429 → RATE_LIMITED

  - 5xx → UPSTREAM_ERROR (retryable)

  - malformed response → MALFORMED_RESPONSE

  - timeout → TIMEOUT

- Domain validation fails before any external call (VALIDATION_ERROR)

## What I Would Do Next (Given More Time)

- Add FedEx integration

  - Implement FedexCarrier in src/carriers/fedex/ using the same mapper + schema pattern

  - Register in CarrierRegistry without modifying UPS code

- Add more operations

  - Label purchase, tracking, address validation using operation-specific services/mappers/schemas

- Better UPS error parsing

  - Parse CommonErrorResponse into a normalized { errors: [{ code, message }] } shape

- Retries and backoff

  - Exponential backoff with jitter for retryable failures (timeouts/5xx/429 where appropriate)

- Respect Retry-After headers where present

  - Observability

  - Structured logging, metrics (latency/error rate), optional tracing hooks

- Token caching improvements

  - Shared cache (Redis) and concurrency control to prevent token stampedes

# 8×3 Sync API

The frontend is local-first. Sync is optional and enabled when `VITE_SYNC_API_URL` is set.

## Authentication

JWT access tokens are sent as `Authorization: Bearer <token>`.

### `POST /v1/auth/register`
Body:
```json
{ "email": "user@example.com", "password": "minimum-8-chars" }
```
Returns `201`:
```json
{ "token": "<jwt>" }
```

### `POST /v1/auth/login`
Same body. Returns:
```json
{ "token": "<jwt>" }
```

## State

### `GET /v1/state`
Requires JWT. Returns:
```json
{ "state": null }
```
or the saved `CycleState` object.

### `PUT /v1/state`
Requires JWT. Body:
```json
{ "state": { "version": 1, "cycleNumber": 1, "updatedAt": 1720000000000 } }
```
The real body contains the complete frontend `CycleState`. The demo server rejects an upload if a newer remote `updatedAt` already exists (`409`).

## Production notes

The included server is intentionally small and suitable for development/demo use. In production, use HTTPS, a real database, schema validation, rate limiting, secret rotation, short-lived access tokens plus refresh-token strategy, audit logs, and server-side conflict/version handling.

# WebSocket Protocol Specification

This document specifies the bidirectional communication protocol between Spaces client applications and the backend server over `/ws`.

All messages are JSON objects with a discriminating `type` property.

---

## Server to Client Messages (`WsServerMessage`)

### 1. `auth_success`

Sent upon successful WebSocket authentication handshake.

```json
{
  "type": "auth_success",
  "wsId": "ws-abc123"
}
```

### 2. `auth_error`

Sent when authentication fails or session token is invalid.

```json
{
  "type": "auth_error",
  "error": "Invalid or expired token"
}
```

### 3. `session_subscribed`

Sent after subscribing to session events.

```json
{
  "type": "session_subscribed",
  "sessionId": "session-xyz"
}
```

### 4. `session_stream`

Streamed event payload from an active agent session execution.

```json
{
  "type": "session_stream",
  "sessionId": "session-xyz",
  "data": { ... }
}
```

### 5. `approval_request`

Sent when a tool requires explicit human UI approval.

```json
{
  "type": "approval_request",
  "requestId": "req-123",
  "tool": "bash",
  "params": { "command": "rm -rf /tmp/test" }
}
```

### 6. `error`

Generic WebSocket error.

```json
{
  "type": "error",
  "error": "Not authenticated",
  "code": "UNAUTHORIZED"
}
```

---

## Client to Server Messages (`WsClientMessage`)

### 1. `auth`

```json
{
  "type": "auth",
  "token": "<jwt-or-session-token>"
}
```

### 2. `subscribe_session`

```json
{
  "type": "subscribe_session",
  "sessionId": "session-xyz"
}
```

### 3. `approval_response`

```json
{
  "type": "approval_response",
  "requestId": "req-123",
  "approved": true,
  "result": { ... }
}
```

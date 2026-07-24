# WebSocket Protocol Specification (v1)

This document specifies the canonical bidirectional communication protocol between Spaces client applications and the backend server over `/ws`.

All messages are JSON objects with a discriminating `type` string property.

The single source of truth schemas and types are defined in `packages/shared/src/ws-messages.ts`.

---

## Connection Lifecycle & Authentication

1. **Client Connection**: Connecting to `ws://<host>/ws` (or `wss://`). Authentication is attempted automatically via cookies or an explicit `auth` message.
2. **`auth` Message**:
   ```json
   {
     "type": "auth",
     "token": "optional-session-token",
     "sessionId": "optional-auto-subscribe-session-id"
   }
   ```
3. **`auth_success` Response**:
   ```json
   {
     "type": "auth_success",
     "wsId": "ws-uuid-string",
     "protocolVersion": 1
   }
   ```
4. **Heartbeat (`ping` / `pong`)**:
   - Server sends `{ "type": "ping" }`.
   - Client responds with `{ "type": "pong" }`.

---

## Session Subscriptions

### 1. `session_subscribe` (Client -> Server)
Subscribe WebSocket client connection to agent session events.
```json
{
  "type": "session_subscribe",
  "sessionId": "session-xyz"
}
```

Server response:
```json
{
  "type": "session_subscribed",
  "sessionId": "session-xyz"
}
```

### 2. `session_unsubscribe` (Client -> Server)
Unsubscribe WebSocket client connection from agent session events without destroying the underlying session.
```json
{
  "type": "session_unsubscribe",
  "sessionId": "session-xyz"
}
```

Server response:
```json
{
  "type": "session_unsubscribed",
  "sessionId": "session-xyz"
}
```

---

## Control & Execution Messages (Client -> Server)

- **`prompt`**: Send a message prompt to the agent session.
  ```json
  {
    "type": "prompt",
    "sessionId": "session-xyz",
    "message": "User prompt text",
    "tools": ["read", "write"],
    "images": []
  }
  ```
- **`steer`**: Guide an active session execution.
  ```json
  {
    "type": "steer",
    "sessionId": "session-xyz",
    "message": "Steer instruction"
  }
  ```
- **`abort`**: Abort active session loop execution.
  ```json
  {
    "type": "abort",
    "sessionId": "session-xyz"
  }
  ```
- **`ui_action`**: Respond to an interactive tool UI prompt (ask question, approval form).
  ```json
  {
    "type": "ui_action",
    "componentId": "comp-123",
    "action": "submit",
    "payload": { "answer": "yes" }
  }
  ```

---

## Server to Client Event Stream (`WsServerMessage`)

### Control Plane Events
- **`approval_request`**: Broadcast when a tool execution requires human approval.
  ```json
  {
    "type": "approval_request",
    "approval": {
      "id": "appr-123",
      "toolName": "bash",
      "status": "pending"
    }
  }
  ```
- **`project_updated`**: Broadcast on workspace project modifications.
  ```json
  {
    "type": "project_updated",
    "projectId": "proj-123"
  }
  ```
- **`error`**: Error response for malformed or unauthorized requests.
  ```json
  {
    "type": "error",
    "error": "Invalid message",
    "code": "WS_INVALID_MESSAGE"
  }
  ```

### Agent Runtime Events (Session Scoped)
All session-scoped agent events emitted via session subscription carry a top-level `sessionId` property:
- `agent_start`, `agent_end`
- `message_start`, `message_update`, `message_end`
- `tool_execution_start`, `tool_execution_update`, `tool_execution_end`
- `agent_error`

# Reporte: `@earendil-works/pi-orchestrator` v0.80.3

Orquestador local del ecosistema **pi**. Un daemon que gestiona instancias de agentes de IA como procesos hijo, expone CLI y API IPC por Unix socket, y mantiene presencia en nube (Radius).

---

## 1. Arquitectura General

```
CLI (cli.ts) ──socket──> IPC Server (ipc/server.ts) ──> Handler (handler.ts)
                                                              |
                                                    OrchestratorSupervisor (supervisor.ts)
                                                         |            |
                                                   rpc-process.ts   storage.ts
                                                   (child process)  (JSON files)
                                                         |
                                              @earendil-works/pi-coding-agent
                                              (proceso Node/Bun hijo)
```

**Flujo tipico:**

1. El usuario corre `orchestrator spawn --cwd /path` por CLI
2. El CLI envia un JSON por Unix socket al daemon
3. El `handler.ts` despacha al `supervisor.ts`
4. `supervisor.spawnInstance()` crea un `RpcProcessInstance` (proceso hijo con el coding-agent)
5. Se persiste en `~/.pi/orchestrator/instances.json`
6. Se registra en Radius (nube) para presencia online
7. El hijo y el daemon se comunican por stdin/stdout con JSONL RPC

---

## 2. Estructura de Archivos

```
src/
  index.ts          -- barrel re-export (todo menos cli.ts y radius.ts)
  cli.ts            -- entrypoint CLI
  config.ts         -- paths, version, deteccion Bun binary
  types.ts          -- tipos compartidos del dominio
  handler.ts        -- dispatcher de requests IPC
  supervisor.ts     -- ciclo de vida de instancias (core)
  rpc-process.ts    -- wrapper de proceso hijo (stdin/stdout RPC)
  serve.ts          -- bootstrap del daemon
  storage.ts        -- persistencia JSON sync
  radius.ts         -- presencia en nube Radius (heartbeats)
  ipc/
    client.ts       -- cliente Unix socket one-shot
    protocol.ts     -- vocabulario completo del protocolo IPC
    server.ts       -- servidor Unix socket (request-response + streaming)
```

---

## 3. Capa de Transporte: `src/ipc/`

### `protocol.ts`

Define TODO el vocabulario del protocolo IPC.

**Requests (discriminadas por `type`):**

| Tipo | Payload |
|---|---|
| `spawn` | `{ cwd, label?, provider?, model? }` |
| `list` | `{}` |
| `status` | `{ instanceId }` |
| `stop` | `{ instanceId }` |
| `rpc` | `{ instanceId, command: RpcCommand }` |
| `rpc_stream` | `{ instanceId }` |

**Sub-protocolo streaming:**

- `RpcClientMessage` = `RpcCommand | RpcExtensionUIResponse`
- `RpcServerMessage` = `RpcReadyResponse | RpcResponse | AgentSessionEvent | RpcExtensionUIRequest | ErrorResponse`

**Tipado avanzado:**

- `ResponseFor<T>`: tipo condicional que mapea cada request a su response en type-level
- `ProtocolMessage`: union de todo mensaje valido en el protocolo
- Codificacion: `JSON.stringify` + `\n` (JSONL)

### `client.ts`

- `sendIpcRequest(request)`: conecta al socket, escribe 1 mensaje, lee 1 respuesta, cierra
- Guardia `settled` para evitar double resolve/reject
- Rechaza si el socket se cierra sin respuesta

### `server.ts`

- `startIpcServer(handler)`: crea Unix socket, limpia sockets stale
- **Deteccion de stale socket**: intenta conectar; si nadie responde, borra el archivo
- **Modo normal**: request -> response -> close
- **Modo streaming** (`rpc_stream`):
  1. Envia `rpc_ready`
  2. Socket entra en full-duplex
  3. Cliente -> servidor: comandos RPC / UI responses
  4. Servidor -> cliente: respuestas RPC, eventos de sesion, UI requests
  5. On socket close -> `stream.close()`
- Cola de requests serializada (`rpcRequestQueue`) para evitar mutacion concurrente del stdin del hijo

---

## 4. Gestion de Procesos Hijo: `src/rpc-process.ts`

`createRpcProcessInstance({ cwd })` -> `RpcProcessInstance`

### Resolucion del entrypoint

- **Bun binary**: `pi pi --mode rpc`
- **Node**: `require.resolve("@earendil-works/pi-coding-agent/rpc-entry")`

### Comunicacion

- `stdin`: JSONL de commands (`RpcCommand`) y UI responses (`RpcExtensionUIResponse`)
- `stdout`: JSONL de respuestas (`RpcResponse`), eventos de sesion (`AgentSessionEvent`), UI requests (`RpcExtensionUIRequest`)
- Cada request tiene `id` unico (`orchestrator_N_uuid`)
- `pendingRequests`: Map de Promises matcheadas por `id`
- Mensajes sin `id` -> broadcast a `onEvent` listeners

### Ciclo de vida

| Metodo | Funcion |
|---|---|
| `send(command)` | Escribe al stdin, retorna `Promise<RpcResponse>` |
| `handleUiResponse(response)` | Escribe UI response al stdin |
| `setUiRequestHandler(handler)` | Registra callback para UI requests entrantes |
| `onEvent(listener)` | Suscribe a eventos de sesion, retorna unsubscribe |
| `onExit(listener)` | Suscribe a exit del proceso, retorna unsubscribe |
| `dispose()` | `SIGTERM` -> espera `exit` -> rejecta todo pending |

---

## 5. Supervisor: `src/supervisor.ts`

`OrchestratorSupervisor` - singleton. Nucleo del sistema.

### Metodos publicos

| Metodo | Funcion |
|---|---|
| `spawnInstance({cwd, label})` | UUID -> spawn child -> sync session state -> register Radius -> "online" |
| `stopInstance(id)` | "stopping" -> cleanup -> "stopped" -> remove |
| `handleRpc(id, command)` | Envia RPC al hijo, refresca metadata de sesion |
| `openRpcStream(id, onEvent, onUiRequest)` | Streaming bidireccional con eventos |
| `getInstance(id)` | De live map o persisted storage |
| `getLiveInstance(id)` | Solo de live map |
| `listInstances()` | Todas las persisted |
| `listLiveInstances()` | Solo las in-memory |
| `updateInstance(record)` | Actualiza live + persiste |
| `recoverAfterRestart()` | Marca "online"/"starting" como "stopped", limpia Radius |
| `shutdown()` | Detiene todas las instancias secuencialmente |

### Optimizacion: session metadata refresh

Solo 6 comandos gatillan sync de metadata (`sessionId`, `sessionFile`):

```
new_session, switch_session, fork, clone, set_session_name, prompt
```

### Estado dual

- **En memoria**: `LiveInstance` = record + recursos runtime + subscribers + teardown
- **En disco**: `instances.json`

### Bindings

Cada `RpcProcessInstance` se bindea al live instance con:

- `onEvent` -> broadcast a subscribers
- `onUiRequest` -> routing al handler de UI
- `onExit` inesperado -> marca "error", cleanup, remove del live map

### Conexion con Radius

Al cargar el modulo:

```typescript
radiusPresence.setCoordinator({
  getLiveInstance,
  listLiveInstances,
  updateInstance,
});
```

---

## 6. Persistencia: `src/storage.ts`

Operaciones sincronicas (sin locks, asume proceso unico).

### Archivos en `~/.pi/orchestrator/`

| Archivo | Contenido |
|---|---|
| `instances.json` | `InstanceRecord[]` |
| `machine.json` | `MachineRecord` (unico) |
| `orchestrator.sock` | Unix socket |
| `auth.json` | Credenciales OAuth (para Radius) |

### Operaciones

| Funcion | Descripcion |
|---|---|
| `loadMachine()` | `MachineRecord \| undefined` |
| `saveMachine(m)` | Escribe machine.json |
| `deleteMachine()` | Elimina machine.json |
| `loadInstances()` | `InstanceRecord[]` |
| `saveInstances(arr)` | Escribe instances.json |
| `getInstance(id)` | Busqueda lineal |
| `upsertInstance(r)` | Inserta o reemplaza por `id` |
| `removeInstance(id)` | Filtra y re-guarda |

---

## 7. Presencia en Nube (Radius): `src/radius.ts`

`RadiusPresence` - singleton para heartbeat cloud.

### Flujo de Registro

```
start(label)
  -> POST /v1/machines/register
  -> recibe { id, heartbeatIntervalMs, expiresInMs }
  -> guarda en storage
  -> inicia machine heartbeat loop
  -> retorna MachineRecord

registerPi(instance)
  -> POST /v1/pis/register  { machineId, piId, ... }
  -> recibe radiusPiId
  -> inicia Pi heartbeat loop
```

### Heartbeat

- **Machine**: POST `/v1/machines/heartbeat` con hostname, platform, version
- **Pi**: POST `/v1/pis/heartbeat` con `radiusPiId`
- Frecuencia: definida por server en `heartbeatIntervalMs`

### Estrategia de Reintentos

- **Exponential backoff**: 1s base, max 30s, con jitter
- `NOT_FOUND_RETRY_THRESHOLD = 3`: tras 3 404 consecutivos:
  - Para machine: re-registra machine + todos los Pi vivos
  - Para Pi: re-registra ese Pi
- Errores transitorios: se reintentan con backoff

### Coordinador

Interface `RadiusPresenceCoordinator` para acoplamiento suelto con supervisor:

```typescript
interface RadiusPresenceCoordinator {
  getLiveInstance(instanceId): InstanceRecord | undefined;
  listLiveInstances(): InstanceRecord[];
  updateInstance(record): void;
}
```

---

## 8. CLI: `src/cli.ts`

Entrypoint ejecutable (`#!/usr/bin/env node`).

| Comando | Descripcion |
|---|---|
| `serve` | Inicia el daemon (delega a `serve()`) |
| `list` | Lista instancias via IPC |
| `spawn [--cwd] [--label]` | Crea nueva instancia |
| `status <id>` | Estado de una instancia |
| `stop <id>` | Detiene una instancia |
| `rpc <id> <json>` | Comando RPC one-shot |
| `rpc-stream <id>` | Streaming: stdin -> socket, socket -> stdout |
| `--help` / `--version` | Ayuda / version |

**`rpc-stream`**: modo avanzado que crea un bridge persistente entre stdin/stdout del CLI y el socket del daemon, parseando JSONL del stdin y forwardeando al socket.

---

## 9. Configuracion: `src/config.ts`

### Resolucion de directorio

```
PI_ORCHESTRATOR_DIR (env)          -> override total
  PI_CONFIG_DIR/orchestrator (env)  -> override de base
    ~/.pi/orchestrator              -> default
```

### Paths

| Funcion | Path |
|---|---|
| `getAuthPath()` | `{dir}/auth.json` |
| `getMachinePath()` | `{dir}/machine.json` |
| `getInstancesPath()` | `{dir}/instances.json` |
| `getSocketPath()` | `{dir}/orchestrator.sock` |

### Deteccion Bun binary

Variables en `import.meta.url`:

- `$bunfs` (Linux)
- `~BUN` / `%7EBUN` (Windows)

---

## 10. Tipos Compartidos: `src/types.ts`

```typescript
type InstanceStatus = "starting" | "online" | "stopping" | "stopped" | "error";

interface InstanceRecord {
  id: string;
  status: InstanceStatus;
  cwd: string;
  createdAt: string;
  lastSeenAt?: string;
  label?: string;
  sessionId?: string;
  sessionFile?: string;
  radiusPiId?: string;
}

interface MachineRecord {
  id: string;
  createdAt: string;
  lastSeenAt?: string;
  label?: string;
}

interface RadiusRegistration {
  heartbeatIntervalMs: number;
  expiresInMs: number;
}
```

---

## 11. Diagrama de Dependencias Internas

```
index.ts (barrel: re-exporta todo menos cli.ts y radius.ts)
  |
  +-- config.ts        <-- leen: rpc-process, serve, storage, radius, ipc/client, ipc/server
  +-- types.ts         <-- leen: storage, radius, ipc/protocol, handler
  +-- storage.ts       <-- leen: supervisor, radius
  +-- radius.ts        <-- lee: supervisor (via coordinator)
  +-- supervisor.ts    <-- lee: rpc-process, storage, radius
  +-- handler.ts       <-- lee: supervisor, ipc/protocol, types
  +-- ipc/protocol.ts  <-- leen: ipc/client, ipc/server
  +-- ipc/client.ts    <-- lee: config, protocol
  +-- ipc/server.ts    <-- lee: config, protocol
  +-- rpc-process.ts   <-- lee: config
  +-- serve.ts         <-- lee: config, handler, ipc/server, radius, supervisor
```

### Dependencia externa unica

`@earendil-works/pi-coding-agent` (tipos + `AuthStorage`) - solo tipos en imports.

---

## 12. Resumen

`pi-orchestrator` es un **daemon orquestador** que:

- **Spawna** procesos hijo con agentes de IA (`pi-coding-agent`) como subprocesos Node/Bun
- **Controla** instancias via RPC sobre stdin/stdout con JSONL
- **Expone** un CLI y API Unix socket (request-response + streaming full-duplex)
- **Persiste** estado en `~/.pi/orchestrator/` (JSON sincronico)
- **Mantiene presencia** en nube Radius con heartbeats, backoff exponencial y re-registro automatico
- **Recupera** estado al reiniciar (limpia instancias huerfanas y registros Radius)
- **Escala** a multiples sesiones simultaneas, cada una con su propio proceso hijo y heartbeat independiente

# Plans

## Activos

| #   | Documento                                                                                                | Estado            | Qué es                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------- |
| 03  | [03-core-sdk-next-steps.md](./03-core-sdk-next-steps.md)                                                 | 🔜 **Próximo**    | 14 ítems a implementar: deuda técnica, stubs rotos, arquitectura pendiente, UX de config                 |
| 04  | [04-post-next-steps.md](./04-post-next-steps.md)                                                         | 📋 Planificado    | Lo que se abre después de resolver los 14 ítems: SDK, workflows, observabilidad, plugins                 |
| 05  | [05-post-04-next-steps.md](./05-post-04-next-steps.md)                                                   | 📋 Planificado    | Lo que queda después del 04: testing, distribución, seguridad, colaboración, escalabilidad               |
| 06  | [06-foundations.md](./06-foundations.md)                                                                 | 📋 Planificado    | Foundations open-source: licencia, CI/CD, documentación, infraestructura comunitaria                     |
| 07  | [07-code-quality.md](./07-code-quality.md)                                                               | 📋 Planificado    | Calidad de código: testing, tooling, strict TS, error handling centralizado, API docs                    |
| 08  | [08-security.md](./08-security.md)                                                                       | 📋 Planificado    | Hardening de seguridad: clave hardcodeada, secretlint, auth, sandbox bash, rate limiting                 |
| 09  | [09-architecture-extensibility.md](./09-architecture-extensibility.md)                                   | 📋 Planificado    | Extensibilidad vs. Google ADK: plugins, providers, tools, stores, SDK packaging                          |
| 10  | [10-technical-debt.md](./10-technical-debt.md)                                                           | 📋 Planificado    | Deuda técnica: singletons, AgentSession god object, route splitting, WS contract                         |
| 12  | [12-entity-config-cascade.md](./12-entity-config-cascade.md)                                             | 📋 Planificado    | Config por entidad: CascadeConfigLoader genérico, `.spaces/config.json`, herencia global→entidad         |
| 13  | [13-agent-sdk-abstraction.md](./13-agent-sdk-abstraction.md)                                             | 📋 Planificado    | Abstracción ADK-level: `new SpacesAgent({...})` declarativo, `SpacesRunner` standalone, SDK portable     |
| 16  | [16-custom-tools-entity-scoping.md](./16-custom-tools-entity-scoping.md)                                 | 📋 Planificado    | Custom Tools con scoping por entidad: add, activate, deactivate global/project/agent con UI              |
| 17  | [17-decouple-phase1-agent-runtime-eventbus.md](./17-decouple-phase1-agent-runtime-eventbus.md)           | ✅ **Completado** | Hito 1: Puertos Core, `ToolExecutor` y `AgentRuntime` Strategy Adapter                                   |
| 18  | [18-decouple-phase2-session-manager-integration.md](./18-decouple-phase2-session-manager-integration.md) | 🔜 **Próximo**    | Hito 2: Integración de `AgentRuntime` en `SessionManager` y reducción de `AgentSession` God Object       |
| 19  | [19-decouple-phase3-itool-system-tools.md](./19-decouple-phase3-itool-system-tools.md)                   | 📋 Planificado    | Hito 3: Modularización de Herramientas del Sistema (`ITool` desacopladas de vendor)                      |
| 20  | [20-decouple-phase4-filesystem-session-store.md](./20-decouple-phase4-filesystem-session-store.md)       | 📋 Planificado    | Hito 4: Persistencia Limpia `FilesystemSessionStore` (`ISessionStore` JSONL desacoplada)                 |
| 21  | [21-decouple-phase5-openai-compatible-provider.md](./21-decouple-phase5-openai-compatible-provider.md)   | 📋 Planificado    | Hito 5: Proveedor de Modelo Unificado `OpenAICompatibleProvider` (`IModelProvider` SSE con fetch nativo) |

## Referencia

| Documento                                                    | Qué es                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [core-architecture-report.md](./core-architecture-report.md) | Mapa del runtime actual: mecanismos, capas, acoplamiento, definición de core |

## Completados

| #   | Documento                                                                                      | Qué resolvió                                                                                         |
| --- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 01  | [completed/01-core-sdk-implementation-plan.md](./completed/01-core-sdk-implementation-plan.md) | Fases 0-2: puertos, model resolver, delegation service, workspace config, envelope v2, afterToolCall |

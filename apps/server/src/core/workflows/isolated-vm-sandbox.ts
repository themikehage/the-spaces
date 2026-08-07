// SPDX-License-Identifier: MIT
import { BadRequestError } from "../infra/errors";
import type { CodeSandboxOptions, ICodeSandbox } from "../ports/code-sandbox.port";

export class CodeExecutionError extends BadRequestError {
  constructor(message: string) {
    super("CODE_EXECUTION_ERROR", message);
  }
}

export class IsolatedVmSandbox implements ICodeSandbox {
  async executeCode(
    code: string,
    context: Record<string, unknown>,
    options?: CodeSandboxOptions,
  ): Promise<Record<string, unknown>> {
    const timeoutMs = options?.timeoutMs || 5000;
    const memoryLimitMb = options?.memoryLimitMb || 128;

    let ivm: typeof import("isolated-vm") | null = null;
    try {
      const mod = await import("isolated-vm");
      ivm = ((mod as unknown as { default?: typeof import("isolated-vm") }).default ?? mod) as typeof import("isolated-vm");
    } catch {
      ivm = null;
    }

    if (ivm && typeof ivm.Isolate === "function") {
      let isolate: InstanceType<typeof ivm.Isolate> | null = null;
      try {
        isolate = new ivm.Isolate({ memoryLimit: memoryLimitMb });
      } catch {
        isolate = null;
      }

      if (isolate) {
        try {
          const vmContext = await isolate.createContext();
          const jail = vmContext.global;
          await jail.set("global", jail.deref());

          const serializedContext = JSON.stringify(context);
          await jail.set("$context_json", serializedContext);

          const scriptCode = `
          const $scope = JSON.parse($context_json);
          const $inputs = $scope.$inputs || {};
          const $steps = $scope.$steps || {};
          const $run = $scope.$run || {};

          function registerAlias(target, key, val) {
            if (!target || typeof target !== 'object') return;
            target[key] = val;
            const raw = key.startsWith("$") ? key.slice(1) : key;
            target[raw] = val;
            target['$' + raw] = val;
            if (raw.includes("-")) {
              const snake = raw.replace(/-/g, "_");
              target[snake] = val;
              target['$' + snake] = val;
              const camel = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              target[camel] = val;
              target['$' + camel] = val;
              const prefix = raw.split("-")[0];
              if (prefix && !(prefix in target)) target[prefix] = val;
              if (prefix && !('$' + prefix in target)) target['$' + prefix] = val;
            }
          }

          for (const [k, v] of Object.entries($scope)) {
            registerAlias(globalThis, k, v);
            if (v && typeof v === 'object' && ('outputs' in v || 'status' in v) && !k.startsWith('$')) {
              registerAlias($steps, k, v);
            }
          }
          for (const [k, v] of Object.entries($steps)) {
            registerAlias($steps, k, v);
          }
          
          function __userCode() {
            ${code}
          }
          const __result = __userCode();
          JSON.stringify(__result || {});
        `;

          const script = await isolate.compileScript(scriptCode);
          const resultJson = await script.run(vmContext, { timeout: timeoutMs });
          const parsed = JSON.parse(resultJson);
          return typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : { result: parsed };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new CodeExecutionError(`Isolated VM execution failed: ${msg}`);
        } finally {
          isolate.dispose();
        }
      }
    }

    const vm = await import("node:vm");
    const sandbox: Record<string, unknown> = {
      $scope: context,
      $inputs: context.$inputs || {},
      $steps: context.$steps || {},
      $run: context.$run || {},
      outputs: {} as Record<string, unknown>,
    };

    const registerAlias = (target: Record<string, unknown>, key: string, val: unknown) => {
      if (!target || typeof target !== "object") return;
      target[key] = val;
      const raw = key.startsWith("$") ? key.slice(1) : key;
      target[raw] = val;
      target[`$${raw}`] = val;
      if (raw.includes("-")) {
        const snake = raw.replace(/-/g, "_");
        target[snake] = val;
        target[`$${snake}`] = val;
        const camel = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        target[camel] = val;
        target[`$${camel}`] = val;
        const prefix = raw.split("-")[0];
        if (prefix && !(prefix in target)) target[prefix] = val;
        if (prefix && !(`$${prefix}` in target)) target[`$${prefix}`] = val;
      }
    };

    for (const [k, v] of Object.entries(context)) {
      registerAlias(sandbox, k, v);
      if (v && typeof v === "object" && ("outputs" in v || "status" in v) && !k.startsWith("$")) {
        registerAlias(sandbox.$steps as Record<string, unknown>, k, v);
      }
    }
    const stepsObj = (context.$steps || context.steps || {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(stepsObj)) {
      registerAlias(sandbox.$steps as Record<string, unknown>, k, v);
    }

    const vmContext = vm.createContext(sandbox);

    const wrappedCode = `
      (function() {
        ${code}
        return outputs;
      })()
    `;

    try {
      const res = vm.runInContext(wrappedCode, vmContext, { timeout: timeoutMs });
      return typeof res === "object" && res !== null
        ? (res as Record<string, unknown>)
        : (sandbox.outputs as Record<string, unknown>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CodeExecutionError(`Sandbox execution failed: ${msg}`);
    }
  }
}

export const codeSandbox = new IsolatedVmSandbox();

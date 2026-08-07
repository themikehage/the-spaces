import type { WorkflowRun, WorkflowStep, WorkflowStepState } from "shared";
import type { ICredentialStore } from "../../ports/credential-store.port";
import type { IHttpClient } from "../../ports/http-client.port";
import { getNestedValue, interpolateValue } from "../variable-interpolator";

export function applyResponseMapping(
  body: unknown,
  mapping: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!body || typeof body !== "object") return result;

  for (const [outputKey, pathExpr] of Object.entries(mapping)) {
    const cleanPath = pathExpr.startsWith("$.") ? pathExpr.slice(2) : pathExpr.startsWith("$") ? pathExpr.slice(1) : pathExpr;
    const extracted = getNestedValue(body as Record<string, unknown>, cleanPath);
    if (extracted !== undefined) {
      result[outputKey] = extracted;
    }
  }

  return result;
}

export async function executeHttpStep(
  step: WorkflowStep,
  run: WorkflowRun,
  scope: Record<string, unknown>,
  startedAt: string,
  httpClient: IHttpClient,
  credentialStore: ICredentialStore,
): Promise<WorkflowStepState> {
  const rawUrl = step.httpUrl ?? "";
  if (!rawUrl) {
    throw new Error(`HTTP step '${step.label}' requires a valid URL.`);
  }

  const url = String(interpolateValue(rawUrl, scope));
  const rawHeaders = (step.httpHeaders ?? {}) as Record<string, string>;
  const headers = (interpolateValue(rawHeaders, scope) ?? {}) as Record<string, string>;

  let body: unknown = undefined;
  if (step.httpBody !== undefined && step.httpBody !== null) {
    body = interpolateValue(step.httpBody, scope);
  }

  if (step.httpCredentialId) {
    const resolvedCred = await credentialStore.resolve(run.username, step.httpCredentialId);
    if (!resolvedCred) {
      throw new Error(`Credential '${step.httpCredentialId}' not found for step '${step.label}'.`);
    }
    Object.assign(headers, resolvedCred.authHeader);
  }

  const method = step.httpMethod ?? "GET";
  const timeoutMs = step.httpTimeoutMs ?? 10_000;

  const response = await httpClient.request({
    method,
    url,
    headers,
    body: ["GET", "DELETE"].includes(method) ? undefined : body,
    timeoutMs,
  });

  const expectedStatuses = step.httpExpectStatus;
  const isSuccess = expectedStatuses && expectedStatuses.length > 0
    ? expectedStatuses.includes(response.status)
    : response.ok;

  if (!isSuccess) {
    const errorDetails = typeof response.body === "object" ? JSON.stringify(response.body) : String(response.body);
    throw new Error(`HTTP ${method} '${url}' failed with status ${response.status}: ${errorDetails}`);
  }

  const mappedOutputs = applyResponseMapping(response.body, step.httpResponseMapping ?? {});

  const outputs: Record<string, unknown> = {
    status: response.status,
    ok: response.ok,
    body: response.body,
    headers: response.headers,
    ...mappedOutputs,
  };

  return {
    stepId: step.id,
    status: "success",
    startedAt,
    completedAt: new Date().toISOString(),
    outputs,
  };
}

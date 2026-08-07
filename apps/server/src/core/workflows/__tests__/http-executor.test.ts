import { describe, expect, it } from "bun:test";
import type { ICredentialStore } from "../../ports/credential-store.port";
import type { IHttpClient, HttpRequestOptions, HttpResponse } from "../../ports/http-client.port";
import { applyResponseMapping, executeHttpStep } from "../executors/http-executor";
import { StepExecutor } from "../step-executor";

class MockHttpClient implements IHttpClient {
  public lastOpts?: HttpRequestOptions;
  constructor(private response: HttpResponse) {}

  async request(opts: HttpRequestOptions): Promise<HttpResponse> {
    this.lastOpts = opts;
    return this.response;
  }
}

class MockCredentialStore implements ICredentialStore {
  async create(): Promise<any> { throw new Error("Not implemented"); }
  async get(): Promise<any> { return null; }
  async resolve(username: string, id: string) {
    if (id === "cred-1") {
      return { authHeader: { Authorization: "Bearer secret-token-123" } };
    }
    return null;
  }
  async list(): Promise<any[]> { return []; }
  async delete(): Promise<void> {}
}

describe("http-executor", () => {
  it("applies JSONPath response mapping correctly", () => {
    const body = {
      data: {
        user: {
          id: 42,
          name: "Alice",
        },
      },
    };
    const mapping = {
      userId: "$.data.user.id",
      userName: "data.user.name",
    };

    const mapped = applyResponseMapping(body, mapping);
    expect(mapped).toEqual({
      userId: 42,
      userName: "Alice",
    });
  });

  it("executes HTTP step with interpolated URL, headers, and credential", async () => {
    const mockClient = new MockHttpClient({
      status: 200,
      ok: true,
      headers: { "content-type": "application/json" },
      body: { status: "ok", data: { id: "res-99" } },
    });
    const mockCreds = new MockCredentialStore();

    const stepState = await executeHttpStep(
      {
        id: "http-1",
        type: "http",
        label: "Call External API",
        httpMethod: "POST",
        httpUrl: "https://api.example.com/items/{{ $inputs.itemId }}",
        httpHeaders: { "X-Custom": "{{ $inputs.customHeader }}" },
        httpBody: { query: "select * from {{ $inputs.table }}" },
        httpCredentialId: "cred-1",
        httpResponseMapping: { resultId: "$.data.id" },
      },
      {
        id: "run-1",
        workflowId: "wf-1",
        workflowName: "WF 1",
        inputs: {},
        status: "running",
        stepStates: {},
        startedAt: new Date().toISOString(),
        username: "testuser",
      },
      {
        $inputs: {
          itemId: "item-123",
          customHeader: "my-val",
          table: "users",
        },
      },
      new Date().toISOString(),
      mockClient,
      mockCreds,
    );

    expect(stepState.status).toBe("success");
    expect(mockClient.lastOpts?.url).toBe("https://api.example.com/items/item-123");
    expect(mockClient.lastOpts?.headers).toEqual({
      "X-Custom": "my-val",
      Authorization: "Bearer secret-token-123",
    });
    expect(mockClient.lastOpts?.body).toEqual({ query: "select * from users" });
    expect(stepState.outputs?.resultId).toBe("res-99");
  });

  it("skips http step during dryRun in StepExecutor", async () => {
    const executor = new StepExecutor({
      sessionManager: {} as any,
      delegationRegistry: {} as any,
    });

    const state = await executor.execute(
      {
        id: "http-1",
        type: "http",
        label: "HTTP Step",
        httpUrl: "https://example.com",
      },
      {
        id: "run-1",
        workflowId: "wf-1",
        workflowName: "WF",
        inputs: {},
        status: "running",
        stepStates: {},
        startedAt: new Date().toISOString(),
        username: "testuser",
      },
      {},
      "/tmp",
      undefined,
      true,
    );

    expect(state.status).toBe("skipped");
  });
});

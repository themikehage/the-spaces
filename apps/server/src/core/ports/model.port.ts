// SPDX-License-Identifier: MIT

export interface ModelCompletionOptions {
  messages: unknown[];
  tools?: unknown[];
  system?: string;
  signal?: AbortSignal;
}

export interface IModelProvider {
  createModel(modelId?: string): unknown;
  getApiKey?(provider?: string): Promise<string | undefined> | string | undefined;
}

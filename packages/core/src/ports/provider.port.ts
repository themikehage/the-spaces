// SPDX-License-Identifier: MIT
import type { IModelProvider } from "./model.port.js";

export interface IProviderRegistry {
  register(provider: IModelProvider): void;
  get(name: string): IModelProvider | undefined;
  getOrThrow(name: string): IModelProvider;
  list(): string[];
  clear(): void;
}

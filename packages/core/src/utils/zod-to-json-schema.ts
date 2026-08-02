// SPDX-License-Identifier: MIT
import type { ZodTypeAny } from "zod";

export interface LLMJsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  [key: string]: unknown;
}

export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema as unknown as {
    _def?: { shape?: () => Record<string, unknown> };
    shape?: Record<string, unknown>;
  };
  const shape = def._def?.shape?.() ?? def.shape ?? {};
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const val = value as {
      description?: string;
      isOptional?: () => boolean;
      _def?: { description?: string };
    };
    properties[key] = {
      type: "string",
      description: val.description ?? val._def?.description ?? "",
    };
    if (!val.isOptional?.()) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}

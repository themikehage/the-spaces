// SPDX-License-Identifier: MIT
import type { EntityConfig } from "./entity-config";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge(base: EntityConfig, override: EntityConfig): EntityConfig {
  const result: EntityConfig = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;

    const baseValue = result[key];

    if (Array.isArray(value)) {
      const baseArr = Array.isArray(baseValue) ? baseValue : [];
      result[key] = [...new Set([...baseArr, ...value])];
      continue;
    }

    if (isRecord(value)) {
      const baseRecord = isRecord(baseValue) ? baseValue : {};
      result[key] = { ...baseRecord, ...value };
      continue;
    }

    result[key] = value;
  }

  if (override.toolOverrides?.remove && Array.isArray(result.toolOverrides?.add)) {
    const removeSet = new Set(override.toolOverrides.remove);
    const updatedAdd = (result.toolOverrides.add as string[]).filter(
      (t) => !removeSet.has(t),
    );
    result.toolOverrides = {
      ...result.toolOverrides,
      add: updatedAdd,
    };
  }

  return result;
}

// SPDX-License-Identifier: MIT

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = path.split(".");
  let current: any = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === "string") {
      try {
        current = JSON.parse(current);
      } catch {
        return undefined;
      }
    }
    if (typeof current !== "object") return undefined;
    current = current[key];
  }

  return current;
}

export function interpolateString(template: string, scope: Record<string, unknown>): unknown {
  const exactMatch = template.match(/^\{\{([\w.-]+)\}\}$/);
  if (exactMatch) {
    const val = getNestedValue(scope, exactMatch[1]);
    if (val !== undefined) {
      return val;
    }
  }

  return template.replace(/\{\{([\w.-]+)\}\}/g, (match, path) => {
    const val = getNestedValue(scope, path);
    if (val !== undefined) {
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return String(val);
    }
    return match;
  });
}

export function interpolateValue(value: unknown, scope: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return interpolateString(value, scope);
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, scope));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = interpolateValue(v, scope);
    }
    return result;
  }
  return value;
}

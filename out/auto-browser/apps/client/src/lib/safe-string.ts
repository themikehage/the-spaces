// SPDX-License-Identifier: MIT

/**
 * Safely converts any value (string, primitive, object, array, null, undefined)
 * into a plain string usable as a React child node without throwing invalid child errors.
 */
export function toSafeString(val: unknown, fallback: string = ""): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    const obj = val as Record<string, any>;
    if (typeof obj.item === "string") return obj.item;
    if (Array.isArray(obj.item)) {
      const parts = obj.item.map((i) => toSafeString(i)).filter(Boolean);
      if (parts.length > 0) return parts.join(" / ");
    }
    if (typeof obj.label === "string") return obj.label;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.title === "string") return obj.title;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.option === "string") return obj.option;
    if (typeof obj.description === "string") return obj.description;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
}

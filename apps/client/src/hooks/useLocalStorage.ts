// SPDX-License-Identifier: MIT
import { storage, type StorageKey } from "@/lib/storage";
import { useCallback, useState } from "react";

export function useLocalStorage<T>(
  key: StorageKey,
  defaultValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = storage.getJSON<T>(key);
    return item !== null ? item : defaultValue;
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        storage.setJSON(key, nextValue);
        return nextValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}

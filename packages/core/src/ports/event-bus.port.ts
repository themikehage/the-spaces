export interface IEventBus<T extends { type: string }> {
  emit(event: T): void;
  on<E extends T["type"]>(type: E, handler: (event: Extract<T, { type: E }>) => void): () => void;
  clear(): void;
}

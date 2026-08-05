// SPDX-License-Identifier: MIT

export type EntityEventType =
  "agent" | "team" | "project" | "session" | "config" | "skill" | "custom-tool" | "settings";

export interface EntityUpdatedEvent {
  type?: EntityEventType;
  id?: string;
  action?: "created" | "updated" | "deleted";
}

const EVENT_NAME = "entity-updated";

export const EntityEventBus = {
  emit(event?: EntityUpdatedEvent): void {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
  },

  subscribe(handler: (event?: EntityUpdatedEvent) => void): () => void {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<EntityUpdatedEvent | undefined>;
      handler(customEvent.detail);
    };

    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  },
};

export interface CreateAfterToolCallHookParams {
  sessionId: string;
  username: string;
}

export function createAfterToolCallHook({ sessionId, username }: CreateAfterToolCallHookParams) {
  return async (_context: any): Promise<void> => {
    // Stub extension point for tool call audit logging, metrics, or side-effects.
  };
}

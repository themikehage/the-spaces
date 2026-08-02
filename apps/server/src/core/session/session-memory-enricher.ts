// SPDX-License-Identifier: MIT
export function enrichSessionWithMemory(session: any, memory: any): void {
  const originalPrompt = session.prompt.bind(session);
  session.prompt = async (message: string, opts?: any) => {
    const memCtx = await memory.buildContext(message);
    if (memCtx) session.injectMemoryContext(memCtx);
    return originalPrompt(message, opts);
  };
}

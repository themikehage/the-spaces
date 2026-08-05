export interface SandboxOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ISandbox {
  execute(cmd: string, opts?: SandboxOptions): Promise<SandboxResult>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(pattern: string): Promise<string[]>;
}

import { z } from "zod";

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SESSIONS_DIR: z.string().default("./.sessions"),
  SYSTEM_PROMPT: z
    .string()
    .default(
      "You are a helpful AI assistant. You have access to tools to help users with their tasks.",
    ),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): ServerConfig {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error("[config] Invalid environment variables:");
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  return result.data;
}

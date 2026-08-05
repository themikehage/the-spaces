import { z } from "zod";

export const ModelDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const ProviderConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["openai-compatible"]),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  models: z.array(ModelDefinitionSchema).default([]),
  activeModelId: z.string().min(1),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const UpsertProviderSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  type: z.enum(["openai-compatible"]).default("openai-compatible"),
  baseUrl: z.string().url().or(z.literal("")).optional(),
  apiKey: z.string().optional(),
  models: z.array(ModelDefinitionSchema).min(1),
  activeModelId: z.string().min(1),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type UpsertProviderInput = z.infer<typeof UpsertProviderSchema>;

export const DEFAULT_PRESET_PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai-compatible",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "o3-mini", name: "o3 Mini" },
    ],
    activeModelId: "gpt-4o-mini",
    enabled: true,
    isDefault: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", name: "DeepSeek V3" },
      { id: "deepseek-reasoner", name: "DeepSeek R1" },
    ],
    activeModelId: "deepseek-chat",
    enabled: false,
    isDefault: false,
  },
  {
    id: "groq",
    name: "Groq",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.3-70b-versatile", name: "LLaMA 3.3 70B" },
      { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 LLaMA 70B" },
    ],
    activeModelId: "llama-3.3-70b-versatile",
    enabled: false,
    isDefault: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "LLaMA 3.3 70B" },
      { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
    ],
    activeModelId: "anthropic/claude-3.5-sonnet",
    enabled: false,
    isDefault: false,
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    type: "openai-compatible",
    baseUrl: "https://opencode.ai/zen/go/v1",
    models: [
      { id: "cli-gpt-4o-mini", name: "CLI GPT-4o Mini" },
      { id: "cli-claude-3.5-sonnet", name: "CLI Claude 3.5 Sonnet" },
      { id: "cli-gemini-2.5-flash", name: "CLI Gemini 2.5 Flash" },
    ],
    activeModelId: "cli-gpt-4o-mini",
    enabled: false,
    isDefault: false,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    type: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    models: [
      { id: "llama3.2", name: "LLaMA 3.2" },
      { id: "qwen2.5-coder", name: "Qwen 2.5 Coder" },
      { id: "deepseek-r1:14b", name: "DeepSeek R1 14B" },
    ],
    activeModelId: "llama3.2",
    enabled: false,
    isDefault: false,
  },
];

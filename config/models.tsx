import { TModelItem } from "@/lib/types";

export const providers = [
  "llmchat",
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "lmstudio",  
  "groq",
] as const;

export const ollamaModelsSupportsTools = [
  "llama3-groq-tool-use:latest",
  "llama3.2:3b",
];

export const lmStudioModelsSupportsTools = [
  "llama3.2:3b"
];

export const allPlugins = [
  "web_search",
  "image_generation",
  "memory",
  "webpage_reader",
  "py_interpreter",
  "bar_chart",
  "pie_chart",
  "line_chart",
];

export const models: TModelItem[] = [
  ...(process.env.NEXT_PUBLIC_ENABLE_AUTH === "true"
    ? ([
        {
          name: "LLMChat",
          key: "llmchat",
          isFree: true,
          isSignUpRequired: true,
          tokens: 128000,
          maxOutputTokens: 2048,
          description: "Free Model, Sign up required",
          vision: true,
          plugins: allPlugins,
          icon: "llmchat",
          provider: "llmchat",
        },
      ] as TModelItem[])
    : []),
  {
    name: "GPT 4o Mini",
    key: "gpt-4o-mini",
    isNew: true,
    tokens: 128000,
    description: "Best for everyday tasks",
    maxOutputTokens: 2048,
    vision: true,
    plugins: allPlugins,
    icon: "gpt4",
    provider: "openai",
  },
  {
    name: "GPT 4o",
    key: "gpt-4o",
    isNew: false,
    tokens: 128000,
    description: "Best for complex tasks",
    maxOutputTokens: 2048,
    vision: true,
    plugins: allPlugins,
    icon: "gpt4",
    provider: "openai",
  },
  {
    name: "GPT 4 Turbo",
    key: "gpt-4-turbo",
    isNew: false,
    tokens: 128000,
    description: "Best for complex tasks",
    maxOutputTokens: 4096,
    vision: true,
    plugins: allPlugins,
    icon: "gpt4",
    provider: "openai",
  },
  {
    name: "GPT4",
    key: "gpt-4",
    isNew: false,
    description: "Best for complex tasks",

    tokens: 128000,
    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "gpt4",
    provider: "openai",
  },
  {
    name: "GPT3.5 Turbo",
    key: "gpt-3.5-turbo",
    isNew: false,
    tokens: 16384,
    description: "Best for complex tasks",

    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "gpt3",
    provider: "openai",
  },
  {
    name: "GPT3.5 Turbo 0125",
    key: "gpt-3.5-turbo-0125",
    isNew: false,
    tokens: 16384,
    description: "Best for complex tasks",

    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "gpt3",
    provider: "openai",
  },
  {
    name: "Claude 3 Opus",
    key: "claude-3-opus-20240229",
    isNew: false,
    tokens: 200000,
    vision: true,
    description: "Best for complex tasks",

    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "anthropic",
    provider: "anthropic",
  },
  {
    name: "Claude 3.5 Sonnet",
    key: "claude-3-5-sonnet-20240620",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    vision: true,
    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "anthropic",
    provider: "anthropic",
  },
  {
    name: "Claude 3 Sonnet",
    key: "claude-3-sonnet-20240229",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    vision: true,
    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "anthropic",
    provider: "anthropic",
  },
  {
    name: "Claude 3 Haiku",
    key: "claude-3-haiku-20240307",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    vision: true,
    maxOutputTokens: 4096,
    plugins: allPlugins,
    icon: "anthropic",
    provider: "anthropic",
  },
  {
    name: "Gemini Pro 1.5",
    key: "gemini-1.5-pro-latest",
    isNew: false,
    tokens: 200000,
    vision: true,
    description: "Best for complex tasks",

    maxOutputTokens: 8192,
    plugins: [],
    icon: "gemini",
    provider: "gemini",
  },
  {
    name: "Gemini Flash 1.5",
    key: "gemini-1.5-flash-latest",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    vision: true,
    maxOutputTokens: 8192,
    plugins: [],
    icon: "gemini",
    provider: "gemini",
  },
  {
    name: "Gemini Pro",
    key: "gemini-pro",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    maxOutputTokens: 4096,
    plugins: [],
    icon: "gemini",
    provider: "gemini",
  },

  {
    name: "LLama3 70b Groq",
    key: "llama3-groq-70b-8192-tool-use-preview",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    plugins: ["web_search", "image_generation", "memory", "webpage_reader"],
    maxOutputTokens: 4096,
    icon: "groq",
    provider: "groq",
  },
  {
    name: "LLama3 8b Groq",
    key: "llama3-8b-8192",
    isNew: false,
    tokens: 200000,
    description: "Best for complex tasks",

    plugins: [],
    maxOutputTokens: 4096,
    icon: "groq",
    provider: "groq",
  },
];

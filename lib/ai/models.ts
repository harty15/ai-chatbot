export const DEFAULT_CHAT_MODEL: string = 'gpt-4o';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'google' | 'anthropic';
}

export interface ModelProvider {
  id: 'openai' | 'google' | 'anthropic';
  name: string;
  models: Array<ChatModel>;
}

export const chatModels: Array<ChatModel> = [
  // ChatGPT (OpenAI) Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    description: 'Most advanced multimodal model',
    provider: 'openai',
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Enhanced reasoning and performance',
    provider: 'openai',
  },
  {
    id: 'gpt-4.5',
    name: 'GPT-4.5',
    description: 'Latest generation model',
    provider: 'openai',
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model',
    provider: 'openai',
  },
  {
    id: 'o1-mini',
    name: 'o1-mini',
    description: 'Faster reasoning model',
    provider: 'openai',
  },
  {
    id: 'o3',
    name: 'o3',
    description: 'Next-gen reasoning model',
    provider: 'openai',
  },
  {
    id: 'o3-mini',
    name: 'o3-mini',
    description: 'Efficient reasoning model',
    provider: 'openai',
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    description: 'Great at coding and visual reasoning',
    provider: 'openai',
  },

  // Gemini (Google DeepMind) Models
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Most capable Gemini model with search',
    provider: 'google',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast processing with search grounding',
    provider: 'google',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Can generate images and search sources',
    provider: 'google',
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    description: 'Lightweight and fast',
    provider: 'google',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Advanced multimodal with search',
    provider: 'google',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Quick responses with search sources',
    provider: 'google',
  },

  // Claude (Anthropic) Models
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4',
    description: 'Most powerful Claude model',
    provider: 'anthropic',
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    description: 'Balanced performance and speed',
    provider: 'anthropic',
  },
  {
    id: 'claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    description: 'Enhanced reasoning capabilities',
    provider: 'anthropic',
  },
  {
    id: 'claude-3.5-sonnet-v2',
    name: 'Claude 3.5 Sonnet v2',
    description: 'Improved version with better accuracy',
    provider: 'anthropic',
  },
  {
    id: 'claude-3.5-haiku',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and efficient model',
    provider: 'anthropic',
  },
];

export const modelProviders: Array<ModelProvider> = [
  {
    id: 'openai',
    name: 'ChatGPT',
    models: chatModels.filter((model) => model.provider === 'openai'),
  },
  {
    id: 'google',
    name: 'Gemini',
    models: chatModels.filter((model) => model.provider === 'google'),
  },
  {
    id: 'anthropic',
    name: 'Claude',
    models: chatModels.filter((model) => model.provider === 'anthropic'),
  },
];

// Legacy models for backward compatibility
export const legacyModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
    provider: 'openai',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
    provider: 'openai',
  },
];

// Combined models including legacy ones
export const allChatModels = [...chatModels, ...legacyModels];

// Helper function to check if a model is a reasoning model
export const isReasoningModel = (modelId: string): boolean => {
  const reasoningModels = [
    'chat-model-reasoning', // Legacy reasoning model
    'o1', // OpenAI o1 series (with middleware)
    'o1-mini',
    'o3', // OpenAI o3 series (built-in reasoning)
    'o3-mini',
    'o4-mini', // OpenAI o4 series
  ];
  return reasoningModels.includes(modelId);
};

// Helper function to check if a model uses middleware for reasoning extraction
export const usesReasoningMiddleware = (modelId: string): boolean => {
  const middlewareModels = [
    'chat-model-reasoning', // Legacy reasoning model
    'o1', // o1 series use extractReasoningMiddleware
    'o1-mini',
  ];
  return middlewareModels.includes(modelId);
};

// Helper function to check if a model has built-in reasoning
export const hasBuiltInReasoning = (modelId: string): boolean => {
  const builtInReasoningModels = [
    'o3', // o3 series have native reasoning display
    'o3-mini',
    'o4-mini', // o4 series (assuming similar to o3)
  ];
  return builtInReasoningModels.includes(modelId);
};

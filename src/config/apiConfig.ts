/**
 * Anthropic API configuration
 */
export interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiEndpoint: string;
}

/**
 * Default API configuration values
 */
export const DEFAULT_ANTHROPIC_CONFIG: AnthropicConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.7,
  apiEndpoint: 'https://api.anthropic.com/v1/messages'
};

/**
 * Get Anthropic API configuration
 */
export function getAnthropicConfig(overrides: Partial<AnthropicConfig> = {}): AnthropicConfig {
  return { ...DEFAULT_ANTHROPIC_CONFIG, ...overrides };
}

/**
 * Check if the API configuration is valid
 */
export function isApiConfigValid(config: AnthropicConfig): boolean {
  return !!config.apiKey && !!config.model && !!config.apiEndpoint;
}
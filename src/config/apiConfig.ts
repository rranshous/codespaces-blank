/**
 * Anthropic API configuration
 */
export interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiEndpoint: string;
  proxyEndpoint: string;
  useProxy: boolean;
}

/**
 * Default API configuration values
 */
export const DEFAULT_ANTHROPIC_CONFIG: AnthropicConfig = {
  apiKey: '', // Remove process.env reference to fix browser error
  model: 'claude-3-haiku-20240307',
  maxTokens: 1000,
  temperature: 0.7,
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  proxyEndpoint: 'http://localhost:3000/api/anthropic/messages',
  useProxy: true
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
  // When using proxy, we don't need an API key on the client
  if (config.useProxy) {
    return !!config.model && !!config.proxyEndpoint;
  }
  // When not using proxy (direct calls), we need an API key
  return !!config.apiKey && !!config.model && !!config.apiEndpoint;
}

/**
 * Get the appropriate endpoint to use based on configuration
 */
export function getActiveEndpoint(config: AnthropicConfig): string {
  return config.useProxy ? config.proxyEndpoint : config.apiEndpoint;
}
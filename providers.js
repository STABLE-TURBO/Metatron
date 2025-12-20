import { ask } from './cli.js';

/**
 * Display provider selection menu and get user choice
 * @returns {Promise<number>} Selected provider number (1-4)
 */
export async function selectProvider() {
  console.log('Available AI Providers:');
  console.log('1. Grok (xAI) - Requires API key');
  console.log('2. Ollama - Local models, no API key needed');
  console.log('3. Groq - Fast inference, requires API key');
  console.log('4. Claude (Anthropic) - Requires API key');
  console.log('');

  while (true) {
    const choice = await ask('Select provider (1-4): ');
    const numChoice = parseInt(choice);

    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= 4) {
      return numChoice;
    }

    console.log('❌ Invalid input. Please enter a number between 1 and 4.');
  }
}

/**
 * Get provider configuration based on selection
 * @param {number} provider - Provider number (1-4)
 * @returns {Promise<Object>} Provider configuration object
 */
export async function getProviderConfig(provider) {
  switch (provider) {
    case 1: // Grok
      return {
        apiKey: process.env.GROK_API_KEY || await ask('Enter your Grok API key: '),
        model: 'grok-4',
        endpoint: 'https://api.x.ai/v1/chat/completions',
        format: 'openai'
      };
    case 2: // Ollama
      const ollamaModel = process.env.OLLAMA_MODEL || await ask('Enter Ollama model name (default: llama2): ') || 'llama2';
      return {
        apiKey: null, // Ollama doesn't need API key
        model: ollamaModel,
        endpoint: 'http://localhost:11434/v1/chat/completions',
        format: 'openai'
      };
    case 3: // Groq
      return {
        apiKey: process.env.GROQ_API_KEY || await ask('Enter your Groq API key: '),
        model: 'mixtral-8x7b-32768',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        format: 'openai'
      };
    case 4: // Claude
      return {
        apiKey: process.env.CLAUDE_API_KEY || await ask('Enter your Claude API key: '),
        model: 'claude-3-sonnet-20240229',
        endpoint: 'https://api.anthropic.com/v1/messages',
        format: 'claude'
      };
    default:
      throw new Error('Invalid provider selection');
  }
}

import readline from 'node:readline';

// CLI Interface Setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Display help information and exit
 */
export function showHelp() {
  console.log(`
Metatron - Stepwise Secure Code Generator

USAGE:
  node metatron.js [options]

OPTIONS:
  --help, -h          Show this help message
  --test              Run parser tests
  --session=filename  Load a saved session file

SUPPORTED PROVIDERS:
  1. Grok (xAI) - Requires GROK_API_KEY environment variable
  2. Ollama - Local models, no API key needed (OLLAMA_MODEL env var optional)
  3. Groq - Fast inference, requires GROQ_API_KEY environment variable
  4. Claude (Anthropic) - Requires CLAUDE_API_KEY environment variable

EXAMPLES:
  node metatron.js
  GROK_API_KEY=your_key node metatron.js
  OLLAMA_MODEL=llama2 node metatron.js

DESCRIPTION:
  Generates code step-by-step with mandatory verification gates.
  Each step requires EXPLANATION/CODE/VERIFICATION format from AI.
  `);
}

/**
 * Parse command line arguments and handle flags
 * @returns {Object} Parsed arguments
 */
export function parseArgs() {
  const args = {
    showHelp: false,
    runTests: false,
    sessionFile: null
  };

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    args.showHelp = true;
  }

  if (process.argv.includes('--test')) {
    args.runTests = true;
  }

  const sessionArg = process.argv.find(arg => arg.startsWith('--session='));
  if (sessionArg) {
    args.sessionFile = sessionArg.split('=')[1];
  }

  return args;
}

/**
 * Prompt user for input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} User input
 */
export async function ask(question) {
  return new Promise(resolve => rl.question(question + ' ', resolve));
}

/**
 * Close the readline interface
 */
export function closeInterface() {
  rl.close();
}

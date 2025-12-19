import readline from 'node:readline';
import fetch from 'node-fetch';

// CLI Interface Setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Command-line argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Metatron - Stepwise Secure Code Generator

USAGE:
  node metatron.js [options]

OPTIONS:
  --help, -h    Show this help message
  --test        Run parser tests

SUPPORTED PROVIDERS:
  1. Grok (xAI) - Requires GROK_API_KEY environment variable
  2. Ollama - Local models, no API key needed (OLLAMA_MODEL env var optional)
  3. Groq - Fast inference, requires GROQ_API_KEY environment variable

EXAMPLES:
  node metatron.js
  GROK_API_KEY=your_key node metatron.js
  OLLAMA_MODEL=llama2 node metatron.js

DESCRIPTION:
  Generates code step-by-step with mandatory verification gates.
  Each step requires EXPLANATION/CODE/VERIFICATION format from AI.
  `);
  process.exit(0);
}

if (process.argv.includes('--test')) {
  console.log('Running parser tests...\n');
  try {
    await import('./test.js');
  } catch (e) {
    console.error('Test file not found:', e.message);
  }
  process.exit(0);
}

// User Input Function
async function ask(question) {
  return new Promise(resolve => rl.question(question + ' ', resolve));
}

// Provider Selection
async function selectProvider() {
  console.log('Available AI Providers:');
  console.log('1. Grok (xAI) - Requires API key');
  console.log('2. Ollama - Local models, no API key needed');
  console.log('3. Groq - Fast inference, requires API key');
  console.log('');

  while (true) {
    const choice = await ask('Select provider (1-3): ');
    const numChoice = parseInt(choice);

    if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= 3) {
      return numChoice;
    }

    console.log('❌ Invalid input. Please enter a number between 1 and 3.');
  }
}

// API Configuration
async function getProviderConfig(provider) {
  switch (provider) {
    case 1: // Grok
      return {
        apiKey: process.env.GROK_API_KEY || await ask('Enter your Grok API key: '),
        model: 'grok-4',
        endpoint: 'https://api.x.ai/v1/chat/completions'
      };
    case 2: // Ollama
      const ollamaModel = process.env.OLLAMA_MODEL || await ask('Enter Ollama model name (default: llama2): ') || 'llama2';
      return {
        apiKey: null, // Ollama doesn't need API key
        model: ollamaModel,
        endpoint: 'http://localhost:11434/v1/chat/completions'
      };
    case 3: // Groq
      return {
        apiKey: process.env.GROQ_API_KEY || await ask('Enter your Groq API key: '),
        model: 'mixtral-8x7b-32768',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions'
      };
    default:
      throw new Error('Invalid provider selection');
  }
}

// AI Provider Function
async function callAI(prompt, config) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `You are an extremely rigorous, security-focused coding teacher.
You MUST answer in this exact format and nothing else:

EXPLANATION: <clear English, include definitions and why this step exists, mention pitfalls>
CODE: <only the code for this single step, no extra text>
VERIFICATION: <inline test or assertion + reference (OWASP, MDN, CVE, etc.)>

Never put code in the explanation. Never continue without being asked.` },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}


// Main Application Logic
async function main() {
  console.clear();
  console.log('Metatron – Stepwise Code Generator\n');

  // Select AI provider
  const provider = await selectProvider();
  const config = await getProviderConfig(provider);

  const task = await ask('Describe what you want to build (e.g. "PDF invoice generator from JSON cart"): ');
  console.log('\nStarting step-by-step generation. Press Enter to continue, type "stop" to finish.\n');

  let fullCode = '';
  let context = `Overall task: ${task}\n\n`;
  let step = 1;

  while (true) {
    const prompt = `Current context so far:\n${context}\n\nWhat is the next SINGLE critical logical step for this task?`;
    console.log(`\nStep ${step} – asking AI…\n`);

    const raw = await callAI(prompt, config);
    console.log(raw + '\n');

    const explMatch = raw.match(/EXPLANATION:\s*([\s\S]*?)\nCODE:/i);
    const codeMatch = raw.match(/CODE:\s*([\s\S]*?)\nVERIFICATION:/i);
    const verifMatch = raw.match(/VERIFICATION:\s*([\s\S]*)$/i);

    const explanation = explMatch ? explMatch[1].trim() : '—';
    const code = codeMatch ? codeMatch[1].trim() : '// error';
    const verification = verifMatch ? verifMatch[1].trim() : '—';

    fullCode += code + '\n\n';

    console.log('│ Explanation          │ Code Snippet                  │ Verification                     │');
    console.log('├──────────────────────┼───────────────────────────────┼──────────────────────────────────┤');
    console.log(`│ ${explanation.padEnd(20).slice(0,20)} │ ${code.split('\n')[0].padEnd(29).slice(0,29)} │ ${verification.padEnd(32).slice(0,32)} │\n`);

    const answer = await ask('→ Press Enter for next step, type "stop" to output full code, "quit" to exit: ');
    if (answer.toLowerCase() === 'quit') break;
    if (answer.toLowerCase() === 'stop') {
      console.log('\nFull generated code:\n');
      console.log(fullCode);
      break;
    }
    context += raw + '\n\n';
    step++;
  }

  rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  rl.close();
});

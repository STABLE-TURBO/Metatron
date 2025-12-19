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

// API Configuration
async function getProviderConfig(provider) {
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

// AI Provider Function
async function callAI(prompt, config) {
  const headers = {
    'Content-Type': 'application/json'
  };

  let requestBody;

  if (config.format === 'claude') {
    // Claude uses different headers and request format
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';

    requestBody = {
      model: config.model,
      max_tokens: 4096,
      temperature: 0.2,
      system: `You are an extremely rigorous, security-focused coding teacher.
You MUST answer in this exact format and nothing else:

EXPLANATION: <clear English, include definitions and why this step exists, mention pitfalls>
CODE: <only the code for this single step, no extra text>
VERIFICATION: <inline test or assertion + reference (OWASP, MDN, CVE, etc.)>

Never put code in the explanation. Never continue without being asked.`,
      messages: [
        { role: 'user', content: prompt }
      ]
    };
  } else {
    // OpenAI-compatible format
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    requestBody = {
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
    };
  }

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Extract content based on provider format
  if (config.format === 'claude') {
    return data.content[0].text.trim();
  } else {
    return data.choices[0].message.content.trim();
  }
}


// Session Management
async function saveSession(sessionData) {
  const fs = await import('fs/promises');
  const filename = `metatron_session_${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(sessionData, null, 2));
  console.log(`💾 Session saved to ${filename}`);
  return filename;
}

async function loadSession(filename) {
  const fs = await import('fs/promises');
  const data = await fs.readFile(filename, 'utf8');
  return JSON.parse(data);
}

// Main Application Logic
async function main() {
  console.clear();
  console.log('Metatron – Stepwise Code Generator\n');

  // Check for session file argument
  const sessionFile = process.argv.find(arg => arg.startsWith('--session='));
  let sessionData = null;

  if (sessionFile) {
    const filename = sessionFile.split('=')[1];
    try {
      sessionData = await loadSession(filename);
      console.log(`📂 Loaded session from ${filename}\n`);
    } catch (err) {
      console.error(`❌ Failed to load session: ${err.message}`);
      process.exit(1);
    }
  }

  // Select AI provider (skip if loading session)
  const provider = sessionData ? sessionData.provider : await selectProvider();
  const config = sessionData ? sessionData.config : await getProviderConfig(provider);

  const task = sessionData ? sessionData.task : await ask('Describe what you want to build (e.g. "PDF invoice generator from JSON cart"): ');
  console.log('\nStarting step-by-step generation. Press Enter to continue, type "stop" to finish.\n');

  let fullCode = sessionData ? sessionData.fullCode : '';
  let context = sessionData ? sessionData.context : `Overall task: ${task}\n\n`;
  let step = sessionData ? sessionData.step : 1;

  while (true) {
    const prompt = `Current context so far:\n${context}\n\nWhat is the next SINGLE critical logical step for this task?`;
    console.log(`\nStep ${step} – asking AI…\n`);

    const raw = await callAI(prompt, config);
    console.log(raw + '\n');

    // Regex Parser Implementation
    // Response Parsing
    const explMatch = raw.match(/EXPLANATION:\s*([\s\S]*?)\nCODE:/i);
    const codeMatch = raw.match(/CODE:\s*([\s\S]*?)\nVERIFICATION:/i);
    const verifMatch = raw.match(/VERIFICATION:\s*([\s\S]*)$/i);

    // Data Extraction
    const explanation = explMatch ? explMatch[1].trim() : '—';
    const code = codeMatch ? codeMatch[1].trim() : '// error';
    const verification = verifMatch ? verifMatch[1].trim() : '—';

    fullCode += code + '\n\n';

    console.log('│ Explanation          │ Code Snippet                  │ Verification                     │');
    console.log('├──────────────────────┼───────────────────────────────┼──────────────────────────────────┤');
    console.log(`│ ${explanation.padEnd(20).slice(0,20)} │ ${code.split('\n')[0].padEnd(29).slice(0,29)} │ ${verification.padEnd(32).slice(0,32)} │\n`);

    const answer = await ask('→ Press Enter for next step, "save" to save session, "stop" to output full code, "quit" to exit: ');
    if (answer.toLowerCase() === 'quit') break;
    if (answer.toLowerCase() === 'save') {
      const sessionData = {
        provider,
        config,
        task,
        fullCode,
        context,
        step,
        timestamp: new Date().toISOString()
      };
      await saveSession(sessionData);
      continue; // Continue with next step after saving
    }
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

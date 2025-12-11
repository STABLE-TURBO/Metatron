// metatron.js — Stepwise Secure Code Generator (no extension, no build)
// Run with: node metatron.js
// Uses Grok-4 by default (or change to any OpenAI-compatible API)

import readline from 'node:readline';
import fetch from 'node-fetch';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_KEY = process.env.GROK_API_KEY || await ask('Enter your Grok API key (or any OpenAI-compatible key): ');
const MODEL = 'grok-4'; // or 'claude-3-haiku-20240307', 'gpt-4-turbo', etc.

async function ask(question) {
  return new Promise(resolve => rl.question(question + ' ', resolve));
}

async function grok(prompt) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
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
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function main() {
  console.clear();
  console.log('ArchitectIDE – Stepwise Secure Code Generator\n');
  
  const task = await ask('Describe what you want to build (e.g. "PDF invoice generator from JSON cart"): ');
  console.log('\nStarting step-by-step generation. Press Enter to continue, type "stop" to finish.\n');

  let fullCode = '';
  let context = `Overall task: ${task}\n\n`;
  let step = 1;

  while (true) {
    const prompt = `Current context so far:\n${context}\n\nWhat is the next SINGLE critical logical step for this task?`;
    console.log(`\nStep ${step} – asking AI…\n`);
    
    const raw = await grok(prompt);
    console.log(raw + '\n');

    // Parse the three parts
    const explMatch = raw.match(/EXPLANATION:\s*([\s\S]*?)\nCODE:/i);
    const codeMatch = raw.match(/CODE:\s*([\s\S]*?)\nVERIFICATION:/i);
    const verifMatch = raw.match(/VERIFICATION:\s*([\s\S]*)$/i);

    const explanation = explMatch ? explMatch[1].trim() : '—';
    const code = codeMatch ? codeMatch[1].trim() : '// error';
    const verification = verifMatch ? verifMatch[1].trim() : '—';

    fullCode += code + '\n\n';

    // Show nice table
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
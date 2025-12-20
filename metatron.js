import { parseArgs, showHelp, ask, closeInterface } from './cli.js';
import { selectProvider, getProviderConfig } from './providers.js';
import { callAI } from './ai.js';
import { parseResponse, isVerificationWeak } from './parser.js';
import { displayStepOutput, displayStepDetails, displayParsingFailure, displayWeakVerificationWarning, displayContextWarning, clearScreen } from './display.js';
import { saveSession, loadSession } from './session.js';

// Parse command line arguments
const args = parseArgs();

// Handle help flag
if (args.showHelp) {
  showHelp();
  process.exit(0);
}

// Handle test flag
if (args.runTests) {
  console.log('Running parser tests...\n');
  try {
    await import('./test.js');
  } catch (e) {
    console.error('Test file not found:', e.message);
  }
  process.exit(0);
}

// Load session if specified via command line
let sessionData = null;
if (args.sessionFile) {
  try {
    sessionData = await loadSession(args.sessionFile);
    console.log(`📂 Loaded session from ${args.sessionFile}\n`);
  } catch (err) {
    console.error(`❌ Failed to load session: ${err.message}`);
    process.exit(1);
  }
}

// Main Application Logic
async function main() {
  clearScreen();
  console.log('Metatron – Stepwise Code Generator\n');

  // Select AI provider (skip if loading session)
  const provider = sessionData ? sessionData.provider : await selectProvider();
  const config = sessionData ? sessionData.config : await getProviderConfig(provider);

  const task = sessionData ? sessionData.task : await ask('Describe what you want to build (e.g. "PDF invoice generator from JSON cart"): ');
  console.log('\nStarting step-by-step generation. Press Enter to continue, type "stop" to finish.\n');

  let fullCode = sessionData ? sessionData.fullCode : '';
  let context = sessionData ? sessionData.context : `Overall task: ${task}\n\n`;
  let step = sessionData ? sessionData.step : 1;
  const MAX_TOKENS = 128000; // Grok-4 limit

  while (true) {
    const prompt = `Current context so far:\n${context}\n\nWhat is the next SINGLE critical logical step for this task?`;
    console.log(`\nStep ${step} – asking AI…\n`);

    const raw = await callAI(prompt, config);

    // Parse AI response
    const parsed = parseResponse(raw);

    if (!parsed) {
      displayParsingFailure(raw);
      const retry = await ask('Parsing failed. Try again with new prompt? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        continue; // Retry same step
      } else {
        console.log('Session ended due to parsing failure');
        break;
      }
    }

    const { explanation, code, verification } = parsed;

    // Check for weak verification
    if (isVerificationWeak(verification)) {
      displayWeakVerificationWarning(verification);
      const confirm = await ask('⚠️ Weak verification (no OWASP/CWE/RFC/MDN/CVE). Continue accumulating code? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Step rejected - not accumulating code');
        // Still add to context for continuity
        context += raw + '\n\n';
        step++;
        continue;
      }
    }

    // Accumulate code
    fullCode += code + '\n\n';

    // Display step output
    displayStepOutput(explanation, code, verification);

    // Context monitoring
    const estimatedTokens = context.length / 4;
    if (estimatedTokens > MAX_TOKENS * 0.8) {
      displayContextWarning(estimatedTokens, MAX_TOKENS);
    }

    // User interaction
    let answer = await ask('→ Press Enter for next step, "details" to show full content, "save" to save session, "stop" to output full code, "quit" to exit: ');

    if (answer.toLowerCase() === 'details') {
      displayStepDetails(explanation, code, verification);
      // Re-prompt after showing details
      answer = await ask('→ Press Enter for next step, "save" to save session, "stop" to output full code, "quit" to exit: ');
    }

    if (answer.toLowerCase() === 'quit') break;

    if (answer.toLowerCase() === 'save') {
      const sessionToSave = {
        provider,
        config,
        task,
        fullCode,
        context,
        step,
        timestamp: new Date().toISOString()
      };
      await saveSession(sessionToSave);
      continue; // Continue with next step after saving
    }

    if (answer.toLowerCase() === 'stop') {
      console.log('\nFull generated code:\n');
      console.log(fullCode);
      break;
    }

    // Add response to context for next step
    context += raw + '\n\n';
    step++;
  }

  closeInterface();
}

main().catch(err => {
  console.error('Error:', err.message);
  closeInterface();
});

/**
 * Render step output in a formatted table
 * @param {string} explanation - Explanation text
 * @param {string} code - Code snippet
 * @param {string} verification - Verification text
 */
export function displayStepOutput(explanation, code, verification) {
  // Calculate adaptive column widths
  const explLen = Math.max(12, Math.min(50, explanation.length));
  const codeLen = Math.max(4, Math.min(40, code.split('\n')[0].length));
  const verifLen = Math.max(12, Math.min(50, verification.length));

  const totalWidth = explLen + codeLen + verifLen + 10; // Account for borders and padding

  console.log('┌' + '─'.repeat(totalWidth) + '┐');
  console.log('│ Step Output' + ' '.repeat(totalWidth - 12) + '│');
  console.log('├' + '─'.repeat(totalWidth) + '┤');
  console.log(`│ Explanation: ${explanation.padEnd(explLen)} │ Code: ${code.split('\n')[0].padEnd(codeLen)} │ Verification: ${verification.padEnd(verifLen)} │`);
  console.log('└' + '─'.repeat(totalWidth) + '┘\n');
}

/**
 * Display detailed view of step output
 * @param {string} explanation - Full explanation text
 * @param {string} code - Full code text
 * @param {string} verification - Full verification text
 */
export function displayStepDetails(explanation, code, verification) {
  console.log('\n--- FULL DETAILS ---');
  console.log('EXPLANATION:');
  console.log(explanation);
  console.log('\nCODE:');
  console.log(code);
  console.log('\nVERIFICATION:');
  console.log(verification);
  console.log('--- END DETAILS ---\n');
}

/**
 * Display parsing failure with raw response
 * @param {string} rawResponse - Raw AI response that failed to parse
 */
export function displayParsingFailure(rawResponse) {
  console.error('\x1b[31m❌ PARSING FAILED\x1b[0m');
  console.error('Raw AI Response:');
  console.error('---');
  console.error(rawResponse);
  console.error('---');
}

/**
 * Display weak verification warning
 * @param {string} verification - The weak verification text
 */
export function displayWeakVerificationWarning(verification) {
  console.log('⚠️ Weak verification detected - no credible security references');
  console.log('Verification:', verification);
}

/**
 * Display context usage warning
 * @param {number} estimatedTokens - Estimated token count
 * @param {number} maxTokens - Maximum token limit
 */
export function displayContextWarning(estimatedTokens, maxTokens) {
  const usagePercent = (estimatedTokens / maxTokens) * 100;
  console.log(`\x1b[33m⚠️ Context usage: ~${Math.round(estimatedTokens)} tokens (${Math.round(usagePercent)}%)\x1b[0m`);

  if (estimatedTokens > maxTokens * 0.95) {
    console.log('\x1b[31m🚨 CRITICAL: Near context limit. Export recommended.\x1b[0m');
  }
}

/**
 * Clear the console screen
 */
export function clearScreen() {
  console.clear();
}

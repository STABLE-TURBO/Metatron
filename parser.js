/**
 * Parse AI response into EXPLANATION/CODE/VERIFICATION components
 * @param {string} raw - Raw AI response text
 * @returns {Object|null} Parsed components or null if parsing failed
 */
export function parseResponse(raw) {
  const explMatch = raw.match(/EXPLANATION:\s*([\s\S]*?)\nCODE:/i);
  const codeMatch = raw.match(/CODE:\s*([\s\S]*?)\nVERIFICATION:/i);
  const verifMatch = raw.match(/VERIFICATION:\s*([\s\S]*)$/i);

  if (!explMatch || !codeMatch || !verifMatch) {
    return null; // Parsing failed
  }

  return {
    explanation: explMatch[1].trim(),
    code: codeMatch[1].trim(),
    verification: verifMatch[1].trim()
  };
}

/**
 * Check if a verification is considered weak (lacks credible references)
 * @param {string} verification - Verification text to check
 * @returns {boolean} True if verification is weak
 */
export function isVerificationWeak(verification) {
  const strongRefs = ['OWASP', 'CWE', 'RFC', 'MDN', 'CVE'];
  return !strongRefs.some(ref => verification.toUpperCase().includes(ref.toUpperCase()));
}

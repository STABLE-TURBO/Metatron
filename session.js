/**
 * Save session data to a timestamped JSON file
 * @param {Object} sessionData - Session data to save
 * @returns {Promise<string>} Filename of saved session
 */
export async function saveSession(sessionData) {
  const fs = await import('fs/promises');
  const filename = `metatron_session_${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(sessionData, null, 2));
  console.log(`💾 Session saved to ${filename}`);
  return filename;
}

/**
 * Load session data from a JSON file
 * @param {string} filename - Path to session file
 * @returns {Promise<Object>} Loaded session data
 */
export async function loadSession(filename) {
  const fs = await import('fs/promises');
  const data = await fs.readFile(filename, 'utf8');
  return JSON.parse(data);
}

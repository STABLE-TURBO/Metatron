import fetch from 'node-fetch';

/**
 * Call AI provider with prompt and configuration
 * @param {string} prompt - The prompt to send to AI
 * @param {Object} config - Provider configuration
 * @returns {Promise<string>} AI response text
 */
export async function callAI(prompt, config) {
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

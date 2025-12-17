const apiCall = async (payload) => {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `LLM API error ${res.status}`);
  }
  return res.json();
};

export const generateAssistantChat = async ({ userMessage, context, history = [] }) => {
  const system = {
    role: 'system',
    content: [
      'You are BugScribe Assistant. Respond in plain text only.',
      'Keep replies concise (<=60 words). No markdown. Friendly and direct.'
    ].join(' ')
  };

  const contextBlock = [
    'Context:',
    context || 'No additional context.',
    '',
    `User: ${userMessage}`
  ].join('\n');

  const messages = [system, ...history.slice(-8), { role: 'user', content: contextBlock }];
  const { content } = await apiCall({ messages, jsonMode: false });
  return (content || '').trim();
};

export const generateIssueDraft = async ({ context, details }) => {
  const system = {
    role: 'system',
    content: [
      'You create GitHub issue drafts.',
      'Respond ONLY as a JSON object: {"title":"...","body":"..."}',
      'Body should be Markdown with sections: Summary, Steps to Reproduce, Expected, Actual, Notes.',
      'Keep concise bullet points.'
    ].join(' ')
  };

  const user = {
    role: 'user',
    content: [
      'Prepare an issue draft for the current flow.',
      `Context: ${context || 'none'}`,
      `Details: ${details || 'none'}`
    ].join('\n')
  };

  const { content } = await apiCall({ messages: [system, user], jsonMode: true });
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error('LLM returned non-JSON draft.');
  }
  if (!parsed?.title || !parsed?.body) {
    throw new Error('LLM draft missing title/body.');
  }
  return parsed;
};

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

const payloadImages = (payload) => payload?.images || [];

export const generateAssistantChat = async ({ userMessage, context, history = [], images = [] }) => {
  const system = {
    role: 'system',
    content: [
      'You are BugScribe Assistant. Respond in plain text only.',
      'Keep replies concise (<=60 words). No markdown. Friendly and direct.',
      'If images are provided, reason about the latest image first and describe the UI state seen there. Only reference visuals you actually see.'
    ].join(' ')
  };

  const contextBlock = [
    'Context:',
    context || 'No additional context.',
    '',
    `User: ${userMessage}`
  ].join('\n');

  const messages = [system, ...history.slice(-8), { role: 'user', content: contextBlock }];
  const { content } = await apiCall({ messages, jsonMode: false, images: payloadImages({ images }) });
  return (content || '').trim();
};

export const generateIssueDraft = async ({ context, details, images }) => {
  const system = {
    role: 'system',
    content: [
      'You create GitHub issue drafts.',
      'Respond ONLY as a JSON object: {"title":"...","body":"..."}',
      'Body should be Markdown with sections: Summary, Steps to Reproduce, Expected, Actual, Notes.',
      'Keep concise bullet points.',
      'If images are provided, prioritize the latest image to describe the current UI state and include concise visual observations.'
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

  const { content } = await apiCall({ messages: [system, user], jsonMode: true, images: payloadImages({ images }) });
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

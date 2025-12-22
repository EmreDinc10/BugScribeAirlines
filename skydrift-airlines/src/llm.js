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
      'If the context mentions "Payment date error" or "past date" or "Unable to create booking", always start your response with: "BugScribe Suggestion: Did you check the dates? The selected departure date may be in the past or invalid." Then provide helpful guidance.',
      'IMPORTANT: If the user mentions currency, Turkish Lira, TL, price conversion, or prices showing in TL instead of USD, you MUST explain: "This is intended behavior. Prices are automatically converted to Turkish Lira (TL) based on your location (Turkey/TR). This is a feature, not a bug. The system detects your location and displays prices in your local currency for convenience."',
      'If the context mentions "INTENDED BEHAVIOR" and "currency conversion" or "TL", always clarify this is not a bug but a feature.',
      'If images are provided, reason about the latest image first and describe only what you actually see.',
      'If no images are provided, clearly state that you do not see a screenshot and rely only on text context.'
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
      'If the context mentions "Payment date error" or "past date", include a suggestion in the Notes section: "BugScribe Suggestion: Did you check the dates? The selected departure date may be in the past or invalid."',
      'IMPORTANT: If the context mentions currency conversion, Turkish Lira, TL, or "INTENDED BEHAVIOR" with currency, you MUST add a note in the Notes section: "BugScribe Analysis: This is INTENDED BEHAVIOR, not a bug. Prices are automatically converted to Turkish Lira (TL) based on user location (Turkey/TR). This is a feature for user convenience. The system detects the user\'s location and displays prices in the local currency. Console logs confirm this is intentional: [SkyDrift] INTENDED BEHAVIOR: Prices displayed in Turkish Lira (TL) because user location is Turkey (TR)."',
      'Always include booking details (date, route, passenger info, flight ID) from the Details section in the issue body.',
      'If images are provided, prioritize the latest image to describe the current UI state and include concise visual observations.',
      'If no images are provided, explicitly note that screenshots were not available.'
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





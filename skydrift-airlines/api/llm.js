export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    return;
  }

  let body;
  try {
    body = req.body || JSON.parse(req.body || '{}');
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const { messages, jsonMode = false, model = 'gpt-4o-mini' } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  const cappedMessages = messages.slice(-12);

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: cappedMessages,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({ error: text || upstream.statusText });
      return;
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.status(200).json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message || 'LLM request failed' });
  }
}
